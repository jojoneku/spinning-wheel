// Unit tests for src/lib.js pure helpers.  Run with:  node --test
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateName,
  requireSession,
  validateSessionId,
  parseBody,
  jsonResponse,
  messages,
  MAX_NAME_LENGTH,
} = require("./lib");

test("validateName trims and accepts a good name", () => {
  const r = validateName("  Alice  ");
  assert.equal(r.ok, true);
  assert.equal(r.name, "Alice");
});

test("validateName rejects empty / whitespace", () => {
  assert.equal(validateName("").ok, false);
  assert.equal(validateName("   ").ok, false);
});

test("validateName rejects too-long names", () => {
  const long = "x".repeat(MAX_NAME_LENGTH + 1);
  const r = validateName(long);
  assert.equal(r.ok, false);
});

test("validateName accepts a name at the max length and rejects one over", () => {
  assert.equal(MAX_NAME_LENGTH, 50);
  const atLimit = "x".repeat(50);
  assert.equal(validateName(atLimit).ok, true);
  const overLimit = "x".repeat(51);
  assert.equal(validateName(overLimit).ok, false);
});

test("validateName rejects non-strings", () => {
  assert.equal(validateName(123).ok, false);
  assert.equal(validateName(null).ok, false);
});

test("requireSession accepts a $connect event carrying ?session=", () => {
  const r = requireSession({ queryStringParameters: { session: "abc" } });
  assert.equal(r.ok, true);
  assert.equal(r.sessionId, "abc");
});

test("requireSession refuses events without a session (ws-connect returns 400)", () => {
  assert.equal(requireSession({}).ok, false);
  assert.equal(requireSession({ queryStringParameters: {} }).ok, false);
  assert.equal(requireSession({ queryStringParameters: { other: "x" } }).ok, false);
});

test("validateSessionId requires a non-empty string", () => {
  assert.equal(validateSessionId("abc").ok, true);
  assert.equal(validateSessionId("").ok, false);
  assert.equal(validateSessionId(undefined).ok, false);
});

test("parseBody parses JSON strings and passes objects through", () => {
  assert.deepEqual(parseBody({ body: '{"a":1}' }), { a: 1 });
  assert.deepEqual(parseBody({ body: { a: 1 } }), { a: 1 });
  assert.deepEqual(parseBody({}), {});
});

test("parseBody returns null on malformed JSON", () => {
  assert.equal(parseBody({ body: "{not json" }), null);
});

test("jsonResponse sets CORS headers and stringifies body", () => {
  const res = jsonResponse(201, { ok: true });
  assert.equal(res.statusCode, 201);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
  assert.equal(res.body, '{"ok":true}');
});

test("jsonResponse honors ALLOWED_ORIGIN env var when set", () => {
  const prev = process.env.ALLOWED_ORIGIN;
  try {
    process.env.ALLOWED_ORIGIN = "https://d3b9hppiarktsx.cloudfront.net";
    const res = jsonResponse(200, { ok: true });
    assert.equal(
      res.headers["Access-Control-Allow-Origin"],
      "https://d3b9hppiarktsx.cloudfront.net"
    );
  } finally {
    if (prev === undefined) delete process.env.ALLOWED_ORIGIN;
    else process.env.ALLOWED_ORIGIN = prev;
  }
});

test("message builders produce the documented shapes", () => {
  assert.deepEqual(messages.sync(["a", "b"]), { type: "sync", names: ["a", "b"] });
  assert.deepEqual(messages.newName("c"), { type: "new_name", name: "c" });
  assert.deepEqual(messages.reset(), { type: "reset" });
  assert.deepEqual(messages.winner("d"), { type: "winner", name: "d" });
});
