import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./better-auth-schema";

class DatabaseManager {
  private static instance: DatabaseManager;
  private _db: ReturnType<typeof drizzle> | null = null;
  private _connection: postgres.Sql | null = null;

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  get db() {
    if (!this._db) {
      this.connect();
      if (!this._db) {
        throw new Error("Database connection failed");
      }
    }
    return this._db;
  }

  private connect() {
    if (this._connection) {
      return;
    }

    // Validate DATABASE_URL at connection time
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    registerSignalHandlers();

    const sslMode = process.env.DATABASE_SSL_MODE || "prefer";
    const sslConfig =
      sslMode === "disable"
        ? false
        : ["prefer", "require", "allow", "verify-full"].includes(sslMode)
          ? (sslMode as "prefer" | "require" | "allow" | "verify-full")
          : "prefer";
    this._connection = postgres(process.env.DATABASE_URL!, {
      ssl: sslConfig,
    });

    this._db = drizzle(this._connection, { schema });
  }

  async close() {
    if (this._connection) {
      await this._connection.end();
      this._connection = null;
      this._db = null;
    }
  }
}

// Create singleton instance
const dbManager = DatabaseManager.getInstance();

// Export a getter to preserve lazy initialization
export const getDb = () => dbManager.db;

// Export connection manager for manual cleanup if needed
export const closeDb = () => dbManager.close();

// Export schema for convenience
export * from "./better-auth-schema";

// Setup graceful shutdown
let signalHandlersRegistered = false;

function registerSignalHandlers() {
  if (signalHandlersRegistered) return;
  signalHandlersRegistered = true;

  const handleShutdown = (signal: string) => {
    dbManager
      .close()
      .then(() => {
        console.log(`Database closed gracefully on ${signal}`);
        process.exit(0);
      })
      .catch((err) => {
        console.error("Error closing database connection:", err);
        process.exit(1);
      });
  };

  process.once("SIGINT", () => handleShutdown("SIGINT"));
  process.once("SIGTERM", () => handleShutdown("SIGTERM"));
}

// Only register handlers in production environments
if (process.env.NODE_ENV === "production") {
  registerSignalHandlers();
}
