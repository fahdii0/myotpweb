import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateAdmin, AuthRequest } from "../../utils/auth";
import { getStats } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticateAdmin(req as AuthRequest, res, async () => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  });
}
