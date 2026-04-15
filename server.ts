import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import archiver from "archiver";

dotenv.config();

const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY || "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";
const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SHINE@786";

const DB_FILE = path.join(process.cwd(), "db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return { users: [], purchases: [], adminTransactions: [] };
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
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

  // Admin Middleware
  const authenticateAdmin = (req: any, res: any, next: any) => {
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

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, email, password } = req.body;
    const db = readDB();
    if (db.users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      balance: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeDB(db);
    res.json({ message: "User registered successfully" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find((u: any) => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: "user" }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, balance: user.balance } });
  });

  app.post("/api/auth/admin-login", async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) {
      return res.status(400).json({ error: "Invalid admin password" });
    }
    const token = jwt.sign({ role: "admin" }, JWT_SECRET);
    res.json({ token });
  });

  // User Routes
  app.get("/api/user/profile", authenticate, (req: any, res) => {
    const db = readDB();
    const user = db.users.find((u: any) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, email: user.email, balance: user.balance, totalSpent: user.totalSpent });
  });

  app.get("/api/user/purchases", authenticate, (req: any, res) => {
    const db = readDB();
    const purchases = db.purchases.filter((p: any) => p.userId === req.user.id);
    res.json(purchases);
  });

  // SMSBower Proxy Routes
  app.post("/api/smsbower/buy", authenticate, async (req: any, res) => {
    const { domain } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    
    if (db.users[userIndex].balance < 25) {
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
          maxPrice: ""
        },
        timeout: 15000, // 15s timeout
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
        // Prioritize the format from the user's screenshot
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
        const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
        if (userIndex !== -1) {
          db.users[userIndex].balance -= 25;
          db.users[userIndex].totalSpent += 25;
        }

        const newPurchase = {
          id: Date.now().toString(),
          userId: req.user.id,
          mailId: activationId,
          emailAddress: emailAddress,
          domain,
          verificationCode: null,
          status: "waiting",
          createdAt: new Date().toISOString(),
        };
        db.purchases.push(newPurchase);
        writeDB(db);
        res.json(newPurchase);
      } else {
        const errorMsg = typeof response.data === "string" ? response.data : (response.data.message || response.data.error || "Failed to get activation");
        res.status(400).json({ error: errorMsg });
      }
    } catch (error: any) {
      const apiError = error.response?.data;
      const errorMsg = typeof apiError === "string" ? apiError : (apiError?.error || apiError?.message || error.message);
      console.error("SMSBower buy error:", JSON.stringify(apiError || error.message));
      res.status(400).json({ error: errorMsg });
    }
  });

  app.get("/api/smsbower/check-code", authenticate, async (req: any, res) => {
    const { mailId, purchaseId } = req.query;
    try {
      const db = readDB();
      const purchaseIndex = db.purchases.findIndex((p: any) => p.id === purchaseId);
      
      if (purchaseIndex === -1) {
        return res.status(404).json({ error: "Purchase not found" });
      }

      const purchase = db.purchases[purchaseIndex];

      // Security Check: Ensure purchase belongs to the user
      if (purchase.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden: You do not own this purchase" });
      }

      // Check for 25-minute timeout
      const createdAt = new Date(purchase.createdAt).getTime();
      const now = new Date().getTime();
      const diffMins = (now - createdAt) / (1000 * 60);

      if (diffMins > 25 && purchase.status === "waiting") {
        // Balance was already deducted on purchase. 
        // Timeout means no refund, so we just mark as expired.
        db.purchases[purchaseIndex].status = "expired";
        writeDB(db);
        return res.status(400).json({ error: "Activation expired (25 minutes exceeded). No refund." });
      }

      // If already received, just return it
      if (purchase.status === "received" || purchase.status === "completed") {
        return res.json({ code: purchase.verificationCode });
      }

      const response = await axios.get(`${SMSBOWER_BASE_URL}getCode`, {
        params: {
          api_key: SMSBOWER_API_KEY,
          mailId,
        },
        timeout: 10000, // 10s timeout
        validateStatus: () => true, // Don't throw on 400
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
        // Balance already deducted on purchase. Just update code and status.
        db.purchases[purchaseIndex].verificationCode = code;
        db.purchases[purchaseIndex].status = "received";
        writeDB(db);
        res.json({ code: code });
      } else if (apiError) {
        if (apiError.toLowerCase().includes("cancel")) {
          if (db.purchases[purchaseIndex].status !== "cancelled") {
            db.purchases[purchaseIndex].status = "cancelled";
            writeDB(db);
          }
        }
        res.status(400).json({ error: apiError });
      } else {
        res.json({ code: null });
      }
    } catch (error: any) {
      console.error("Check code error:", error.message);
      res.status(500).json({ error: error.message || "Failed to check code" });
    }
  });

  app.post("/api/smsbower/cancel", authenticate, async (req: any, res) => {
    const { mailId, purchaseId } = req.body;
    try {
      const params: any = {
        api_key: SMSBOWER_API_KEY,
        id: mailId,
        reason: "User cancelled"
      };
      
      // Only add sign if we really need it, but user's example had it empty
      // params.sign = ""; 

      console.log("Cancelling activation:", mailId);
      
      const response = await axios.get(`${SMSBOWER_BASE_URL}requestRefund`, {
        params,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on 401
      });
      
      console.log("Cancel response:", response.data);

      // If it's 401, it might be a signature issue or API key issue
      // But we'll proceed with local cancellation anyway to unblock the user
      if (response.status === 401) {
        console.warn("SMSBower returned 401 on refund request. Proceeding with local cancellation.");
      }
      
      const db = readDB();
      const purchaseIndex = db.purchases.findIndex((p: any) => p.id === purchaseId);
      if (purchaseIndex !== -1) {
        const purchase = db.purchases[purchaseIndex];

        // Security Check: Ensure purchase belongs to the user
        if (purchase.userId !== req.user.id) {
          return res.status(403).json({ error: "Forbidden: You do not own this purchase" });
        }

        // Refund ONLY works on manual cancel button (before timeout/code)
        if (db.purchases[purchaseIndex].status === "waiting") {
          const userIndex = db.users.findIndex((u: any) => u.id === req.user.id);
          if (userIndex !== -1) {
            db.users[userIndex].balance += 25;
            db.users[userIndex].totalSpent -= 25;
          }
        }
        db.purchases[purchaseIndex].status = "cancelled";
        writeDB(db);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Cancel error:", error.message);
      res.status(500).json({ error: "Failed to cancel activation" });
    }
  });

  // Admin Routes
  app.get("/api/admin/users", authenticateAdmin, (req, res) => {
    const db = readDB();
    res.json(db.users.map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      balance: u.balance,
      totalSpent: u.totalSpent,
      createdAt: u.createdAt
    })));
  });

  app.post("/api/admin/add-balance", authenticateAdmin, (req, res) => {
    const { email, amount } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex((u: any) => u.email === email);
    if (userIndex === -1) return res.status(404).json({ error: "User not found" });
    
    db.users[userIndex].balance += Number(amount);
    db.adminTransactions.push({
      id: Date.now().toString(),
      userEmail: email,
      amount: Number(amount),
      createdAt: new Date().toISOString()
    });
    writeDB(db);
    res.json({ message: "Balance added successfully", newBalance: db.users[userIndex].balance });
  });

  app.get("/api/admin/stats", authenticateAdmin, (req, res) => {
    const db = readDB();
    const totalRevenue = db.users.reduce((sum: number, u: any) => sum + (u.totalSpent || 0), 0);
    res.json({
      totalUsers: db.users.length,
      totalRevenue,
      totalPurchases: db.purchases.length
    });
  });

  app.get("/api/admin/purchases", authenticateAdmin, (req, res) => {
    const db = readDB();
    const purchasesWithUsers = db.purchases.map((p: any) => {
      const user = db.users.find((u: any) => u.id === p.userId);
      return {
        ...p,
        userEmail: user ? user.email : "Unknown",
        username: user ? user.username : "Unknown"
      };
    }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(purchasesWithUsers);
  });

  app.get("/api/admin/download-project", authenticateAdmin, (req, res) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    res.attachment("fb-verifier-project.zip");
    
    archive.on("error", (err) => {
      res.status(500).send({ error: err.message });
    });
    
    archive.pipe(res);
    
    // Add files and directories
    archive.glob("**/*", {
      cwd: process.cwd(),
      ignore: [
        "node_modules/**",
        "dist/**",
        ".git/**",
        "*.log",
        ".env"
      ]
    });
    
    archive.finalize();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
