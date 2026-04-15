import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticate, AuthRequest } from "../../utils/auth";
import { getPurchasesByUserId } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticate(req as AuthRequest, res, async () => {
    try {
      const purchases = await getPurchasesByUserId((req as AuthRequest).user.id);

      const formattedPurchases = purchases.map((p: any) => ({
        id: p.id,
        userId: p.user_id,
        mailId: p.mail_id,
        emailAddress: p.email_address,
        domain: p.domain,
        verificationCode: p.verification_code,
        status: p.status,
        createdAt: p.created_at,
      }));

      res.json(formattedPurchases);
    } catch (error: any) {
      console.error("Purchases error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch purchases" });
    }
  });
}
