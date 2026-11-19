import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach } from "vitest";

// Every test starts from the seeded mock store, isolated from the developer's
// .pipes-db.json and from other tests.
const file = path.join(os.tmpdir(), `pipes-test-db-${process.pid}.json`);
process.env.PIPES_MOCK_DB_FILE = file;

beforeEach(() => {
  fs.rmSync(file, { force: true });
});
