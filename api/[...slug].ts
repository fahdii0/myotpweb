import axios from "axios";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  initializeDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  updateUserBalance,
  updateUserSpent,
  createPurchase,
  getPurchaseById,
  getPurchasesByUserId,
  getAllPurchases,
  updatePurchaseStatus,
  updatePurchaseCode,
  createAdminTransaction,
  getStats,
  pool,
} from "../../lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fb-verifier-secret-key-12345";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "SHINE@786";
const SMSBOWER_API_KEY = process.env.SMSBOWER_API_KEY || "yu5BsIwXebcjYInuoaYDGojVW1ayPOFv";
const SMSBOWER_BASE_URL = "https://smsbower.online/api/mail/";

function methodNotAllowed(res: any) {
  res.status(405).json({ error: "Method not allowed" });
}

function jsonError(res: any, status: number, message: string) {
  res.status(status).json({ error: message });
}

function getToken(req: any) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.toString().split(" ")[1];
  return token;
}

function verifyToken(req: any, res: any) {
  const token = getToken(req);
  if (!token) {
    jsonError(res, 401, "Unauthorized");
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    jsonError(res, 401, "Invalid token");
    return null;
  }
}

function requireAuth(req: any, res: any) {
  return verifyToken(req, res);
}

function requireAdmin(req: any, res: any) {
  const decoded = verifyToken(req, res);
  if (!decoded) return null;
  if (decoded.role !== "admin") {
    jsonError(res, 403, "Forbidden");
    return null;
  }
  return decoded;
}

const getRoute = (req: any) => {
  const slug = req.query.slug;
  if (Array.isArray(slug)) {
    return slug.join("/");
  }
  return slug || "";
};

export default async function handler(req: any, res: any) {
  await initializeDatabase();

  const route = getRoute(req);

  // Debug endpoint to check database connection
  if (route === "debug/db") {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return res.json({
        status: "Database connected successfully",
        env: {
          POSTGRES_URL: !!process.env.POSTGRES_URL,
          DATABASE_URL: !!process.env.DATABASE_URL,
          JWT_SECRET: !!process.env.JWT_SECRET
        },
        route: route,
        query: req.query
      });
    } catch (error: any) {
      return res.status(500).json({
        error: "Database connection failed",
        details: error.message,
        env: {
          POSTGRES_URL: !!process.env.POSTGRES_URL,
          DATABASE_URL: !!process.env.DATABASE_URL
        }
      });
    }
  }

  switch (route) {
    case "auth/register": {
      console.log("Registration attempt:", req.body);
      if (req.method !== "POST") return methodNotAllowed(res);
      const { username, email, password } = req.body || {};
      console.log("Registration data:", { username, email, hasPassword: !!password });
      if (!username || !email || !password) {
        return jsonError(res, 400, "Missing required fields");
      }

      try {
        const existingUser = await getUserByEmail(email);
        if (existingUser) {
          return jsonError(res, 400, "User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = Date.now().toString();
        console.log("Creating user:", userId);
        await createUser(userId, username, email, hashedPassword);
        console.log("User created successfully");
        return res.status(201).json({ message: "User registered successfully" });
      } catch (error: any) {
        console.error("Registration error:", error);
        return jsonError(res, 500, `Registration failed: ${error.message}`);
      }
    }

    case "auth/login": {
      console.log("Login attempt:", req.body);
      if (req.method !== "POST") return methodNotAllowed(res);
      const { email, password } = req.body || {};
      console.log("Login data:", { email, hasPassword: !!password });
      if (!email || !password) {
        return jsonError(res, 400, "Missing email or password");
      }

      try {
        const user = await getUserByEmail(email);
        console.log("User found:", !!user);
        if (!user || !(await bcrypt.compare(password, user.password))) {
          return jsonError(res, 400, "Invalid credentials");
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: "user" }, JWT_SECRET);
        console.log("Login successful for user:", user.id);
        return res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            balance: user.balance,
          },
        });
      } catch (error: any) {
        console.error("Login error:", error);
        return jsonError(res, 500, `Login failed: ${error.message}`);
      }
    }

    case "auth/admin-login": {
      if (req.method !== "POST") return methodNotAllowed(res);
      const { password } = req.body || {};
      if (!password) {
        return jsonError(res, 400, "Missing password");
      }
      if (password !== ADMIN_PASSWORD) {
        return jsonError(res, 400, "Invalid admin password");
      }
      const token = jwt.sign({ role: "admin" }, JWT_SECRET);
      return res.json({ token });
    }

    case "user/profile": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAuth(req, res);
      if (!decoded) return;

      const user = await getUserById(decoded.id);
      if (!user) {
        return jsonError(res, 404, "User not found");
      }

      return res.json({
        username: user.username,
        email: user.email,
        balance: user.balance,
        totalSpent: user.total_spent,
      });
    }

    case "user/purchases": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAuth(req, res);
      if (!decoded) return;

      const purchases = await getPurchasesByUserId(decoded.id);
      return res.json(
        purchases.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          mailId: p.mail_id,
          emailAddress: p.email_address,
          domain: p.domain,
          verificationCode: p.verification_code,
          status: p.status,
          createdAt: p.created_at,
        }))
      );
    }

    case "smsbower/buy": {
      if (req.method !== "POST") return methodNotAllowed(res);
      const decoded = requireAuth(req, res);
      if (!decoded) return;

      const { domain } = req.body || {};
      if (!domain) {
        return jsonError(res, 400, "Domain is required");
      }

      const user = await getUserById(decoded.id);
      if (!user) {
        return jsonError(res, 404, "User not found");
      }
      if (user.balance < 25) {
        return jsonError(res, 400, "Insufficient balance (25 PKR required)");
      }

      try {
        const response = await axios.get(`${SMSBOWER_BASE_URL}getActivation`, {
          params: {
            api_key: SMSBOWER_API_KEY,
            service: "fb",
            domain,
            ref: "",
            maxPrice: "",
          },
          timeout: 15000,
        });

        let activationId = null;
        let emailAddress = null;

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

        if (!activationId || !emailAddress) {
          const errorMsg = typeof response.data === "string" ? response.data : response.data.message || response.data.error || "Failed to get activation";
          return jsonError(res, 400, errorMsg);
        }

        await updateUserBalance(decoded.id, -25);
        await updateUserSpent(decoded.id, 25);

        const purchaseId = Date.now().toString();
        const purchase = await createPurchase(purchaseId, decoded.id, activationId, emailAddress, domain, "waiting");

        return res.json({
          id: purchase.id,
          userId: purchase.user_id,
          mailId: purchase.mail_id,
          emailAddress: purchase.email_address,
          domain: purchase.domain,
          verificationCode: purchase.verification_code,
          status: purchase.status,
          createdAt: purchase.created_at,
        });
      } catch (error: any) {
        const apiError = error.response?.data;
        const message = typeof apiError === "string" ? apiError : apiError?.error || apiError?.message || error.message;
        return jsonError(res, 400, message);
      }
    }

    case "smsbower/check-code": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAuth(req, res);
      if (!decoded) return;

      const mailId = Array.isArray(req.query.mailId) ? req.query.mailId[0] : req.query.mailId;
      const purchaseId = Array.isArray(req.query.purchaseId) ? req.query.purchaseId[0] : req.query.purchaseId;

      if (!mailId || !purchaseId) {
        return jsonError(res, 400, "mailId and purchaseId are required");
      }

      const purchase = await getPurchaseById(purchaseId);
      if (!purchase) {
        return jsonError(res, 404, "Purchase not found");
      }
      if (purchase.user_id !== decoded.id) {
        return jsonError(res, 403, "Forbidden: You do not own this purchase");
      }

      const createdAt = new Date(purchase.created_at).getTime();
      const now = Date.now();
      const diffMins = (now - createdAt) / (1000 * 60);
      if (diffMins > 25 && purchase.status === "waiting") {
        await updatePurchaseStatus(purchaseId, "expired");
        return jsonError(res, 400, "Activation expired (25 minutes exceeded). No refund.");
      }

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

      const data = response.data;
      let code = null;
      let apiError = null;

      if (typeof data === "string") {
        if (data.includes("STATUS_OK")) {
          code = data.split(":")[1];
        } else if (data.includes("STATUS_WAIT_CODE") || data.toLowerCase().includes("not been received yet")) {
          // still waiting
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
          // still waiting
        } else if (status === 0 || status === "0") {
          apiError = error || "Unknown API error";
        }
      }

      if (code) {
        await updatePurchaseCode(purchaseId, code);
        return res.json({ code });
      }
      if (apiError) {
        if (apiError.toLowerCase().includes("cancel") && purchase.status !== "cancelled") {
          await updatePurchaseStatus(purchaseId, "cancelled");
        }
        return jsonError(res, 400, apiError);
      }

      return res.json({ code: null });
    }

    case "smsbower/cancel": {
      if (req.method !== "POST") return methodNotAllowed(res);
      const decoded = requireAuth(req, res);
      if (!decoded) return;

      const { mailId, purchaseId } = req.body || {};
      if (!mailId || !purchaseId) {
        return jsonError(res, 400, "mailId and purchaseId are required");
      }

      try {
        await axios.get(`${SMSBOWER_BASE_URL}requestRefund`, {
          params: {
            api_key: SMSBOWER_API_KEY,
            id: mailId,
            reason: "User cancelled",
          },
          timeout: 10000,
          validateStatus: () => true,
        });
      } catch (error: any) {
        console.warn("SMSBower refund request failed:", error.message);
      }

      const purchase = await getPurchaseById(purchaseId);
      if (!purchase) {
        return jsonError(res, 404, "Purchase not found");
      }
      if (purchase.user_id !== decoded.id) {
        return jsonError(res, 403, "Forbidden: You do not own this purchase");
      }
      if (purchase.status === "waiting") {
        await updateUserBalance(decoded.id, 25);
        await updateUserSpent(decoded.id, -25);
      }
      await updatePurchaseStatus(purchaseId, "cancelled");
      return res.json({ success: true });
    }

    case "admin/users": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAdmin(req, res);
      if (!decoded) return;
      const users = await getAllUsers();
      return res.json(
        users.map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          balance: u.balance,
          totalSpent: u.total_spent,
          createdAt: u.created_at,
        }))
      );
    }

    case "admin/add-balance": {
      if (req.method !== "POST") return methodNotAllowed(res);
      const decoded = requireAdmin(req, res);
      if (!decoded) return;
      const { email, amount } = req.body || {};
      if (!email || amount == null) {
        return jsonError(res, 400, "Email and amount are required");
      }
      const user = await getUserByEmail(email);
      if (!user) {
        return jsonError(res, 404, "User not found");
      }
      const numAmount = Number(amount);
      await updateUserBalance(user.id, numAmount);
      await createAdminTransaction(Date.now().toString(), email, numAmount);
      const updatedUser = await getUserByEmail(email);
      return res.json({ message: "Balance added successfully", newBalance: updatedUser.balance });
    }

    case "admin/stats": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAdmin(req, res);
      if (!decoded) return;
      const stats = await getStats();
      return res.json(stats);
    }

    case "admin/purchases": {
      if (req.method !== "GET") return methodNotAllowed(res);
      const decoded = requireAdmin(req, res);
      if (!decoded) return;
      const purchases = await getAllPurchases();
      return res.json(
        purchases.map((p: any) => ({
          id: p.id,
          userId: p.user_id,
          mailId: p.mail_id,
          emailAddress: p.email_address,
          domain: p.domain,
          verificationCode: p.verification_code,
          status: p.status,
          createdAt: p.created_at,
          userEmail: p.user_email,
          username: p.username,
        }))
      );
    }

    default:
      return jsonError(res, 404, "Endpoint not found");
  }
}
