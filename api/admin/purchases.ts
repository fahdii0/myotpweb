import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateAdmin, AuthRequest } from "../../utils/auth";
import { getAllPurchases } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticateAdmin(req as AuthRequest, res, async () => {
    try {
      const purchases = await getAllPurchases();

      const formattedPurchases = purchases.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        mailId: p.mail_id,
        emailAddress: p.email_address,
        domain: p.domain,
        verificationCode: p.verification_code,
        status: p.status,
        createdAt: p.created_at,
        userEmail: p.user_email,
        username: p.username,
      }));

      res.json(formattedPurchases);
    } catch (error: any) {
      console.error("Get purchases error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch purchases" });
    }
  });
}
