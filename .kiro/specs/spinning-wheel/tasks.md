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
