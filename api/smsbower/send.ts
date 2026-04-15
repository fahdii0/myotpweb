import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  createPurchase,
  getUserById,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";
const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY;
const SMSBOWER_EMAIL = process.env.SMSBOWER_EMAIL;

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("SMSBower request:", req.body);
    await initializeDatabase();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const { phoneNumber, message } = req.body || {};
    if (!phoneNumber || !message) {
      return res.status(400).json({ error: "Missing phone number or message" });
    }

    // Verify user exists
    const user = await getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Here you would integrate with SMSBower API
    // For now, we'll simulate the SMS sending
    console.log("Sending SMS to:", phoneNumber, "Message:", message);

    // Create purchase record
    const purchaseId = Date.now().toString();
    await createPurchase(purchaseId, decoded.userId, phoneNumber, message, "pending");

    // Simulate SMS sending success
    // In production, you would call SMSBower API here
    const smsResult = {
      success: true,
      messageId: `sms_${Date.now()}`,
      status: "sent"
    };

    console.log("SMS sent successfully:", smsResult);
    return res.status(200).json({
      success: true,
      messageId: smsResult.messageId,
      status: smsResult.status
    });
  } catch (error: any) {
    console.error("SMSBower error:", error);
    return res.status(500).json({
      error: `SMS sending failed: ${error.message}`,
      code: error.code
    });
  }
}