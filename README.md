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
| `vendor/qrcode-generator.js` | Vendored MIT QR encoder (Kazuhiko Arase) |
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

## Spec-driven

Built spec-first — see [`.kiro/specs/spinning-wheel/`](.kiro/specs/spinning-wheel/):
`requirements.md` (14 requirements), `design.md` (architecture, flows, data models,
message formats), `tasks.md` (implementation plan).
