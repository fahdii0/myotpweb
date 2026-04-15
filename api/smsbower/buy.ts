import { VercelRequest, VercelResponse } from "@vercel/node";
import axios from "axios";
import { authenticate, AuthRequest } from "../../utils/auth";
import { getUserById, updateUserBalance, createPurchase, updateUserSpent } from "../../../lib/db";

const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY || "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticate(req as AuthRequest, res, async () => {
    try {
      const { domain } = req.body;
      const userId = (req as AuthRequest).user.id;

      if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
      }

      // Check user balance
      const user = await getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.balance < 25) {
        return res.status(400).json({ error: "Insufficient balance (25 PKR required)" });
      }

      try {
        console.log(`Attempting getActivation for domain: ${domain}`);
        const response = await axios.get(`${SMSBOWER_BASE_URL}getActivation`, {
          params: {
            api_key: SMSBOWER_API_KEY,
            service: "fb",
            domain: domain,
            ref: "",
            maxPrice: "",
          },
          timeout: 15000,
        });

        console.log("SMSBower getActivation response raw:", response.data);

        let activationId = null;
        let emailAddress = null;

        // Robust parsing for both JSON and String responses
        if (typeof response.data === "string") {
          if (response.data.includes("ACCESS_ACTIVATION")) {
            const parts = response.data.split(":");
            activationId = parts[1];
            emailAddress = parts[2];
          } else if (response.data.includes(":")) {
            const parts = response.data.split(":");
            activationId = parts[0];
            emailAddress = parts[1];
          }
        } else if (response.data && typeof response.data === "object") {
          if (response.data.status === 1 || response.data.status === "1") {
            activationId = response.data.mailId || response.data.id || response.data.activationId;
            emailAddress = response.data.mail || response.data.email;
          } else if (response.data.id || response.data.activationId || response.data.mailId) {
            activationId = response.data.mailId || response.data.id || response.data.activationId;
            emailAddress = response.data.mail || response.data.email;
          }
        }

        if (activationId && emailAddress) {
          // Deduct balance IMMEDIATELY on purchase
          await updateUserBalance(userId, -25);
          await updateUserSpent(userId, 25);

          const purchaseId = Date.now().toString();
          const newPurchase = await createPurchase(purchaseId, userId, activationId, emailAddress, domain, "waiting");

          return res.json({
            id: newPurchase.id,
            userId: newPurchase.user_id,
            mailId: newPurchase.mail_id,
            emailAddress: newPurchase.email_address,
            domain: newPurchase.domain,
            verificationCode: newPurchase.verification_code,
            status: newPurchase.status,
            createdAt: newPurchase.created_at,
          });
        } else {
          const errorMsg =
            typeof response.data === "string" ? response.data : response.data.message || response.data.error || "Failed to get activation";
          return res.status(400).json({ error: errorMsg });
        }
      } catch (error: any) {
        const apiError = error.response?.data;
        const errorMsg =
          typeof apiError === "string" ? apiError : apiError?.error || apiError?.message || error.message;
        console.error("SMSBower buy error:", JSON.stringify(apiError || error.message));
        return res.status(400).json({ error: errorMsg });
      }
    } catch (error: any) {
      console.error("Buy endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to buy activation" });
    }
  });
}
