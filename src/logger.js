// Structured JSON logger for the spinning-wheel Lambda handlers.
// Emits one single-line JSON object per call via console.log so the output is
// searchable/correlatable in CloudWatch Logs Insights.
"use strict";

function createLogger({ requestId, sessionId } = {}) {
  function log(level, action, message, extra = {}) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        requestId,
        sessionId,
        action,
        message,
        ...extra,
      })
    );
  }
  return {
    info: (action, msg, extra) => log("INFO", action, msg, extra),
    warn: (action, msg, extra) => log("WARN", action, msg, extra),
    error: (action, msg, extra) => log("ERROR", action, msg, extra),
  };
}

module.exports = { createLogger };
