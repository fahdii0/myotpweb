import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  getUserPurchases,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Purchases request headers:", req.headers);
    await initializeDatabase();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const purchases = await getUserPurchases(decoded.userId);
    console.log("Purchases retrieved for user:", decoded.userId, "count:", purchases.length);

    return res.status(200).json({ purchases });
  } catch (error: any) {
    console.error("Purchases error:", error);
    return res.status(500).json({
      error: `Purchases retrieval failed: ${error.message}`,
      code: error.code
    });
  }
}import { VercelRequest, VercelResponse } from "@vercel/node";
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
