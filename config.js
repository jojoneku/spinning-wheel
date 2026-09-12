// Runtime configuration for the frontend.
// The deploy step overwrites this file with the real API URLs from the SAM
// stack outputs (RestApiUrl, WebSocketUrl). Placeholders here let the pages
// load locally without a backend.
window.APP_CONFIG = {
  REST_API_URL: "REPLACE_WITH_RestApiUrl",
  WEBSOCKET_URL: "REPLACE_WITH_WebSocketUrl",
};
