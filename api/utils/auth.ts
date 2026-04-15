import jwt from "jsonwebtoken";
import { VercelRequest, VercelResponse } from "@vercel/node";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";

export interface AuthRequest extends VercelRequest {
  user?: any;
}

export const authenticate = (req: AuthRequest, res: VercelResponse, next: () => void) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const authenticateAdmin = (req: AuthRequest, res: VercelResponse, next: () => void) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== "admin") return res.status(403).json({ error: "Forbidden" });
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const generateToken = (payload: any) => {
  return jwt.sign(payload, JWT_SECRET);
};
