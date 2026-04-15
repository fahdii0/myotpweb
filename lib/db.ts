import { Pool, PoolClient } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout for Neon
});

// Initialize database tables
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log("Initializing database tables...");

    // Create users table first
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Users table created/verified");

    // Create purchases table (references users)
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        mail_id VARCHAR(255) NOT NULL,
        email_address VARCHAR(255),
        domain VARCHAR(255),
        verification_code VARCHAR(255),
        status VARCHAR(50) DEFAULT 'waiting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Purchases table created/verified");

    // Create admin_transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_transactions (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Admin transactions table created/verified");

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// User queries
export async function createUser(id: string, username: string, email: string, password: string) {
  const result = await pool.query(
    "INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4) RETURNING *",
    [id, username, email, password]
  );
  return result.rows[0];
}

export async function getUserByEmail(email: string) {
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0];
}

export async function getUserById(id: string) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

export async function getAllUsers() {
  const result = await pool.query("SELECT id, username, email, balance, total_spent, created_at FROM users");
  return result.rows;
}

export async function updateUserBalance(id: string, balanceChange: number) {
  const result = await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
    [balanceChange, id]
  );
  return result.rows[0];
}

export async function updateUserSpent(id: string, spentChange: number) {
  const result = await pool.query(
    "UPDATE users SET total_spent = total_spent + $1 WHERE id = $2 RETURNING total_spent",
    [spentChange, id]
  );
  return result.rows[0];
}

// Purchase queries
export async function createPurchase(
  id: string,
  userId: string,
  mailId: string,
  emailAddress: string,
  domain: string,
  status: string = "waiting"
) {
  const result = await pool.query(
    "INSERT INTO purchases (id, user_id, mail_id, email_address, domain, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [id, userId, mailId, emailAddress, domain, status]
  );
  return result.rows[0];
}

export async function getPurchaseById(id: string) {
  const result = await pool.query("SELECT * FROM purchases WHERE id = $1", [id]);
  return result.rows[0];
}

export async function getPurchasesByUserId(userId: string) {
  const result = await pool.query("SELECT * FROM purchases WHERE user_id = $1 ORDER BY created_at DESC", [userId]);
  return result.rows;
}

export async function getAllPurchases() {
  const result = await pool.query(`
    SELECT p.*, u.email as user_email, u.username FROM purchases p
    LEFT JOIN users u ON p.user_id = u.id
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

export async function updatePurchaseStatus(id: string, status: string) {
  const result = await pool.query("UPDATE purchases SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
  return result.rows[0];
}

export async function updatePurchaseCode(id: string, code: string) {
  const result = await pool.query(
    "UPDATE purchases SET verification_code = $1, status = 'received' WHERE id = $2 RETURNING *",
    [code, id]
  );
  return result.rows[0];
}

// Admin transaction queries
export async function createAdminTransaction(id: string, userEmail: string, amount: number) {
  const result = await pool.query(
    "INSERT INTO admin_transactions (id, user_email, amount) VALUES ($1, $2, $3) RETURNING *",
    [id, userEmail, amount]
  );
  return result.rows[0];
}

// Stats queries
export async function getStats() {
  const usersResult = await pool.query("SELECT COUNT(*) as count FROM users");
  const revenueResult = await pool.query("SELECT SUM(total_spent) as total FROM users");
  const purchasesResult = await pool.query("SELECT COUNT(*) as count FROM purchases");

  return {
    totalUsers: parseInt(usersResult.rows[0].count) || 0,
    totalRevenue: parseInt(revenueResult.rows[0].total) || 0,
    totalPurchases: parseInt(purchasesResult.rows[0].count) || 0,
  };
}

export default pool;
