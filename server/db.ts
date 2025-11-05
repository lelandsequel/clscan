import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, qrChains, qrHashes, scans, InsertQrChain, InsertQrHash, InsertScan, organizations, organizationMembers, InsertOrganization, InsertOrganizationMember } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// QR Chain Management

export async function createQrChain(chain: InsertQrChain) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(qrChains).values(chain);
  return result[0].insertId;
}

export async function getQrChainById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(qrChains).where(eq(qrChains.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllQrChains(userId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (userId) {
    return await db.select().from(qrChains).where(eq(qrChains.createdBy, userId)).orderBy(desc(qrChains.createdAt));
  }
  return await db.select().from(qrChains).orderBy(desc(qrChains.createdAt));
}

export async function updateQrChainIndex(chainId: number, newIndex: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(qrChains).set({ currentIndex: newIndex, updatedAt: new Date() }).where(eq(qrChains.id, chainId));
}

export async function deactivateQrChain(chainId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(qrChains).set({ isActive: false, updatedAt: new Date() }).where(eq(qrChains.id, chainId));
}

// QR Hash Management

export async function insertQrHashes(hashes: InsertQrHash[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert in batches of 1000 to avoid query size limits
  const batchSize = 1000;
  for (let i = 0; i < hashes.length; i += batchSize) {
    const batch = hashes.slice(i, i + batchSize);
    await db.insert(qrHashes).values(batch);
  }
}

export async function getQrHashByValue(chainId: number, hashValue: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(qrHashes)
    .where(and(eq(qrHashes.chainId, chainId), eq(qrHashes.hashValue, hashValue)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQrHashByIndex(chainId: number, index: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(qrHashes)
    .where(and(eq(qrHashes.chainId, chainId), eq(qrHashes.index, index)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markHashAsUsed(hashId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(qrHashes).set({ isUsed: true }).where(eq(qrHashes.id, hashId));
}

// Scan Tracking

export async function recordScan(scan: InsertScan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scans).values(scan);
  return result[0].insertId;
}

export async function getChainScans(chainId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(scans)
    .where(eq(scans.chainId, chainId))
    .orderBy(desc(scans.scannedAt))
    .limit(limit);
}

export async function getChainStats(chainId: number) {
  const db = await getDb();
  if (!db) return { totalScans: 0, validScans: 0, invalidScans: 0 };

  const allScans = await db.select().from(scans).where(eq(scans.chainId, chainId));
  
  return {
    totalScans: allScans.length,
    validScans: allScans.filter(s => s.isValid).length,
    invalidScans: allScans.filter(s => !s.isValid).length,
  };
}

// Organization Management

export async function createOrganization(org: InsertOrganization) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(organizations).values(org);
  return result[0].insertId;
}

export async function getOrganizationById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      secondaryColor: organizations.secondaryColor,
      customDomain: organizations.customDomain,
      plan: organizations.plan,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getOrganizationBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserOrganizations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      secondaryColor: organizations.secondaryColor,
      customDomain: organizations.customDomain,
      plan: organizations.plan,
      role: organizationMembers.role,
      isActive: organizations.isActive,
      createdAt: organizations.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId));

  return result;
}

export async function getDefaultOrganization(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get user's first organization (or create one if none exists)
  const orgs = await getUserOrganizations(userId);
  if (orgs.length > 0) {
    return orgs[0];
  }

  return null;
}

export async function addOrganizationMember(member: InsertOrganizationMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(organizationMembers).values(member);
}

export async function getOrganizationMembers(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: organizationMembers.id,
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      role: organizationMembers.role,
      createdAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, organizationId));

  return result;
}

export async function updateOrganization(id: number, updates: Partial<InsertOrganization>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(organizations).set(updates).where(eq(organizations.id, id));
}

export async function generateApiKey(): Promise<string> {
  const crypto = await import('crypto');
  return crypto.randomBytes(32).toString('hex');
}

export async function getOrganizationChains(organizationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(qrChains)
    .where(eq(qrChains.organizationId, organizationId))
    .orderBy(desc(qrChains.createdAt));
}

export async function getOrganizationByApiKey(apiKey: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(organizations)
    .where(eq(organizations.apiKey, apiKey))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOrganizationByStripeCustomerId(stripeCustomerId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(organizations)
    .where(eq(organizations.stripeCustomerId, stripeCustomerId))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getOrganizationByIdFull(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}
