import { Router, Request, Response, NextFunction } from "express";
import * as db from "./db";
import { generateHashChain, generateSeed, generateQRCode, createQRPayload, verifyHash } from "./hashChain";
import crypto from "crypto";

const router = Router();

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  free: { requests: 100, window: 60 * 60 * 1000 }, // 100 requests per hour
  starter: { requests: 1000, window: 60 * 60 * 1000 }, // 1000 requests per hour
  professional: { requests: 10000, window: 60 * 60 * 1000 }, // 10k requests per hour
  enterprise: { requests: 100000, window: 60 * 60 * 1000 }, // 100k requests per hour
};

// Middleware: API Key Authentication
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("X-API-Key") || req.header("Authorization")?.replace("Bearer ", "");

  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    // Find organization by API key
    const org = await db.getOrganizationByApiKey(apiKey);
    if (!org || !org.isActive) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Attach organization to request
    (req as any).organization = org;
    next();
  } catch (error) {
    console.error("API auth error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// Middleware: Rate Limiting
function rateLimit(req: Request, res: Response, next: NextFunction) {
  const org = (req as any).organization;
  if (!org) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const key = `rate_limit:${org.id}`;
  const now = Date.now();
  const limit = RATE_LIMIT[org.plan as keyof typeof RATE_LIMIT] || RATE_LIMIT.free;

  let record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + limit.window };
    rateLimitStore.set(key, record);
  }

  record.count++;

  // Set rate limit headers
  res.setHeader("X-RateLimit-Limit", limit.requests.toString());
  res.setHeader("X-RateLimit-Remaining", Math.max(0, limit.requests - record.count).toString());
  res.setHeader("X-RateLimit-Reset", new Date(record.resetTime).toISOString());

  if (record.count > limit.requests) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      limit: limit.requests,
      resetAt: new Date(record.resetTime).toISOString(),
    });
  }

  next();
}

// Apply authentication and rate limiting to all routes
router.use(authenticateApiKey);
router.use(rateLimit);

/**
 * GET /api/v1/chains
 * List all QR chains for the organization
 */
router.get("/chains", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chains = await db.getOrganizationChains(org.id);
    
    res.json({
      chains: chains.map((chain: any) => ({
        id: chain.id,
        name: chain.name,
        description: chain.description,
        chainLength: chain.chainLength,
        currentIndex: chain.currentIndex,
        remaining: chain.currentIndex + 1,
        isActive: chain.isActive,
        createdAt: chain.createdAt,
        updatedAt: chain.updatedAt,
      })),
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/chains
 * Create a new QR chain
 */
router.post("/chains", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const { name, description, chainLength = 100 } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }

    if (chainLength < 10 || chainLength > 10000) {
      return res.status(400).json({ error: "Chain length must be between 10 and 10,000" });
    }

    const seed = generateSeed();
    const hashes = generateHashChain(seed, chainLength);

    // Create chain record
    const chainId = await db.createQrChain({
      name,
      description: description || null,
      seed,
      chainLength,
      currentIndex: chainLength - 1,
      isActive: true,
      createdBy: org.ownerId,
      organizationId: org.id,
    });

    // Store all hashes
    const hashRecords = hashes.map((hash, index) => ({
      chainId,
      index,
      hashValue: hash,
      isUsed: false,
    }));
    await db.insertQrHashes(hashRecords);

    res.status(201).json({
      chainId,
      name,
      chainLength,
      message: "Chain created successfully",
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/chains/:chainId
 * Get details of a specific chain
 */
router.get("/chains/:chainId", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chainId = parseInt(req.params.chainId, 10);

    if (isNaN(chainId)) {
      return res.status(400).json({ error: "Invalid chain ID" });
    }

    const chain = await db.getQrChainById(chainId);
    if (!chain || chain.organizationId !== org.id) {
      return res.status(404).json({ error: "Chain not found" });
    }

    res.json({
      id: chain.id,
      name: chain.name,
      description: chain.description,
      chainLength: chain.chainLength,
      currentIndex: chain.currentIndex,
      remaining: chain.currentIndex + 1,
      isActive: chain.isActive,
      createdAt: chain.createdAt,
      updatedAt: chain.updatedAt,
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/chains/:chainId/current
 * Get the current QR code for a chain
 */
router.get("/chains/:chainId/current", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chainId = parseInt(req.params.chainId, 10);

    if (isNaN(chainId)) {
      return res.status(400).json({ error: "Invalid chain ID" });
    }

    const chain = await db.getQrChainById(chainId);
    if (!chain || chain.organizationId !== org.id) {
      return res.status(404).json({ error: "Chain not found" });
    }

    if (!chain.isActive) {
      return res.status(400).json({ error: "Chain is not active" });
    }

    const currentHash = await db.getQrHashByIndex(chainId, chain.currentIndex);
    if (!currentHash) {
      return res.status(404).json({ error: "Current hash not found" });
    }

    const payload = createQRPayload(chainId, currentHash.hashValue, chain.name);
    const qrCode = await generateQRCode(payload);

    res.json({
      chainId,
      chainName: chain.name,
      currentIndex: chain.currentIndex,
      hashValue: currentHash.hashValue,
      qrCode,
      remaining: chain.currentIndex + 1,
      totalLength: chain.chainLength,
      isActive: chain.isActive,
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/chains/:chainId/scan
 * Validate and scan a QR code
 */
router.post("/chains/:chainId/scan", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chainId = parseInt(req.params.chainId, 10);
    const { hashValue } = req.body;

    if (isNaN(chainId)) {
      return res.status(400).json({ error: "Invalid chain ID" });
    }

    if (!hashValue || typeof hashValue !== "string") {
      return res.status(400).json({ error: "Hash value is required" });
    }

    const chain = await db.getQrChainById(chainId);
    if (!chain || chain.organizationId !== org.id) {
      return res.status(404).json({ error: "Chain not found" });
    }

    if (!chain.isActive) {
      return res.status(400).json({ error: "Chain is not active" });
    }

    // Verify hash exists in chain
    const hash = await db.getQrHashByValue(chainId, hashValue);
    if (!hash) {
      await db.recordScan({
        chainId,
        hashId: 0,
        hashValue,
        chainIndex: -1,
        isValid: false,
        scannedBy: null,
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        errorMessage: "Invalid hash",
      });
      return res.status(400).json({ error: "Invalid QR code" });
    }

    // Check if already used
    if (hash.isUsed) {
      await db.recordScan({
        chainId,
        hashId: hash.id,
        hashValue,
        chainIndex: hash.index,
        isValid: false,
        scannedBy: null,
        ipAddress: req.ip || null,
        userAgent: req.get("user-agent") || null,
        errorMessage: "Hash already used",
      });
      return res.status(400).json({ error: "QR code already scanned" });
    }

    // Valid scan! Mark as used and advance chain
    await db.markHashAsUsed(hash.id);
    const newIndex = chain.currentIndex - 1;
    await db.updateQrChainIndex(chainId, newIndex);

    // Record successful scan
    await db.recordScan({
      chainId,
      hashId: hash.id,
      hashValue,
      chainIndex: hash.index,
      isValid: true,
      scannedBy: null,
      ipAddress: req.ip || null,
      userAgent: req.get("user-agent") || null,
      errorMessage: null,
    });

    // Trigger webhook if configured
    if (org.webhookUrl) {
      triggerWebhook(org, {
        event: "scan.success",
        chainId,
        chainName: chain.name,
        hashValue,
        index: hash.index,
        remaining: newIndex + 1,
        timestamp: new Date().toISOString(),
      }).catch(err => console.error("Webhook error:", err));
    }

    // Check if chain is now exhausted
    if (newIndex < 0) {
      await db.deactivateQrChain(chainId);
    }

    res.json({
      success: true,
      message: "QR code scanned successfully",
      chainId,
      newIndex,
      remaining: newIndex + 1,
      chainExhausted: newIndex < 0,
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/chains/:chainId/scans
 * Get scan history for a chain
 */
router.get("/chains/:chainId/scans", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chainId = parseInt(req.params.chainId, 10);
    const limit = parseInt(req.query.limit as string, 10) || 100;

    if (isNaN(chainId)) {
      return res.status(400).json({ error: "Invalid chain ID" });
    }

    const chain = await db.getQrChainById(chainId);
    if (!chain || chain.organizationId !== org.id) {
      return res.status(404).json({ error: "Chain not found" });
    }

    const scans = await db.getChainScans(chainId, Math.min(limit, 1000));
    res.json({ scans });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/chains/:chainId/stats
 * Get statistics for a chain
 */
router.get("/chains/:chainId/stats", async (req: Request, res: Response) => {
  try {
    const org = (req as any).organization;
    const chainId = parseInt(req.params.chainId, 10);

    if (isNaN(chainId)) {
      return res.status(400).json({ error: "Invalid chain ID" });
    }

    const chain = await db.getQrChainById(chainId);
    if (!chain || chain.organizationId !== org.id) {
      return res.status(404).json({ error: "Chain not found" });
    }

    const stats = await db.getChainStats(chainId);
    res.json({
      ...stats,
      chainLength: chain.chainLength,
      currentIndex: chain.currentIndex,
      remaining: chain.currentIndex + 1,
      scanned: chain.chainLength - (chain.currentIndex + 1),
      percentComplete: ((chain.chainLength - (chain.currentIndex + 1)) / chain.chainLength * 100).toFixed(1),
    });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Webhook trigger function
async function triggerWebhook(org: any, payload: any) {
  if (!org.webhookUrl || !org.webhookSecret) return;

  try {
    const signature = crypto
      .createHmac("sha256", org.webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    const response = await fetch(org.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Organization-Id": org.id.toString(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Webhook error:", error);
  }
}

export default router;
