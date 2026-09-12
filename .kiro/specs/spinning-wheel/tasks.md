# Implementation Plan — Spinning Wheel (Real-Time Self-Registration)

## Completed (static phase)

- [x] 1. Create wheel-logic.js with constants and pure functions
  - [x] 1.1 Export getSlotAngle, getWinnerIndex, simulateDeceleration
  - [x] 1.2 Export COLORS, FRICTION, MIN_VELOCITY, MAX_VELOCITY, STOP_THRESHOLD
- [x] 2. Create index.html with canvas wheel and spin button
  - [x] 2.1 Render wheel with hardcoded names
  - [x] 2.2 Wire spin button to animation loop
  - [x] 2.3 Display winner after deceleration

## Real-time self-registration phase

- [ ] 3. Create SAM infrastructure template
  - [ ] 3.1 Define DynamoDB tables (Registrations, Connections)
  - [ ] 3.2 Define Lambda functions (4 handlers)
  - [ ] 3.3 Define REST API with POST/DELETE /register (CORS)
  - [ ] 3.4 Define WebSocket API routes ($connect, $disconnect, $default) + stage
  - [ ] 3.5 Define IAM policies (least privilege)
  - _Requirements: 9, 10, 11, 12, 13_

- [ ] 4. Implement Lambda handlers
  - [ ] 4.1 ws-connect-handler (store connection, send sync)
  - [ ] 4.2 ws-disconnect-handler (remove connection)
  - [ ] 4.3 register-handler (validate, dedupe, store, broadcast new_name)
  - [ ] 4.4 ws-default-handler (sync names, broadcast winner/reset, stale cleanup)
  - _Requirements: 8, 9, 11, 12, 13_

- [ ] 5. Checkpoint — run unit tests
  - Unit-test pure logic (validation, dedupe, message building) + wheel-logic.
  - _Requirements: 5, 8, 9_

- [ ] 6. Create registration page (register.html)
  - Session-scoped form, validation, duplicate rejection, form locking.
  - _Requirements: 7, 8_

- [ ] 7. Update main page frontend
  - [ ] 7.1 Remove hardcoded names
  - [ ] 7.2 Add QR code display (session URL)
  - [ ] 7.3 Add WebSocket client with auto-reconnect + sync
  - [ ] 7.4 Handle empty wheel state (disable SPIN)
  - _Requirements: 6, 7, 12, 13, 14_

- [ ] 8. Checkpoint — verify frontend
  - Validate template (`sam validate --lint`), `sam build`, run tests, load pages.
  - _Requirements: 10.2, 14_

- [ ] 9. Deploy and wire together
  - Deploy SAM stack, inject RestApiUrl/WebSocketUrl into the frontend, upload
    static site (S3 + CloudFront), test QR → register → live update.
  - _Requirements: 6, 9, 10, 11, 12_

- [ ] 10. Final checkpoint — end-to-end test
  - Two devices, one session: register on phone, name appears on wheel, spin,
    winner notified. Confirm session isolation across two sessions.
  - _Requirements: 6, 12, 13_

> Task ordering rationale: the SAM template (Task 3) comes first because the
> Lambda handlers (Task 4) reference table names/env from it; the frontend update
> (Task 7) comes after handlers because it needs the deployed API/WebSocket URLs.
> Checkpoints (5, 8, 10) sit at natural verification points.

## Well-Architected hardening phase

These tasks harden the app across the five Well-Architected pillars and map to
Requirements 15–24. Task numbers follow the workshop's numbering
(11, 23, 24, 27, 29) with the security work grouped under Task 25.

- [ ] 11. Operational Excellence — structured JSON logger
  - [ ] 11.1 Create `src/logger.js` exporting `createLogger({ requestId, sessionId })` that emits single-line JSON `{timestamp, level, requestId, sessionId, action, message, ...extra}` via `console.log`, with `info`/`warn`/`error` methods.
  - [ ] 11.2 Wire the logger into all four handlers (`ws-connect`, `ws-disconnect`, `register`, `ws-default`), constructing it from `event.requestContext.requestId` + resolved `sessionId`, logging start/success/failure.
  - _Requirements: 15_

- [ ] 23. Reliability — broadcast resilience
  - Update the broadcast helper so every `postToConnection` is isolated via `Promise.allSettled`; detect gone connections via `err.name === 'GoneException'` (410 via `statusCode`/`$metadata` as fallback) and delete stale records; log any other error and continue the loop.
  - _Requirements: 12, 21_

- [ ] 24. Reliability — WebSocket health-check ping
  - [ ] 24.1 In the inline presenter WebSocket client in `index.html`, send `{action:"ping"}` every 30s and close+reconnect if no `{type:"pong"}` arrives within 5s.
  - [ ] 24.2 In `ws-default.js`, reply to a `ping` action with `{type:"pong"}` on that connection only.
  - _Requirements: 22_

- [ ] 25. Security hardening
  - [ ] 25.1 Add a SAM `AllowedOrigin` parameter (default `'*'`); thread it into the REST API `Cors.AllowOrigin` and pass it to the `register` handler as `ALLOWED_ORIGIN`; have `jsonResponse()` emit it as the `Access-Control-Allow-Origin` header.
  - [ ] 25.2 Reconcile name length to 50: set `MAX_NAME_LENGTH = 50` in `lib.js`, reject >50 chars (trimmed) with HTTP 400, and set `maxlength="50"` + the client-side guard in `register.html`.
  - [ ] 25.3 Refuse `$connect` without a `sessionId` in `ws-connect.js` (non-2xx, no record, WARN log) and add a unit test.
  - [ ] 25.4 Add explicit `SSESpecification: { SSEEnabled: true }` to both DynamoDB tables.
  - [ ] 25.5 Add an `AWS::WAFv2::WebACL` (`Scope: REGIONAL`, rate-based rule 100 req / 5 min / IP, Block) and an `AWS::WAFv2::WebACLAssociation` to the REST API stage.
  - _Requirements: 16, 17, 18, 19, 20_

- [ ] 27. Performance — bundle QR library locally
  - Serve the QR library from the local vendored file and update `index.html` to reference it instead of an external CDN URL.
  - _Requirements: 7, 23_

- [ ] 29. Cost — allocation tags
  - Add `Project: spinning-wheel` and `Environment: production` tags via `Globals.Function.Tags` (all Lambdas) and on both DynamoDB tables.
  - _Requirements: 24_

- [ ] 30. Deploy — CloudFront cache invalidation
  - Ensure `deploy.sh` (the supported deploy path that writes the real `config.js` from stack outputs) runs `aws cloudfront create-invalidation --paths "/*"` after the S3 sync so presenters get fresh assets and the live-join path works.
  - _Requirements: 6, 12_

> Preserve the literal `'prod'` string in the `WS_ENDPOINT` env vars (not
> `!Ref WebSocketStage`) to avoid the CloudFormation circular dependency (E3004),
> as documented in design.md.
