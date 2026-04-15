import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { authenticate, AuthRequest } from "../../utils/auth";
import { getPurchaseById, updatePurchaseStatus, updatePurchaseCode } from "../../../lib/db";

const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY || "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticate(req as AuthRequest, res, async () => {
    try {
      const { mailId, purchaseId } = req.query;
      const userId = (req as AuthRequest).user.id;

      if (!mailId || !purchaseId) {
        return res.status(400).json({ error: "mailId and purchaseId are required" });
      }

      const purchase = await getPurchaseById(purchaseId as string);

      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      // Security Check: Ensure purchase belongs to the user
      if (purchase.user_id !== userId) {
        return res.status(403).json({ error: "Forbidden: You do not own this purchase" });
      }

      // Check for 25-minute timeout
      const createdAt = new Date(purchase.created_at).getTime();
      const now = new Date().getTime();
      const diffMins = (now - createdAt) / (1000 * 60);

      if (diffMins > 25 && purchase.status === "waiting") {
        await updatePurchaseStatus(purchaseId as string, "expired");
        return res.status(400).json({ error: "Activation expired (25 minutes exceeded). No refund." });
      }

      // If already received, just return it
      if (purchase.status === "received" || purchase.status === "completed") {
        return res.json({ code: purchase.verification_code });
      }

      const response = await axios.get(`${SMSBOWER_BASE_URL}getCode`, {
        params: {
          api_key: SMSBOWER_API_KEY,
          mailId,
        },
        timeout: 10000,
        validateStatus: () => true,
      });

      console.log("SMSBower getCode response raw:", response.data);

      const data = response.data;
      let code = null;
      let apiError = null;

      if (typeof data === "string") {
        if (data.includes("STATUS_OK")) {
          code = data.split(":")[1];
        } else if (data.includes("STATUS_WAIT_CODE") || data.toLowerCase().includes("not been received yet")) {
          // Still waiting
        } else if (data.includes("STATUS_CANCEL") || data.toLowerCase().includes("canceled")) {
          apiError = "Activation is already canceled";
        } else {
          apiError = data;
        }
      } else if (data && typeof data === "object") {
        const status = data.status;
        const error = data.error || data.message || "";

        if ((status === "success" || status === "ok" || status === 1 || status === "1") && data.code) {
          code = data.code;
        } else if (error.toLowerCase().includes("not been received yet") || error.toLowerCase().includes("wait")) {
          // Still waiting
        } else if (status === 0 || status === "0") {
          apiError = error || "Unknown API error";
        }
      }

      if (code) {
        await updatePurchaseCode(purchaseId as string, code);
        return res.json({ code: code });
      } else if (apiError) {
        if (apiError.toLowerCase().includes("cancel")) {
          if (purchase.status !== "cancelled") {
            await updatePurchaseStatus(purchaseId as string, "cancelled");
          }
        }
        return res.status(400).json({ error: apiError });
      } else {
        return res.json({ code: null });
      }
    } catch (error: any) {
      console.error("Check code error:", error.message);
      res.status(500).json({ error: error.message || "Failed to check code" });
    }
  });
}
