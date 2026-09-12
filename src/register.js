// REST handler: POST /register (add name) and DELETE /register (remove name).
// On successful add, broadcasts new_name to all WebSocket clients in the session.
"use strict";

const aws = require("./aws");
const {
  parseBody,
  validateName,
  validateSessionId,
  jsonResponse,
  messages,
} = require("./lib");

exports.handler = async (event) => {
  const method = event.httpMethod;
  const body = parseBody(event);
  if (body === null) return jsonResponse(400, { error: "invalid JSON" });

  const s = validateSessionId(body.sessionId);
  if (!s.ok) return jsonResponse(400, { error: s.error });
  const sessionId = s.sessionId;

  if (method === "DELETE") {
    const n = validateName(body.name);
    if (!n.ok) return jsonResponse(400, { error: n.error });
    await aws.removeName(sessionId, n.name);
    return jsonResponse(200, { sessionId, name: n.name, deleted: true });
  }

  // POST
  const n = validateName(body.name);
  if (!n.ok) return jsonResponse(400, { error: n.error });

  const result = await aws.addName(sessionId, n.name);
  if (!result.created) {
    return jsonResponse(409, { error: "duplicate name" });
  }

  // Broadcast the new name to everyone in the session.
  try {
    await aws.broadcast(sessionId, messages.newName(n.name));
  } catch (err) {
    console.error("broadcast new_name failed", err);
    // Registration still succeeded; clients will catch up on next sync.
  }

  return jsonResponse(201, { sessionId, name: n.name });
};
