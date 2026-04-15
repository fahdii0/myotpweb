import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  getUserByEmail,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@myotpweb.com";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Admin login attempt:", req.body);
    await initializeDatabase();

    const { email, password } = req.body || {};
    console.log("Admin login data:", { email, hasPassword: !!password });

    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (email !== ADMIN_EMAIL) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, isAdmin: true },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log("Admin login successful for user:", user.id);
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isAdmin: true
      }
    });
  } catch (error: any) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      error: `Admin login failed: ${error.message}`,
      code: error.code
    });
  }
}import { VercelRequest, VercelResponse } from "@vercel/node";
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
