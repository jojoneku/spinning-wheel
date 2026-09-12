// Unit tests for src/lib.js pure helpers.  Run with:  node --test
"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  validateName,
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

test("validateName rejects non-strings", () => {
  assert.equal(validateName(123).ok, false);
  assert.equal(validateName(null).ok, false);
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

test("message builders produce the documented shapes", () => {
  assert.deepEqual(messages.sync(["a", "b"]), { type: "sync", names: ["a", "b"] });
  assert.deepEqual(messages.newName("c"), { type: "new_name", name: "c" });
  assert.deepEqual(messages.reset(), { type: "reset" });
  assert.deepEqual(messages.winner("d"), { type: "winner", name: "d" });
});
