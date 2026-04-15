import { initializeDatabase } from "../../lib/db";

export default async function handler(req: any, res: any) {
  try {
    console.log("Database debug endpoint called");
    await initializeDatabase();

    return res.status(200).json({
      message: "Database connection successful",
      timestamp: new Date().toISOString(),
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasNeonUrl: !!process.env.NEON_DATABASE_URL,
        nodeEnv: process.env.NODE_ENV
      }
    });
  } catch (error: any) {
    console.error("Database debug error:", error);
    return res.status(500).json({
      error: `Database connection failed: ${error.message}`,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }
}