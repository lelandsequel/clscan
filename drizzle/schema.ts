import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Organizations - multi-tenant support for white-label branding
 */
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  /** Organization name */
  name: varchar("name", { length: 255 }).notNull(),
  /** URL-friendly slug for custom domains */
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  /** Custom branding - logo URL */
  logoUrl: text("logoUrl"),
  /** Custom branding - primary color (hex) */
  primaryColor: varchar("primaryColor", { length: 7 }).default("#3b82f6"),
  /** Custom branding - secondary color (hex) */
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#6366f1"),
  /** Custom domain (e.g., qr.company.com) */
  customDomain: varchar("customDomain", { length: 255 }),
  /** Subscription plan */
  plan: mysqlEnum("plan", ["free", "starter", "professional", "enterprise"]).default("free").notNull(),
  /** Stripe customer ID */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  /** Stripe subscription ID */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  /** Owner user ID */
  ownerId: int("ownerId").notNull(),
  /** API key for programmatic access */
  apiKey: varchar("apiKey", { length: 64 }).unique(),
  /** Webhook URL for scan notifications */
  webhookUrl: text("webhookUrl"),
  /** Webhook secret for signature verification */
  webhookSecret: varchar("webhookSecret", { length: 64 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

/**
 * Organization members - users belonging to organizations
 */
export const organizationMembers = mysqlTable("organization_members", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: int("organizationId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member", "viewer"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

/**
 * Morphing QR Code chains
 * Each chain represents a sequence of unique QR codes that morph after each scan
 */
export const qrChains = mysqlTable("qr_chains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** The secret seed used to generate the hash chain */
  seed: varchar("seed", { length: 64 }).notNull(),
  /** Total length of the hash chain */
  chainLength: int("chainLength").notNull(),
  /** Current position in the chain (starts at chainLength-1, counts down to 0) */
  currentIndex: int("currentIndex").notNull(),
  /** Whether this chain is active and accepting scans */
  isActive: boolean("isActive").default(true).notNull(),
  /** User who created this chain */
  createdBy: int("createdBy").notNull(),
  /** Organization this chain belongs to */
  organizationId: int("organizationId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type QrChain = typeof qrChains.$inferSelect;
export type InsertQrChain = typeof qrChains.$inferInsert;

/**
 * Individual hashes in a chain (pre-computed for fast lookup)
 * Stores each hash value for verification
 */
export const qrHashes = mysqlTable("qr_hashes", {
  id: int("id").autoincrement().primaryKey(),
  chainId: int("chainId").notNull(),
  /** Position in the chain (0 to chainLength-1) */
  index: int("index").notNull(),
  /** The hash value at this position */
  hashValue: varchar("hashValue", { length: 64 }).notNull(),
  /** Whether this hash has been used/scanned */
  isUsed: boolean("isUsed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QrHash = typeof qrHashes.$inferSelect;
export type InsertQrHash = typeof qrHashes.$inferInsert;

/**
 * Scan events - tracks every time a QR code is scanned
 */
export const scans = mysqlTable("scans", {
  id: int("id").autoincrement().primaryKey(),
  chainId: int("chainId").notNull(),
  hashId: int("hashId").notNull(),
  /** The hash value that was scanned */
  hashValue: varchar("hashValue", { length: 64 }).notNull(),
  /** Position in chain when scanned */
  chainIndex: int("chainIndex").notNull(),
  /** Whether the scan was valid */
  isValid: boolean("isValid").notNull(),
  /** User who scanned (if authenticated) */
  scannedBy: int("scannedBy"),
  /** IP address of scanner */
  ipAddress: varchar("ipAddress", { length: 45 }),
  /** User agent string */
  userAgent: text("userAgent"),
  /** Any error message if scan failed */
  errorMessage: text("errorMessage"),
  scannedAt: timestamp("scannedAt").defaultNow().notNull(),
});

export type Scan = typeof scans.$inferSelect;
export type InsertScan = typeof scans.$inferInsert;
