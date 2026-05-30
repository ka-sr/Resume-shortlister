const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");

const dataDir = path.join(__dirname, "..", "..", "data");
const dataFile = path.join(dataDir, "submissions.json");

let pool = null;

async function initStore() {
  if (process.env.DATABASE_URL) {
    try {
      const { Pool } = require("pg");
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
      });
      await pool.query(`
        create table if not exists screening_runs (
          id text primary key,
          created_at timestamptz not null default now(),
          payload jsonb not null
        )
      `);
      return;
    } catch (error) {
      console.warn(`PostgreSQL disabled: ${error.message}`);
      pool = null;
    }
  }

  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, "[]\n", "utf8");
  }
}

async function saveRun(payload) {
  const id = randomUUID();
  const run = {
    id,
    createdAt: new Date().toISOString(),
    ...payload
  };

  if (pool) {
    await pool.query("insert into screening_runs (id, payload) values ($1, $2)", [id, run]);
    return run;
  }

  const runs = JSON.parse(await fs.readFile(dataFile, "utf8"));
  runs.unshift(run);
  await fs.writeFile(dataFile, `${JSON.stringify(runs.slice(0, 50), null, 2)}\n`, "utf8");
  return run;
}

async function getRuns() {
  if (pool) {
    const result = await pool.query(
      "select payload from screening_runs order by created_at desc limit 25"
    );
    return result.rows.map((row) => row.payload);
  }

  try {
    return JSON.parse(await fs.readFile(dataFile, "utf8"));
  } catch {
    return [];
  }
}

module.exports = { getRuns, initStore, saveRun };
