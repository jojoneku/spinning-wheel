// Shared helpers for the spinning-wheel Lambda handlers.
// Pure/logic helpers are exported for unit testing.

"use strict";

const MAX_NAME_LENGTH = 30;

// --- Pure validation / shaping (unit-testable, no AWS) ---

function validateName(raw) {
  if (typeof raw !== "string") return { ok: false, error: "name must be a string" };
  const name = raw.trim();
  if (name.length === 0) return { ok: false, error: "name is required" };
  if (name.length > MAX_NAME_LENGTH)
    return { ok: false, error: `name must be <= ${MAX_NAME_LENGTH} chars` };
  return { ok: true, name };
}

function validateSessionId(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0)
    return { ok: false, error: "sessionId is required" };
  return { ok: true, sessionId: raw.trim() };
}

function parseBody(event) {
  if (!event || event.body == null) return {};
  if (typeof event.body === "object") return event.body;
  try {
    return JSON.parse(event.body);
  } catch {
    return null; // signal malformed JSON
  }
}

function jsonResponse(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,DELETE,OPTIONS",
    },
    body: JSON.stringify(bodyObj),
  };
}

// Message builders (server -> client)
const messages = {
  sync: (names) => ({ type: "sync", names }),
  newName: (name) => ({ type: "new_name", name }),
  reset: () => ({ type: "reset" }),
  winner: (name) => ({ type: "winner", name }),
};

module.exports = {
  MAX_NAME_LENGTH,
  validateName,
  validateSessionId,
  parseBody,
  jsonResponse,
  messages,
};
