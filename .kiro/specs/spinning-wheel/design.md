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

## Non-goals

Auth/accounts, editing others' names, persistence beyond the session, admin UI.
