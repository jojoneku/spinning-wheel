# Design — Spinning Wheel (Real-Time Self-Registration)

## Overview

A presenter opens the wheel page, which generates a unique `sessionId`, shows a
QR code linking to a session-scoped registration page, and opens a WebSocket.
Participants scan the QR, register their names over a REST API, and every open
WebSocket in that session receives the new name in real time. When the presenter
spins and the wheel stops, a `winner` message is broadcast so the winner is
notified on their phone.

Frontend stays vanilla (HTML/CSS/JS). Backend is serverless AWS defined in SAM.

## Architecture

```
                         ┌─────────────────────────────┐
   Presenter screen      │  index.html (wheel)         │
   (big display)         │  - QR code (session URL)    │
                         │  - canvas wheel + SPIN      │
                         │  - WebSocket client         │
                         └───────┬──────────┬──────────┘
                                 │ WS        │ (static hosting: S3+CloudFront)
                                 │           │
   Participant phone      ┌──────▼───────┐   │
   scans QR ─────────────▶│ register.html│   │ REST POST/DELETE /register
                          │ (name form)  ├───┼──────────────┐
                          │ WebSocket    │   │              │
                          └──────┬───────┘   │              │
                                 │ WS         │              │
                    ┌────────────▼────────────▼──────┐  ┌────▼─────────────┐
                    │  API Gateway                    │  │ API Gateway REST │
                    │  WebSocket API                  │  │  /register       │
                    │  $connect $disconnect $default  │  └────┬─────────────┘
                    └───┬─────────┬─────────┬─────────┘       │
                        │         │         │                 │
              ┌─────────▼──┐ ┌────▼──────┐ ┌▼────────────┐ ┌──▼───────────┐
              │ws-connect  │ │ws-disc.   │ │ws-default   │ │register      │
              │handler     │ │handler    │ │handler      │ │handler       │
              └────┬───────┘ └────┬──────┘ └────┬────────┘ └──┬───────────┘
                   │              │             │             │
        ┌──────────▼──────────────▼─────────────▼─────────────▼──────────┐
        │ DynamoDB                                                         │
        │  Connections (sessionId, connectionId)                          │
        │  Registrations (sessionId, name)                                │
        └─────────────────────────────────────────────────────────────────┘
```

## Components

- **index.html** — presenter wheel. Generates/reads `sessionId`, draws a QR code
  for `register.html?session=<id>`, opens a WebSocket (`?session=<id>`), renders
  the wheel from live names, sends `winner` on stop, `reset` on clear.
- **register.html** — participant form. Reads `sessionId` from URL, POSTs the
  name, locks on success.
- **wheel-logic.js** — unchanged pure module (`getSlotAngle`, `getWinnerIndex`,
  `simulateDeceleration`, constants).
- **4 Lambda handlers** — `ws-connect`, `ws-disconnect`, `register`, `ws-default`.

## Request-flow diagrams

### Registration flow
```
phone → POST /register {sessionId, name}
      → register-handler:
          validate name (non-empty, <=30, trim)
          query Registrations for (sessionId) → reject if dup (409)
          put {sessionId, name} in Registrations
          scan Connections for sessionId
          for each connId: postToConnection {type:"new_name", name}
             (on 410 → delete stale connection)
          return 201 {sessionId, name}
```

### WebSocket connect flow
```
client → $connect ?session=<id>
       → ws-connect-handler:
           put {sessionId, connectionId} in Connections
       (post-connect) client sends {action:"sync"} OR handler sends sync:
       → ws-default-handler (action "sync"):
           query Registrations(sessionId)
           postToConnection {type:"sync", names:[...]}
```

### Winner notification flow
```
presenter wheel stops → WS send {action:"winner", sessionId, name}
       → ws-default-handler (action "winner"):
           scan Connections(sessionId)
           broadcast {type:"winner", name}  (410 → cleanup)
       → each phone: if name === myName → "You won!" else "Winner: name"
```

## Data models (DynamoDB)

### Connections
| Attribute | Type | Notes |
|-----------|------|-------|
| `sessionId` | S (Partition key) | scopes the session |
| `connectionId` | S (Sort key) | API Gateway WS connection id |

Query pattern: by `sessionId` to broadcast. Delete by `sessionId`+`connectionId`
on disconnect / stale.

### Registrations
| Attribute | Type | Notes |
|-----------|------|-------|
| `sessionId` | S (Partition key) | scopes the session |
| `name` | S (Sort key) | the participant name |
| `nameLower` | S | lowercased, for case-insensitive dup check |
| `createdAt` | N | epoch ms, ordering |

Query pattern: by `sessionId` to list names. Conditional put on
`(sessionId, name)` prevents exact dup; a query on `nameLower` guards
case-insensitive dups.

## WebSocket message formats

Server → client:
```json
{ "type": "sync",     "names": ["Alice","Bob"] }
{ "type": "new_name", "name": "Charlie" }
{ "type": "reset" }
{ "type": "winner",   "name": "Alice" }
```
Client → server:
```json
{ "action": "sync" }
{ "action": "winner", "sessionId": "abc", "name": "Alice" }
{ "action": "reset",  "sessionId": "abc" }
```

## REST API schemas

`POST /register`
- Request: `{ "sessionId": "abc", "name": "Alice" }`
- 201: `{ "sessionId": "abc", "name": "Alice" }`
- 400: `{ "error": "invalid name" }`  · 409: `{ "error": "duplicate name" }`

`DELETE /register`
- Request: `{ "sessionId": "abc", "name": "Alice" }`
- 200: `{ "sessionId": "abc", "name": "Alice", "deleted": true }`

## IAM (least privilege)

- `register-handler`: `dynamodb:PutItem/Query/DeleteItem` on Registrations,
  `dynamodb:Query` on Connections, `execute-api:ManageConnections` on the WS API.
- `ws-connect-handler`: `dynamodb:PutItem` on Connections;
  `dynamodb:Query` on Registrations (for immediate sync).
- `ws-disconnect-handler`: `dynamodb:DeleteItem` on Connections.
- `ws-default-handler`: `dynamodb:Query` on Registrations & Connections,
  `dynamodb:DeleteItem` on Connections (stale cleanup),
  `execute-api:ManageConnections` on the WS API.

## SAM template outline

- `Registrations` (AWS::DynamoDB::Table), `Connections` (AWS::DynamoDB::Table),
  both PAY_PER_REQUEST.
- REST API via `AWS::Serverless::Api` (or events on the function) with
  `POST /register`, `DELETE /register`, CORS enabled.
- WebSocket API via `AWS::ApiGatewayV2::Api` (ProtocolType WEBSOCKET) with
  `$connect`, `$disconnect`, `$default` routes + integrations + a stage +
  deployment.
- 4 `AWS::Serverless::Function` (nodejs20.x), env vars for table names + WS
  endpoint, least-privilege policies.
- Outputs: `RestApiUrl`, `WebSocketUrl`.

## Frontend behavior

- `sessionId`: read `?session=` or generate `crypto.randomUUID()` and set it.
- QR: vendored tiny QR encoder (`qrcode.min.js`) draws into a canvas/div.
- WebSocket client: connect with `?session=`, on open send `{action:"sync"}`,
  handle `sync`/`new_name`/`reset`/`winner`, auto-reconnect with exponential
  backoff and re-sync.
- Empty state: if names.length === 0 → placeholder, SPIN disabled.

## Well-Architected Hardening

This section documents the design of the Well-Architected hardening work
(Requirements 15–24). It spans all five pillars.

### Summary of changes

| Pillar | Change | Impact |
|--------|--------|--------|
| Operational Excellence | Structured JSON logging | Diagnosable issues in CloudWatch |
| Security | CORS restricted to CloudFront URL | Prevents cross-origin abuse |
| Security | WAF rate limiting (100 req/5min/IP) | Blocks registration flooding |
| Security | Name length validation (50 chars) | Prevents oversized inputs |
| Security | WebSocket session ID required | No orphaned connections |
| Security | DynamoDB SSE explicit | Encryption at rest confirmed |
| Reliability | Broadcast error resilience | Single failure doesn't abort all |
| Reliability | WebSocket ping health check | Detects stale connections early |
| Performance | QR library bundled locally | No external CDN dependency |
| Cost | Cost allocation tags | Trackable in Cost Explorer |

### Operational Excellence — structured logger (`src/logger.js`)

A small shared logger module lives at `src/logger.js`. Because the backend is
CommonJS, it is a `.js` module (not the workshop's `.mjs`) and is required by
each handler. It exposes a `createLogger` factory that binds the current
`requestId` and `sessionId` for the invocation:

```js
"use strict";
function createLogger({ requestId, sessionId } = {}) {
  function log(level, action, message, extra = {}) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level, requestId, sessionId, action, message, ...extra,
    }));
  }
  return {
    info:  (action, msg, extra) => log("INFO",  action, msg, extra),
    warn:  (action, msg, extra) => log("WARN",  action, msg, extra),
    error: (action, msg, extra) => log("ERROR", action, msg, extra),
  };
}
module.exports = { createLogger };
```

Every emitted line has the shape:

```json
{ "timestamp": "2024-01-01T00:00:00.000Z", "level": "INFO",
  "requestId": "...", "sessionId": "...", "action": "register",
  "message": "name stored", "...extra": "handler-specific fields" }
```

All four handlers (`ws-connect`, `ws-disconnect`, `register`, `ws-default`)
construct a logger at the top of the handler from `event.requestContext`
(`requestId`) and the resolved `sessionId`, then emit `INFO` on the happy path
and `WARN`/`ERROR` on validation failures and exceptions. This yields searchable,
correlatable JSON in CloudWatch Logs Insights.

### Reliability — broadcast resilience

The broadcast path (used by `register` for `new_name` and by `ws-default` for
`winner`/`reset`) posts to every connection in the session with per-connection
error isolation using `Promise.allSettled`. Each `postToConnection` is wrapped so
that:

- **Gone connection** — detected primarily via `err.name === 'GoneException'`
  (AWS SDK v3 throws a named `GoneException`), with
  `err.statusCode === 410` / `err.$metadata?.httpStatusCode === 410` retained as
  a fallback for older shapes. The stale `{sessionId, connectionId}` record is
  deleted from the Connections table.
- **Any other error** — logged via the structured logger and swallowed for that
  connection so the loop continues; one bad connection never aborts the whole
  broadcast.

> Historical note: the earlier implementation detected 410 only via
> `err.statusCode` / `err.$metadata.httpStatusCode`. Because AWS SDK v3 surfaces
> the condition as a named `GoneException`, stale-connection cleanup could
> silently fail. The resilient broadcast fixes this by checking `err.name` first.

### Reliability — WebSocket health-check ping/pong

The presenter WebSocket client is **inline** in `index.html`
(`<script type="module">`); there is no separate `websocket-client.js` file, so
the health-check is added to that inline client:

- On WebSocket `open`, start a 30 second interval that sends
  `{ "action": "ping" }`.
- After each ping, arm a 5 second timeout. If a `{ "type": "pong" }` message is
  not received before the timeout fires, `close()` the socket, which triggers the
  existing auto-reconnect-with-backoff logic (Requirement 14.2). Clear the
  interval and timeout on `close`.
- On receiving `{ "type": "pong" }`, clear the pending pong timeout.

Server side, `ws-default.js` handles the `ping` action by replying to just that
connection with `{ "type": "pong" }` (no broadcast, no table writes).

### Security — CORS restricted to the CloudFront origin

- A SAM template parameter `AllowedOrigin` (default `'*'`) is introduced.
- It is threaded into the REST API's `Cors.AllowOrigin` and passed to the
  `register` handler as an `ALLOWED_ORIGIN` environment variable.
- `jsonResponse()` in `lib.js` (which centralizes CORS headers) reads
  `ALLOWED_ORIGIN` so every success and error response reflects the configured
  origin. In production `AllowedOrigin` is set to the CloudFront distribution URL.

### Security — WAF rate limiting

- An `AWS::WAFv2::WebACL` with `Scope: REGIONAL` and a rate-based rule
  (`Limit: 100`, `AggregateKeyType: IP`, window 5 minutes) with a `Block` action.
- An `AWS::WAFv2::WebACLAssociation` binds the WebACL ARN to the REST API stage
  ARN, so registration flooding from a single IP is blocked.

### Security — name length validation (reconciled to 50)

`MAX_NAME_LENGTH` in `lib.js` changes from 30 to **50** (authoritative). The
validation in the `register` handler rejects names longer than 50 chars after
trimming with HTTP 400. `register.html` sets `maxlength="50"` on the input and
its client-side guard uses 50. See the reconciliation note under Requirement 8.

### Security — WebSocket session ID required

`ws-connect.js` reads `sessionId` from the `$connect` query string. If it is
missing/empty, the handler returns a non-2xx status (refusing the connection),
writes **no** Connections record, and emits a `WARN` structured log. This is
covered by a unit test on the pure validation helper.

### Security — DynamoDB encryption at rest

Both tables declare an explicit `SSESpecification: { SSEEnabled: true }` so
encryption at rest is unambiguous and auditable.

### Cost — allocation tags

`Globals.Function.Tags` applies `Project: spinning-wheel` and
`Environment: production` to all Lambda functions, and each DynamoDB table
carries the same two tags, making spend trackable in Cost Explorer.

### Performance — local QR library

The QR library is served from the vendored local file (`vendor/qrcode-generator.js`,
exposed as `window.qrcode`); `index.html` references the local file instead of a
CDN `<script src>`, removing the external dependency.

### Deploy — CloudFront cache invalidation

`deploy.sh` remains the supported deploy path. After syncing the static site to
S3 it performs a CloudFront cache invalidation (`aws cloudfront
create-invalidation --paths "/*"`) so presenters immediately receive the updated
`index.html`, `config.js`, and vendored assets rather than a stale cached copy.

### Circular-dependency constraint (E3004)

The `WS_ENDPOINT` environment variables in `template.yaml` intentionally use the
**literal string `'prod'`** for the stage segment rather than
`!Ref WebSocketStage`. Referencing the stage there creates a CloudFormation
circular dependency (validation error **E3004**) between the functions, the WS
API, and the stage. Keeping the literal `'prod'` breaks the cycle; the stage name
is fixed to `prod`, so the constructed callback URL is still correct.

### Known live-join bug — root causes and fixes

Symptom: a newly registered participant does **not** appear live on the
presenter's wheel.

1. **Deployed with raw `aws s3 sync` instead of `deploy.sh`.** `config.js` ships
   with `REPLACE_WITH_*` placeholders that `deploy.sh` fills from the CloudFormation
   stack outputs (REST + WebSocket URLs). A bare `aws s3 sync` uploads the
   placeholder `config.js`, so the presenter's WebSocket URL is invalid and the
   socket never opens — no live updates arrive. **Fix / supported path:** always
   deploy via `deploy.sh`, which writes the real `config.js` and invalidates the
   CloudFront cache.
2. **Stale-connection cleanup silently failing.** `postToConnection` previously
   detected a gone connection only via `err.statusCode` / `err.$metadata.httpStatusCode`.
   AWS SDK v3 throws a named `GoneException`, so that check missed it, stale
   connections were never removed, and broadcasts could error out mid-loop and
   skip healthy clients. **Fix:** the resilient broadcast checks
   `err.name === 'GoneException'` first (410 fallback retained) and isolates each
   connection with `Promise.allSettled` so healthy clients always receive updates.

## Non-goals

Auth/accounts, editing others' names, persistence beyond the session, admin UI.
