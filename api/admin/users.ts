import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateAdmin, AuthRequest } from "../../utils/auth";
import { getAllUsers } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticateAdmin(req as AuthRequest, res, async () => {
    try {
      const users = await getAllUsers();

      const formattedUsers = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        balance: u.balance,
        totalSpent: u.total_spent,
        createdAt: u.created_at,
      }));

      res.json(formattedUsers);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });
}
