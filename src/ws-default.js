// $default handler: routes WebSocket messages by "action".
//   { action: "sync" }                         -> send current names to caller
//   { action: "winner", sessionId, name }      -> broadcast winner to session
//   { action: "reset",  sessionId }            -> broadcast reset to session
"use strict";

const aws = require("./aws");
const { messages } = require("./lib");

exports.handler = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const endpoint = process.env.WS_ENDPOINT;

  let msg = {};
  try {
    msg = event.body ? JSON.parse(event.body) : {};
  } catch {
    return { statusCode: 400, body: "invalid JSON" };
  }

  const action = msg.action;
  const qsSession =
    event.queryStringParameters && event.queryStringParameters.session;
  const sessionId = msg.sessionId || qsSession;

  if (!sessionId) return { statusCode: 400, body: "sessionId required" };

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
