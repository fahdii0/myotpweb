import { VercelRequest, VercelResponse } from "@vercel/node";
import { generateToken } from "../utils/auth";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SHINE@786";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Missing password" });
    }

    if (password !== ADMIN_PASSWORD) {
      return res.status(400).json({ error: "Invalid admin password" });
    }

    const token = generateToken({ role: "admin" });

    res.json({ token });
  } catch (error: any) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: error.message || "Failed to login" });
  }
}
