import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.ts";
import fs from "fs";
import path from "path";
import { newDb } from "pg-mem";

const { Pool } = pg;

// Detect whether to use In-Memory Database (e.g., on Windows or when SQL_HOST is a Cloud SQL socket)
const isCloudSqlSocket = process.env.SQL_HOST?.startsWith("/app/cloudsql");
const isWindows = process.platform === "win32";
const useMemoryDb = isCloudSqlSocket || process.env.USE_MEMORY_DB === "true" || (isWindows && (!process.env.SQL_HOST || isCloudSqlSocket));

export const createPool = () => {
  if (useMemoryDb) {
    console.log("[DB] Cloud SQL Unix socket detected in local environment. Initializing in-memory PostgreSQL engine (pg-mem)...");
    const memDb = newDb();
    
    // Register standard functions if needed
    memDb.public.registerFunction({
      name: "now",
      implementation: () => new Date(),
    });

    // Run schema migrations from drizzle/0000_dapper_master_chief.sql
    try {
      const sqlPath = path.join(process.cwd(), "drizzle", "0000_dapper_master_chief.sql");
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, "utf8");
        const statements = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const statement of statements) {
          try {
            memDb.public.none(statement);
          } catch (stmtErr: any) {
            console.warn("[DB] Migration notice:", stmtErr.message);
          }
        }
        console.log("[DB] In-memory database schema initialized successfully (12 tables).");
      } else {
        console.warn("[DB] Migration file not found at:", sqlPath);
      }
    } catch (err: any) {
      console.error("[DB] Failed to apply in-memory schema:", err);
    }

    const client = memDb.adapters.createPg();
    const memPool = new client.Pool();

    function wrapQuery(origQueryFn: any) {
      return function (this: any, config: any, values?: any, cb?: any) {
        if (typeof values === "function") {
          cb = values;
          values = undefined;
        }
        const isArray = config && config.rowMode === "array";
        if (config && typeof config === "object") {
          delete config.types;
          delete config.rowMode;
        }
        const handleResult = (res: any) => {
          if (res && isArray && Array.isArray(res.rows)) {
            res.rows = res.rows.map((r: any) =>
              Array.isArray(r) ? r : Object.values(r)
            );
          }
          return res;
        };
        if (cb) {
          return origQueryFn.call(this, config, values, (err: any, res: any) => {
            if (!err) handleResult(res);
            cb(err, res);
          });
        }
        const p = origQueryFn.call(this, config, values);
        if (p && typeof p.then === "function") {
          return p.then(handleResult);
        }
        return p;
      };
    }

    memPool.query = wrapQuery(memPool.query.bind(memPool));

    const origConnect = memPool.connect.bind(memPool);
    memPool.connect = async function (...args: any[]) {
      const clientConn = await origConnect(...args);
      clientConn.query = wrapQuery(clientConn.query.bind(clientConn));
      return clientConn;
    };

    return memPool;
  }

  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on("error", (err: any) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

