import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  getUserById,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Profile request headers:", req.headers);
    await initializeDatabase();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Profile retrieved for user:", user.id);
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error: any) {
    console.error("Profile error:", error);
    return res.status(500).json({
      error: `Profile retrieval failed: ${error.message}`,
      code: error.code
    });
  }
}import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthRequest } from "../../utils/auth";
import { getUserById } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticate(req as AuthRequest, res, async () => {
    try {
      const user = await getUserById((req as AuthRequest).user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        username: user.username,
        email: user.email,
        balance: user.balance,
        totalSpent: user.total_spent,
      });
    } catch (error: any) {
      console.error("Profile error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch profile" });
    }
  });
}
