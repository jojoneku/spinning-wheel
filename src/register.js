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
const { createLogger } = require("./logger");

exports.handler = async (event) => {
  const method = event.httpMethod;
  const requestId = event.requestContext && event.requestContext.requestId;
  const body = parseBody(event);
  if (body === null) {
    createLogger({ requestId }).warn("register", "invalid JSON body");
    return jsonResponse(400, { error: "invalid JSON" });
  }

  const s = validateSessionId(body.sessionId);
  if (!s.ok) {
    createLogger({ requestId }).warn("register", s.error);
    return jsonResponse(400, { error: s.error });
  }
  const sessionId = s.sessionId;
  const logger = createLogger({ requestId, sessionId });

  if (method === "DELETE") {
    const n = validateName(body.name);
    if (!n.ok) {
      logger.warn("register", n.error);
      return jsonResponse(400, { error: n.error });
    }
    await aws.removeName(sessionId, n.name);
    logger.info("register", "name removed", { name: n.name, sessionId });
    return jsonResponse(200, { sessionId, name: n.name, deleted: true });
  }

  // POST
  const n = validateName(body.name);
  if (!n.ok) {
    logger.warn("register", n.error);
    return jsonResponse(400, { error: n.error });
  }

  const result = await aws.addName(sessionId, n.name);
  if (!result.created) {
    logger.warn("register", "duplicate name", { name: n.name, sessionId });
    return jsonResponse(409, { error: "duplicate name" });
  }

  logger.info("register", "name stored", { name: n.name, sessionId });

  // Broadcast the new name to everyone in the session.
  try {
    await aws.broadcast(sessionId, messages.newName(n.name));
  } catch (err) {
    logger.error("register", "broadcast new_name failed", {
      name: err.name,
      errorMessage: err.message,
    });
    // Registration still succeeded; clients will catch up on next sync.
  }

  return jsonResponse(201, { sessionId, name: n.name });
};
