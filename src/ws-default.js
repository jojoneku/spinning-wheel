// $default handler: routes WebSocket messages by "action".
//   { action: "sync" }                         -> send current names to caller
//   { action: "winner", sessionId, name }      -> broadcast winner to session
//   { action: "reset",  sessionId }            -> broadcast reset to session
"use strict";

const aws = require("./aws");
const { messages } = require("./lib");
const { createLogger } = require("./logger");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = process.env.WS_ENDPOINT;
  const requestId = event.requestContext && event.requestContext.requestId;

  let msg = {};
  try {
    msg = event.body ? JSON.parse(event.body) : {};
  } catch {
    createLogger({ requestId }).warn("default", "invalid JSON body", {
      connectionId,
    });
    return { statusCode: 400, body: "invalid JSON" };
  }

  const action = msg.action;
  const qsSession =
    event.queryStringParameters && event.queryStringParameters.session;
  const sessionId = msg.sessionId || qsSession;

  const logger = createLogger({ requestId, sessionId });

  if (!sessionId) {
    logger.warn("default", "missing sessionId", { action, connectionId });
    return { statusCode: 400, body: "sessionId required" };
  }

  logger.info("default", "action received", { action, connectionId });

  if (action === "ping") {
    // Health-check: reply to just this caller with a pong. No broadcast.
    const client = aws.apiClient(endpoint);
    await aws.postToConnection(client, sessionId, connectionId, {
      type: "pong",
    });
    return { statusCode: 200, body: "pong" };
  }

  if (action === "sync") {
    const names = await aws.listNames(sessionId);
    const client = aws.apiClient(endpoint);
    await aws.postToConnection(
      client,
      sessionId,
      connectionId,
      messages.sync(names)
    );
    return { statusCode: 200, body: "synced" };
  }

  if (action === "winner") {
    if (!msg.name) return { statusCode: 400, body: "name required" };
    await aws.broadcast(sessionId, messages.winner(msg.name), endpoint);
    return { statusCode: 200, body: "winner broadcast" };
  }

  if (action === "reset") {
    await aws.broadcast(sessionId, messages.reset(), endpoint);
    return { statusCode: 200, body: "reset broadcast" };
  }

  return { statusCode: 400, body: "unknown action" };
};
