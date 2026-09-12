// $disconnect handler: remove the connection record.
"use strict";

const aws = require("./aws");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const sessionId =
    (event.queryStringParameters && event.queryStringParameters.session) ||
    null;

  if (sessionId) {
    await aws.removeConnection(sessionId, connectionId);
  } else {
    // Fallback: no session on disconnect context — best-effort no-op.
    // (Stale connections are also cleaned up on 410 during broadcast.)
    console.warn("disconnect without sessionId", connectionId);
  }

  return { statusCode: 200, body: "disconnected" };
};
