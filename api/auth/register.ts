import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  createUser,
  getUserByEmail,
} from "../../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("Registration attempt:", req.body);
    await initializeDatabase();

    const { username, email, password } = req.body || {};
    console.log("Registration data:", { username, email, hasPassword: !!password });

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    console.log("Creating user:", userId);

    await createUser(userId, username, email, hashedPassword);
    console.log("User created successfully");

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error: any) {
    console.error("Registration error:", error);
    return res.status(500).json({
      error: `Registration failed: ${error.message}`,
      code: error.code
    });
  }
}import { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/auth";
import { createUser, getUserByEmail } from "../../lib/db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();

    // Create user
    await createUser(userId, username, email, hashedPassword);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Failed to register user" });
  }
}
