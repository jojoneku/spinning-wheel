// AWS SDK v3 wrappers (DynamoDB + API Gateway Management API).
// Kept separate from lib.js so pure logic can be tested without AWS.

"use strict";

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const { createLogger } = require("./logger");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const REGISTRATIONS_TABLE = process.env.REGISTRATIONS_TABLE;
const WS_ENDPOINT = process.env.WS_ENDPOINT;

// ---- Registrations ----
async function listNames(sessionId) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: REGISTRATIONS_TABLE,
      KeyConditionExpression: "sessionId = :s",
      ExpressionAttributeValues: { ":s": sessionId },
    })
  );
  const items = (res.Items || []).sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );
  return items.map((i) => i.name);
}

// Returns { created: true } or { created: false, reason: "duplicate" }
async function addName(sessionId, name) {
  const nameLower = name.toLowerCase();
  // Case-insensitive duplicate guard: query existing and compare lowercased.
  const existing = await ddb.send(
    new QueryCommand({
      TableName: REGISTRATIONS_TABLE,
      KeyConditionExpression: "sessionId = :s",
      ExpressionAttributeValues: { ":s": sessionId },
    })
  );
  const dup = (existing.Items || []).some(
    (i) => (i.nameLower || String(i.name).toLowerCase()) === nameLower
  );
  if (dup) return { created: false, reason: "duplicate" };

  await ddb.send(
    new PutCommand({
      TableName: REGISTRATIONS_TABLE,
      Item: { sessionId, name, nameLower, createdAt: Date.now() },
      ConditionExpression: "attribute_not_exists(sessionId) AND attribute_not_exists(#n)",
      ExpressionAttributeNames: { "#n": "name" },
    })
  );
  return { created: true };
}

async function removeName(sessionId, name) {
  await ddb.send(
    new DeleteCommand({
      TableName: REGISTRATIONS_TABLE,
      Key: { sessionId, name },
    })
  );
}

// ---- Connections ----
async function addConnection(sessionId, connectionId) {
  await ddb.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: { sessionId, connectionId },
    })
  );
}

async function removeConnection(sessionId, connectionId) {
  await ddb.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { sessionId, connectionId },
    })
  );
}

async function listConnections(sessionId) {
  const res = await ddb.send(
    new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      KeyConditionExpression: "sessionId = :s",
      ExpressionAttributeValues: { ":s": sessionId },
    })
  );
  return (res.Items || []).map((i) => i.connectionId);
}

// ---- Broadcast ----
function apiClient(endpointOverride) {
  return new ApiGatewayManagementApiClient({
    endpoint: endpointOverride || WS_ENDPOINT,
  });
}

// Post a message to one connection; on a gone connection, clean up the stale
// record. AWS SDK v3 surfaces this as a named `GoneException`; the 410
// statusCode / $metadata checks are retained as a fallback for older shapes.
async function postToConnection(client, sessionId, connectionId, payload) {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(payload)),
      })
    );
    return true;
  } catch (err) {
    if (
      err.name === "GoneException" ||
      err.statusCode === 410 ||
      err.$metadata?.httpStatusCode === 410
    ) {
      await removeConnection(sessionId, connectionId);
      return false;
    }
    // Not a gone connection: rethrow so broadcast's per-connection handling
    // can log it without aborting the rest of the batch.
    throw err;
  }
}

// Broadcast a payload to every connection in a session. Uses Promise.allSettled
// so one failing connection never aborts delivery to the others; non-gone
// errors are logged and swallowed per connection.
async function broadcast(sessionId, payload, endpointOverride) {
  const client = apiClient(endpointOverride);
  const connections = await listConnections(sessionId);
  const logger = createLogger({ sessionId });
  const results = await Promise.allSettled(
    connections.map((c) => postToConnection(client, sessionId, c, payload))
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason || {};
      logger.error("broadcast_error", "post to connection failed", {
        connectionId: connections[i],
        name: err.name,
        errorMessage: err.message,
      });
    }
  });
}

module.exports = {
  listNames,
  addName,
  removeName,
  addConnection,
  removeConnection,
  listConnections,
  apiClient,
  postToConnection,
  broadcast,
};
