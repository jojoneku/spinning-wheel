// $connect handler: store the connection and immediately send a sync of names.
"use strict";

const aws = require("./aws");
const { messages, requireSession } = require("./lib");
const { createLogger } = require("./logger");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const session = requireSession(event);
  const sessionId = session.ok ? session.sessionId : undefined;
  const requestId = event.requestContext && event.requestContext.requestId;
  const logger = createLogger({ requestId, sessionId });

  if (!session.ok) {
    // Refuse connections without a session so we never store orphaned records.
    logger.warn("connect_no_session", "missing sessionId, refusing connection", {
      connectionId,
    });
    return { statusCode: 400, body: "sessionId required" };
  }

  await aws.addConnection(sessionId, connectionId);
  logger.info("connect", "connection stored", { connectionId, sessionId });

  // Send the current names to just this new connection.
  try {
    const endpoint = process.env.WS_ENDPOINT;
    if (endpoint) {
      const names = await aws.listNames(sessionId);
      const client = aws.apiClient(endpoint);
      await aws.postToConnection(
        client,
        sessionId,
        connectionId,
        messages.sync(names)
      );
    }
  } catch (err) {
    // Non-fatal: client can also request sync via $default.
    logger.error("connect", "initial sync failed", {
      connectionId,
      name: err.name,
      errorMessage: err.message,
    });
  }

  return { statusCode: 200, body: "connected" };
};
