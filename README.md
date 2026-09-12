# Spinning Wheel Workshop

A real-time, multi-participant spinning-wheel picker. A presenter shows the wheel
on a big screen; participants scan a QR code, register their names on their
phones, and see the wheel update **live**. When the wheel stops, the winner is
notified on their phone. Frontend is plain HTML/CSS/vanilla JS; the backend is
serverless AWS (API Gateway REST + WebSocket, Lambda, DynamoDB) defined in SAM.

## Architecture

```
Phone (register.html) --POST /register--> REST API --> register Lambda --> DynamoDB
                                                             |
Presenter (index.html) <==WebSocket==> WebSocket API <-------+ (broadcast new_name/winner)
```

- **DynamoDB**: `Registrations` (sessionId, name) and `Connections` (sessionId, connectionId)
- **Lambda**: `ws-connect`, `ws-disconnect`, `register`, `ws-default`
- **Session isolation**: every presenter gets a unique `?session=<id>`; all
  queries/broadcasts are scoped to it.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Presenter wheel: QR code, live WebSocket wheel, SPIN, winner broadcast |
| `register.html` | Participant form (session-scoped, validation, duplicate rejection, locks on success) |
| `wheel-logic.js` | Pure functions/constants (`getSlotAngle`, `getWinnerIndex`, `simulateDeceleration`, ...) |
| `config.js` | Runtime API URLs — overwritten at deploy time with SAM outputs |
| `vendor/qrcode.min.js` | Vendored MIT QR encoder (Kazuhiko Arase), loaded locally — no external CDN |
| `template.yaml` | SAM infrastructure (tables, 4 Lambdas, REST + WebSocket APIs, least-privilege IAM) |
| `src/` | Lambda handlers + shared lib + AWS SDK wrappers + tests |

## Run the tests

```bash
node --test          # frontend logic
cd src && node --test # backend helpers   (or: node --test from repo root runs both)
```

## Validate & build the infrastructure

```bash
sam validate --lint
sam build
```

## Deploy

See `deploy.sh` (or paste it into AWS CloudShell). It:
1. `sam build && sam deploy` the backend
2. reads `RestApiUrl` / `WebSocketUrl` from the stack outputs
3. writes them into `config.js`
4. uploads the static site (S3 + CloudFront)
5. re-deploys to pin the REST API CORS origin to the CloudFront URL (see below)
6. invalidates the CloudFront cache so the new files are served immediately

### CORS origin

The `AllowedOrigin` template parameter defaults to `"*"` (dev convenience), so a
plain `sam deploy` leaves the REST API open. `deploy.sh` closes this: on a fresh
run the CloudFront domain isn't known until the distribution is created, so the
script does a second lightweight `sam deploy --parameter-overrides
AllowedOrigin="https://<cloudfront-domain>"` once `$DIST_DOM` is available,
pinning the REST API to that origin. If you already know the origin (or use a
custom domain), export it up front to pin it on the first deploy and skip the
re-deploy:

```bash
export ALLOWED_ORIGIN=https://d3b9hppiarktsx.cloudfront.net
```

> **Deploy via `deploy.sh` only.** The script writes the real API URLs into
> `config.js` from the stack outputs. A raw `aws s3 sync` leaves the
> `REPLACE_WITH_*` placeholders in `config.js`, so the presenter never opens its
> WebSocket and live-join updates never appear on the wheel.

### Cache invalidation

CloudFront caches the static site at its edge locations, so re-uploading files
to S3 is not enough — stale objects keep being served until the cache is
invalidated. `deploy.sh` now does this automatically after each upload:

```bash
aws cloudfront create-invalidation --distribution-id <id> --paths '/*'
```

When re-deploying against an existing distribution, export its id first so the
script invalidates that distribution instead of creating a new one:

```bash
export CF_DIST_ID=E2O3P9WDZ3L5ZG   # (or SW_DIST=...)
```

**Current environment:** distribution id `E2O3P9WDZ3L5ZG`,
domain `d3b9hppiarktsx.cloudfront.net`, region `ap-southeast-2`.

## Spec-driven

Built spec-first — see [`.kiro/specs/spinning-wheel/`](.kiro/specs/spinning-wheel/):
`requirements.md` (14 requirements), `design.md` (architecture, flows, data models,
message formats), `tasks.md` (implementation plan).
