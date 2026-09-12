# Requirements — Spinning Wheel Winner Picker (Real-Time Self-Registration)

## Introduction

A single-page spinning-wheel picker that a presenter displays on a big screen.
Instead of hardcoded names, participants **self-register from their phones** by
scanning a QR code shown on the wheel page. Registered names appear on the wheel
**in real time** over WebSockets. When the presenter spins and a winner is
chosen, the winner is **notified on their own phone**. Each presenter gets an
**isolated session** so concurrent games don't mix participants.

Built with plain HTML, CSS, and vanilla JavaScript on the frontend, and a
serverless backend on AWS: **API Gateway (REST + WebSocket) + Lambda +
DynamoDB**, defined as infrastructure-as-code with **AWS SAM**. Pure spin logic
remains in a dependency-free, unit-tested ES module.

---

## Original Requirements (retained)

### Requirement 1 — Wheel rendering
1. WHEN the wheel is drawn THEN the system SHALL divide it into N equal slots via `getSlotAngle(N)`.
2. WHEN rendered THEN the system SHALL label each slot with a participant name.
3. WHEN colored THEN the system SHALL cycle a 3-color palette so adjacent slots differ.
4. WHEN labeled THEN names SHALL be legible within their slots.

### Requirement 2 — Spin control
1. WHEN the page loads THEN the system SHALL show a SPIN button.
2. WHEN SPIN is pressed AND at least one name is registered THEN the wheel SHALL start at a randomized velocity.
3. WHEN a spin is in progress THEN overlapping spins SHALL be prevented.

### Requirement 3 — Friction deceleration
1. WHEN spinning THEN velocity SHALL decay each frame by FRICTION.
2. WHEN velocity < STOP_THRESHOLD THEN the wheel SHALL stop.
3. WHEN animating THEN requestAnimationFrame SHALL be used.

### Requirement 4 — Winner selection via arrow
1. WHEN displayed THEN a fixed arrow SHALL sit at 12 o'clock.
2. WHEN stopped THEN the winning slot SHALL be computed via `getWinnerIndex(rotation, N)`.
3. WHEN determined THEN the winning name SHALL be displayed on the wheel screen.

### Requirement 5 — Lean, testable logic
1. Pure functions/constants SHALL live in `wheel-logic.js`.
2. The site SHALL run without a build step (HTML/CSS/vanilla JS).
3. No third-party frontend frameworks SHALL be used.

---

## New Requirements — Real-Time Self-Registration

### Requirement 6 — Session isolation
**User Story:** As a presenter, I want my own isolated game session, so that my
participants don't mix with another presenter's.

#### Acceptance Criteria
1. WHEN the wheel page loads without a session ID THEN the system SHALL generate a unique `sessionId` and place it in the URL (e.g. `?session=<id>`).
2. WHEN any registration, connection, or query occurs THEN the system SHALL scope it to a single `sessionId`.
3. WHEN two sessions run concurrently THEN names, connections, and winners of one SHALL NOT be visible to the other.
4. WHEN the QR code is generated THEN it SHALL encode the registration URL for that specific `sessionId`.

### Requirement 7 — QR code display
**User Story:** As a participant, I want to scan a QR code to join, so that I can
register without typing a URL.

#### Acceptance Criteria
1. WHEN the wheel page loads THEN the system SHALL render a scannable QR code.
2. WHEN the QR code is encoded THEN it SHALL contain the absolute registration URL including the `sessionId` (e.g. `https://<host>/register.html?session=<id>`).
3. WHEN rendered THEN the QR code SHALL be at least 200×200 px and remain legible on a projector.
4. WHEN generated THEN the QR code SHALL be produced client-side without a paid/third-party runtime dependency (self-contained encoder or vendored library).

### Requirement 8 — Registration page
**User Story:** As a participant, I want a simple form to enter my name, so that
I appear on the wheel.

#### Acceptance Criteria
1. WHEN `register.html?session=<id>` loads THEN the system SHALL show a name input and a submit button.
2. WHEN a name is submitted THEN the system SHALL validate it is non-empty and within a max length after trimming.

> **Name-length reconciliation (see Requirement 18):** This criterion originally
> specified a 1–30 char range and the code used `MAX_NAME_LENGTH = 30`. The
> Well-Architected hardening standardizes the maximum on **50 characters**, which
> is now authoritative. Read every reference to a 30-char limit in these original
> requirements as **50 chars** (1–50 chars after trimming). `register.html` input
> `maxlength` and its client-side guard follow the same 50-char limit.
3. WHEN a duplicate name (case-insensitive) already exists in that session THEN the system SHALL reject it with a clear message.
4. WHEN registration succeeds THEN the form SHALL lock (disable input/button) and show a confirmation.
5. WHEN registration fails validation THEN the form SHALL remain editable and show the error.

### Requirement 9 — Registration API (REST)
**User Story:** As the frontend, I want an HTTP API to add/remove names.

#### Acceptance Criteria
1. WHEN `POST /register` is called with `{sessionId, name}` THEN the system SHALL validate, reject duplicates, store the registration, and return the created record.
2. WHEN `DELETE /register` is called with `{sessionId, name}` THEN the system SHALL remove that registration from the session.
3. WHEN a request is malformed THEN the API SHALL return HTTP 400 with an error body.
4. WHEN a duplicate is posted THEN the API SHALL return HTTP 409.
5. WHEN a name is successfully registered THEN the system SHALL broadcast it to all WebSocket clients in that session.

### Requirement 10 — Infrastructure as Code (SAM)
**User Story:** As an operator, I want reproducible infrastructure.

#### Acceptance Criteria
1. WHEN infrastructure is defined THEN ALL backend resources SHALL be declared in a single AWS SAM `template.yaml`.
2. WHEN the template is checked THEN it SHALL pass `sam validate --lint`.
3. WHEN IAM is defined THEN each Lambda SHALL receive least-privilege permissions (only the specific tables/actions it uses, plus `execute-api:ManageConnections` where broadcasting).
4. WHEN deployed THEN the template SHALL output the REST API base URL and the WebSocket URL.

### Requirement 11 — WebSocket connection lifecycle
**User Story:** As a participant/presenter, I want the wheel to update live.

#### Acceptance Criteria
1. WHEN a client connects (`$connect`) with a `sessionId` THEN the system SHALL store `{connectionId, sessionId}` in a Connections table.
2. WHEN a client disconnects (`$disconnect`) THEN the system SHALL remove its connection record.
3. WHEN a client connects THEN the system SHALL send it the current list of registered names for its session (a `sync` message).
4. WHEN a `sessionId` is missing on connect THEN the connection SHALL be refused or ignored for broadcasts.

### Requirement 12 — Real-time broadcast
**User Story:** As everyone watching, I want new names and winners pushed live.

#### Acceptance Criteria
1. WHEN a new name is registered THEN the system SHALL broadcast a `new_name` message to all connections in that session.
2. WHEN a broadcast targets a connection that is gone (410 Gone) THEN the system SHALL delete that stale connection record and continue.
3. WHEN the presenter resets the wheel THEN the system SHALL broadcast a `reset` message clearing all names for that session.

### Requirement 13 — Winner notification
**User Story:** As a winner, I want to be told I won on my phone.

#### Acceptance Criteria
1. WHEN the wheel stops on a winner THEN the presenter's page SHALL send a `winner` action over the WebSocket with `{sessionId, name}`.
2. WHEN the backend receives a `winner` action THEN it SHALL broadcast a `winner` message to all connections in that session.
3. WHEN a participant's client receives a `winner` message matching their own registered name THEN it SHALL clearly indicate "You won!"; other participants SHALL see who won.

### Requirement 14 — Empty & resilient frontend
**User Story:** As a presenter, I want the page to behave gracefully.

#### Acceptance Criteria
1. WHEN no names are registered THEN the wheel SHALL show an empty/placeholder state and SPIN SHALL be disabled.
2. WHEN the WebSocket drops THEN the client SHALL auto-reconnect with backoff and re-sync on reconnect.
3. WHEN names arrive via `new_name`/`sync` THEN the wheel SHALL redraw without a full page reload.

---

## New Requirements — Well-Architected Hardening

These requirements harden the application against the five pillars of the AWS
Well-Architected Framework (Operational Excellence, Security, Reliability,
Performance Efficiency, Cost Optimization). They are additive: the Original
Requirements and Real-Time Self-Registration requirements above still hold, with
the single reconciliation noted under Requirement 8 (name length is now 50).

### Requirement 15 — Operational Excellence: structured JSON logging
**User Story:** As an operator, I want searchable structured logs, so that I can
diagnose issues in CloudWatch without parsing free-form text.

#### Acceptance Criteria
1. WHEN any of the four Lambda handlers (`ws-connect`, `ws-disconnect`, `register`, `ws-default`) handles an event THEN it SHALL emit logs as single-line JSON via `console.log`.
2. WHEN a log line is emitted THEN it SHALL include the fields `timestamp`, `level`, `requestId`, `sessionId`, `action`, and `message`, plus any handler-specific `...extra` fields.
3. WHEN a handler starts, succeeds, or fails THEN it SHALL emit at least one log line at the appropriate level (`INFO`, `WARN`, or `ERROR`).
4. WHEN the logger is constructed THEN it SHALL bind the current `requestId` and `sessionId` so every subsequent line is correlated to that invocation.

### Requirement 16 — Security: CORS restricted to the CloudFront origin
**User Story:** As a security owner, I want the REST API to accept browser calls
only from our own site, so that other origins cannot abuse it.

#### Acceptance Criteria
1. WHEN the SAM template is deployed THEN it SHALL expose an `AllowedOrigin` parameter that defaults to `'*'` and is intended to be set to the CloudFront distribution URL in production.
2. WHEN the REST API responds THEN its CORS `AllowOrigin` SHALL be driven by the `AllowedOrigin` parameter.
3. WHEN the `register` handler returns any response (success or error) THEN its `Access-Control-Allow-Origin` header SHALL reflect the configured origin, supplied via an `ALLOWED_ORIGIN` environment variable.
4. WHEN `AllowedOrigin` is set to a specific origin THEN requests from other origins SHALL NOT receive permissive CORS headers.

### Requirement 17 — Security: WAF rate limiting
**User Story:** As a security owner, I want registration flooding blocked, so
that a single IP cannot overwhelm the API.

#### Acceptance Criteria
1. WHEN the infrastructure is deployed THEN it SHALL include a `AWS::WAFv2::WebACL` with `Scope: REGIONAL` containing a rate-based rule.
2. WHEN the rate-based rule evaluates traffic THEN it SHALL limit to **100 requests per 5 minutes per source IP** and block requests over that limit.
3. WHEN the WebACL is created THEN a `AWS::WAFv2::WebACLAssociation` SHALL attach it to the REST API stage.
4. WHEN an IP exceeds the limit THEN further requests from that IP SHALL be blocked until the window resets.

### Requirement 18 — Security: name length validation (max 50)
**User Story:** As a security owner, I want a bounded name length, so that
oversized inputs cannot be stored or broadcast.

#### Acceptance Criteria
1. WHEN a name is validated THEN the maximum length SHALL be **50 characters** after trimming (`MAX_NAME_LENGTH = 50`), which is authoritative over the earlier 30-char limit.
2. WHEN a submitted name exceeds 50 chars after trimming THEN the API SHALL reject it with HTTP 400.
3. WHEN `register.html` renders THEN its name input SHALL set `maxlength="50"` and its client-side guard SHALL reject names longer than 50 chars.
4. WHEN the reconciliation is applied THEN no requirement in this document SHALL continue to assert a 30-char limit (see the note under Requirement 8).

### Requirement 19 — Security: WebSocket session ID required
**User Story:** As a security owner, I want to reject connections without a
session, so that no orphaned connections accumulate.

#### Acceptance Criteria
1. WHEN a client attempts `$connect` without a `sessionId` query parameter THEN the `ws-connect` handler SHALL refuse the connection (return a non-2xx status) and SHALL NOT store a connection record.
2. WHEN a connection is refused for a missing `sessionId` THEN the handler SHALL emit a `WARN`-level structured log line describing the refusal.
3. WHEN this behavior is implemented THEN it SHALL be covered by a unit test asserting that a missing `sessionId` is rejected.

### Requirement 20 — Security: DynamoDB encryption at rest (explicit SSE)
**User Story:** As a security owner, I want encryption at rest to be explicit,
so that our posture is auditable and unambiguous.

#### Acceptance Criteria
1. WHEN each DynamoDB table (`Registrations`, `Connections`) is defined THEN it SHALL declare an `SSESpecification` with `SSEEnabled: true`.
2. WHEN the template is linted THEN the explicit SSE configuration SHALL be present and valid.

### Requirement 21 — Reliability: broadcast resilience
**User Story:** As a presenter, I want one dead connection to never abort a whole
broadcast, so that live updates always reach the healthy clients.

#### Acceptance Criteria
1. WHEN a broadcast posts to multiple connections THEN each `postToConnection` SHALL be isolated so a failure on one connection does not prevent posting to the others (e.g. via `Promise.allSettled`).
2. WHEN a `postToConnection` fails with a gone connection THEN the stale connection SHALL be detected via `err.name === 'GoneException'` (with `err.statusCode`/`err.$metadata.httpStatusCode === 410` as a fallback) and its record SHALL be deleted.
3. WHEN a `postToConnection` fails with any other error THEN that error SHALL be logged and the broadcast loop SHALL continue with the remaining connections.

### Requirement 22 — Reliability: WebSocket health-check ping
**User Story:** As a presenter, I want stale WebSocket connections detected early,
so that the wheel keeps receiving live updates after network blips.

#### Acceptance Criteria
1. WHEN the presenter WebSocket client is connected THEN it SHALL send a `{ "action": "ping" }` message every **30 seconds**.
2. WHEN the server receives a `ping` action THEN the `ws-default` handler SHALL reply to that connection with `{ "type": "pong" }`.
3. WHEN the client sends a ping AND does not receive a `pong` within **5 seconds** THEN it SHALL close the socket and trigger its reconnect logic.

### Requirement 23 — Performance Efficiency: bundle QR library locally
**User Story:** As a presenter on a locked-down network, I want no external CDN
dependency, so that the QR code always renders.

#### Acceptance Criteria
1. WHEN the QR code is generated THEN the QR library SHALL be served from a local vendored file (no external CDN `<script src>`).
2. WHEN `index.html` loads THEN it SHALL reference the local vendored QR library rather than a CDN URL.

### Requirement 24 — Cost Optimization: cost allocation tags
**User Story:** As a cost owner, I want resources tagged, so that spend is
trackable in Cost Explorer.

#### Acceptance Criteria
1. WHEN Lambda functions are defined THEN they SHALL carry the tags `Project: spinning-wheel` and `Environment: production` (via `Globals.Function.Tags`).
2. WHEN each DynamoDB table (`Registrations`, `Connections`) is defined THEN it SHALL carry the same `Project: spinning-wheel` and `Environment: production` tags.
