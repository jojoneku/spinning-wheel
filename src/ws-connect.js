// $connect handler: store the connection and immediately send a sync of names.
"use strict";

const aws = require("./aws");
const { messages } = require("./lib");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const sessionId =
    event.queryStringParameters && event.queryStringParameters.session;

  if (!sessionId) {
    // Refuse connections without a session.
    return { statusCode: 400, body: "sessionId required" };
  }

  await aws.addConnection(sessionId, connectionId);

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
    console.error("connect sync failed", err);
  }

  return { statusCode: 200, body: "connected" };
};
