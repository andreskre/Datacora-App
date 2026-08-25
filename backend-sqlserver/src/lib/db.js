const sql = require("mssql");

let poolPromise;
let activePool;

function boolEnv(name, fallback) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "si"].includes(value);
}

function sqlConfig() {
  return {
    server: process.env.SQLSERVER_HOST || "127.0.0.1",
    port: Number(process.env.SQLSERVER_PORT || 1433),
    database: process.env.SQLSERVER_DATABASE || "DBDATACORA",
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    options: {
      encrypt: boolEnv("SQLSERVER_ENCRYPT", false),
      trustServerCertificate: boolEnv("SQLSERVER_TRUST_CERT", true)
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };
}

async function pool() {
  if (activePool?.connected) return activePool;
  if (poolPromise) {
    try {
      const db = await poolPromise;
      if (db.connected) return db;
    } catch {
      poolPromise = null;
      activePool = null;
    }
  }

  activePool = new sql.ConnectionPool(sqlConfig());
  activePool.on("error", (error) => {
    console.warn("SQL Server pool error", error.message);
    poolPromise = null;
    activePool = null;
  });
  poolPromise = activePool.connect().catch((error) => {
    poolPromise = null;
    activePool = null;
    throw error;
  });
  return poolPromise;
}

async function transaction(work) {
  const db = await pool();
  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch (rollbackError) {
      console.warn("SQL Server rollback skipped", rollbackError.message);
    }
    throw error;
  }
}

function request(source) {
  return new sql.Request(source);
}

module.exports = { sql, pool, transaction, request };
