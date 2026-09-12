// $disconnect handler: remove the connection record.
"use strict";

const aws = require("./aws");
const { createLogger } = require("./logger");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const sessionId =
    (event.queryStringParameters && event.queryStringParameters.session) ||
    null;
  const requestId = event.requestContext && event.requestContext.requestId;
  const logger = createLogger({ requestId, sessionId });

  if (sessionId) {
    await aws.removeConnection(sessionId, connectionId);
    logger.info("disconnect", "connection removed", { connectionId, sessionId });
  } else {
    // Fallback: no session on disconnect context - best-effort no-op.
    // (Stale connections are also cleaned up on gone during broadcast.)
    logger.warn("disconnect", "disconnect without sessionId", { connectionId });
  }

  return { statusCode: 200, body: "disconnected" };
};
