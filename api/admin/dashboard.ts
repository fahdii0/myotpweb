import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  getAllUsers,
  getAllPurchases,
  getAllAdminTransactions,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Admin dashboard request headers:", req.headers);
    await initializeDatabase();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const [users, purchases, transactions] = await Promise.all([
      getAllUsers(),
      getAllPurchases(),
      getAllAdminTransactions()
    ]);

    console.log("Admin dashboard data retrieved - users:", users.length, "purchases:", purchases.length, "transactions:", transactions.length);

    return res.status(200).json({
      users,
      purchases,
      transactions
    });
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return res.status(500).json({
      error: `Admin dashboard retrieval failed: ${error.message}`,
      code: error.code
    });
  }
}