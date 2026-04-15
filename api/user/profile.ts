import { VercelRequest, VercelResponse } from "@vercel/node";
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
