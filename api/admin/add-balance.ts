import { VercelRequest, VercelResponse } from "@vercel/node";
import { authenticateAdmin, AuthRequest } from "../../utils/auth";
import { getUserByEmail, updateUserBalance, createAdminTransaction } from "../../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  authenticateAdmin(req as AuthRequest, res, async () => {
    try {
      const { email, amount } = req.body;

      if (!email || !amount) {
        return res.status(400).json({ error: "Email and amount are required" });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const numAmount = Number(amount);
      await updateUserBalance(user.id, numAmount);
      await createAdminTransaction(Date.now().toString(), email, numAmount);

      const updatedUser = await getUserByEmail(email);

      res.json({
        message: "Balance added successfully",
        newBalance: updatedUser?.balance,
      });
    } catch (error: any) {
      console.error("Add balance error:", error);
      res.status(500).json({ error: error.message || "Failed to add balance" });
    }
  });
}
