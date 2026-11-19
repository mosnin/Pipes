-- One row per call Pipes made through the gateway. No content, no queries.
CREATE TABLE IF NOT EXISTS memory_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  op TEXT NOT NULL,
  namespace TEXT NOT NULL,
  private INTEGER NOT NULL,
  status INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS memory_calls_namespace ON memory_calls (namespace, at);
