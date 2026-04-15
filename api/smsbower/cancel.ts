import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { authenticate, AuthRequest } from "../../utils/auth";
import { getPurchaseById, updatePurchaseStatus, getUserById, updateUserBalance, updateUserSpent } from "../../../lib/db";

const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY || "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticate(req as AuthRequest, res, async () => {
    try {
      const { mailId, purchaseId } = req.body;
      const userId = (req as AuthRequest).user.id;

      if (!mailId || !purchaseId) {
        return res.status(400).json({ error: "mailId and purchaseId are required" });
      }

      const params: any = {
        api_key: SMSBOWER_API_KEY,
        id: mailId,
        reason: "User cancelled",
      };

      console.log("Cancelling activation:", mailId);

      try {
        const response = await axios.get(`${SMSBOWER_BASE_URL}requestRefund`, {
          params,
          timeout: 10000,
          validateStatus: () => true,
        });

        console.log("Cancel response:", response.data);

        if (response.status === 401) {
          console.warn("SMSBower returned 401 on refund request. Proceeding with local cancellation.");
        }
      } catch (error: any) {
        console.error("SMSBower cancel error:", error.message);
      }

      // Proceed with local cancellation
      const purchase = await getPurchaseById(purchaseId);
      if (!purchase) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      // Security Check: Ensure purchase belongs to the user
      if (purchase.user_id !== userId) {
        return res.status(403).json({ error: "Forbidden: You do not own this purchase" });
      }

      // Refund ONLY works on manual cancel button (before timeout/code)
      if (purchase.status === "waiting") {
        await updateUserBalance(userId, 25);
        await updateUserSpent(userId, -25);
      }

      await updatePurchaseStatus(purchaseId, "cancelled");

      res.json({ success: true });
    } catch (error: any) {
      console.error("Cancel endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to cancel activation" });
    }
  });
}
