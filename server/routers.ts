import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { generateHashChain, generateSeed, generateQRCode, createQRPayload, verifyHash } from "./hashChain";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  qr: router({
    // Create a new morphing QR code chain
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        chainLength: z.number().int().min(10).max(10000).default(100),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get or create default organization for user
        let org = await db.getDefaultOrganization(ctx.user.id);
        let organizationId: number;
        
        if (!org) {
          // Create default organization for new user
          organizationId = await db.createOrganization({
            name: `${ctx.user.name || 'My'} Organization`,
            slug: `org-${ctx.user.id}-${Date.now()}`,
            ownerId: ctx.user.id,
            plan: 'free',
            isActive: true,
          });
          await db.addOrganizationMember({
            organizationId,
            userId: ctx.user.id,
            role: 'owner',
          });
        } else {
          organizationId = org.id;
        }

        const seed = generateSeed();
        const hashes = generateHashChain(seed, input.chainLength);

        // Create chain record
        const chainId = await db.createQrChain({
          name: input.name,
          description: input.description || null,
          seed,
          chainLength: input.chainLength,
          currentIndex: input.chainLength - 1, // Start at the end
          isActive: true,
          createdBy: ctx.user.id,
          organizationId,
        });

        // Store all hashes
        const hashRecords = hashes.map((hash, index) => ({
          chainId,
          index,
          hashValue: hash,
          isUsed: false,
        }));
        await db.insertQrHashes(hashRecords);

        return { chainId, message: "QR chain created successfully" };
      }),

    // Get all chains for current user
    list: protectedProcedure.query(async ({ ctx }) => {
      const chains = await db.getAllQrChains(ctx.user.id);
      return chains;
    }),

    // Get specific chain details
    get: publicProcedure
      .input(z.object({ chainId: z.number().int() }))
      .query(async ({ input }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }
        return chain;
      }),

    // Get current QR code for a chain
    getCurrent: publicProcedure
      .input(z.object({ chainId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        if (!chain.isActive) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Chain is not active" });
        }

        if (chain.currentIndex < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Chain exhausted" });
        }

        const currentHash = await db.getQrHashByIndex(input.chainId, chain.currentIndex);
        if (!currentHash) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Hash not found" });
        }

        // Generate QR code
        const baseUrl = `${ctx.req.protocol}://${ctx.req.get('host')}`;
        const payload = createQRPayload(input.chainId, currentHash.hashValue, baseUrl);
        const qrDataUrl = await generateQRCode(payload);

        return {
          chainId: input.chainId,
          chainName: chain.name,
          currentIndex: chain.currentIndex,
          totalLength: chain.chainLength,
          remaining: chain.currentIndex + 1,
          hashValue: currentHash.hashValue,
          qrCode: qrDataUrl,
          isActive: chain.isActive,
        };
      }),

    // Validate and advance chain
    scan: publicProcedure
      .input(z.object({
        chainId: z.number().int(),
        hashValue: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        if (!chain.isActive) {
          await db.recordScan({
            chainId: input.chainId,
            hashId: 0,
            hashValue: input.hashValue,
            chainIndex: chain.currentIndex,
            isValid: false,
            scannedBy: ctx.user?.id || null,
            ipAddress: ctx.req.ip || null,
            userAgent: ctx.req.get('user-agent') || null,
            errorMessage: "Chain is not active",
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "Chain is not active" });
        }

        // Find the hash
        const hash = await db.getQrHashByValue(input.chainId, input.hashValue);
        if (!hash) {
          await db.recordScan({
            chainId: input.chainId,
            hashId: 0,
            hashValue: input.hashValue,
            chainIndex: chain.currentIndex,
            isValid: false,
            scannedBy: ctx.user?.id || null,
            ipAddress: ctx.req.ip || null,
            userAgent: ctx.req.get('user-agent') || null,
            errorMessage: "Hash not found in chain",
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid QR code" });
        }

        // Check if it's the current hash
        if (hash.index !== chain.currentIndex) {
          await db.recordScan({
            chainId: input.chainId,
            hashId: hash.id,
            hashValue: input.hashValue,
            chainIndex: hash.index,
            isValid: false,
            scannedBy: ctx.user?.id || null,
            ipAddress: ctx.req.ip || null,
            userAgent: ctx.req.get('user-agent') || null,
            errorMessage: `Wrong hash index. Expected ${chain.currentIndex}, got ${hash.index}`,
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "This QR code is no longer valid" });
        }

        // Check if already used
        if (hash.isUsed) {
          await db.recordScan({
            chainId: input.chainId,
            hashId: hash.id,
            hashValue: input.hashValue,
            chainIndex: hash.index,
            isValid: false,
            scannedBy: ctx.user?.id || null,
            ipAddress: ctx.req.ip || null,
            userAgent: ctx.req.get('user-agent') || null,
            errorMessage: "Hash already used",
          });
          throw new TRPCError({ code: "BAD_REQUEST", message: "This QR code has already been scanned" });
        }

        // Valid scan! Mark as used and advance chain
        await db.markHashAsUsed(hash.id);
        const newIndex = chain.currentIndex - 1;
        await db.updateQrChainIndex(input.chainId, newIndex);

        // Record successful scan
        await db.recordScan({
          chainId: input.chainId,
          hashId: hash.id,
          hashValue: input.hashValue,
          chainIndex: hash.index,
          isValid: true,
          scannedBy: ctx.user?.id || null,
          ipAddress: ctx.req.ip || null,
          userAgent: ctx.req.get('user-agent') || null,
          errorMessage: null,
        });

        // Check if chain is now exhausted
        if (newIndex < 0) {
          await db.deactivateQrChain(input.chainId);
        }

        return {
          success: true,
          message: "QR code scanned successfully",
          newIndex,
          remaining: newIndex + 1,
          chainExhausted: newIndex < 0,
        };
      }),

    // Get scan history for a chain
    getScans: protectedProcedure
      .input(z.object({
        chainId: z.number().int(),
        limit: z.number().int().min(1).max(1000).default(100),
      }))
      .query(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        // Check ownership
        if (chain.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const scans = await db.getChainScans(input.chainId, input.limit);
        return scans;
      }),

    // Get statistics for a chain
    getStats: protectedProcedure
      .input(z.object({ chainId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        // Check ownership
        if (chain.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const stats = await db.getChainStats(input.chainId);
        return {
          ...stats,
          chainLength: chain.chainLength,
          currentIndex: chain.currentIndex,
          remaining: chain.currentIndex + 1,
          scanned: chain.chainLength - (chain.currentIndex + 1),
          percentComplete: ((chain.chainLength - (chain.currentIndex + 1)) / chain.chainLength * 100).toFixed(1),
        };
      }),

    // Deactivate a chain
    deactivate: protectedProcedure
      .input(z.object({ chainId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        // Check ownership
        if (chain.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        await db.deactivateQrChain(input.chainId);
        return { success: true, message: "Chain deactivated" };
      }),

    // Export scan data as CSV
    exportCSV: protectedProcedure
      .input(z.object({ chainId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        // Check ownership
        if (chain.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const { generateScanCSVString } = await import("./exportUtils");
        const csvContent = await generateScanCSVString(input.chainId);
        return { csvContent };
      }),

    // Export scan data as PDF
    exportPDF: protectedProcedure
      .input(z.object({ chainId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const chain = await db.getQrChainById(input.chainId);
        if (!chain) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Chain not found" });
        }

        // Check ownership
        if (chain.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const { exportScansToPDF } = await import("./exportUtils");
        const pdfBuffer = await exportScansToPDF(input.chainId);
        const base64Pdf = pdfBuffer.toString('base64');
        return { pdfData: base64Pdf };
      }),
  }),

  // Organization Management
  organization: router({
    // Get current user's organizations
    list: protectedProcedure.query(async ({ ctx }) => {
      const orgs = await db.getUserOrganizations(ctx.user.id);
      return orgs;
    }),

    // Get organization details
    get: protectedProcedure
      .input(z.object({ organizationId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        const org = await db.getOrganizationById(input.organizationId);
        if (!org) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
        }
        
        // Check membership
        const orgs = await db.getUserOrganizations(ctx.user.id);
        const isMember = orgs.some(o => o.id === input.organizationId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        return org;
      }),

    // Update organization branding
    updateBranding: protectedProcedure
      .input(z.object({
        organizationId: z.number().int(),
        name: z.string().min(1).max(255).optional(),
        logoUrl: z.string().url().optional(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user is admin/owner
        const orgs = await db.getUserOrganizations(ctx.user.id);
        const org = orgs.find(o => o.id === input.organizationId);
        if (!org || (org.role !== 'owner' && org.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const { organizationId, ...updates } = input;
        await db.updateOrganization(organizationId, updates);
        return { success: true, message: "Branding updated" };
      }),

    // Generate new API key
    generateApiKey: protectedProcedure
      .input(z.object({ organizationId: z.number().int() }))
      .mutation(async ({ input, ctx }) => {
        // Check if user is owner
        const orgs = await db.getUserOrganizations(ctx.user.id);
        const org = orgs.find(o => o.id === input.organizationId);
        if (!org || org.role !== 'owner') {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only owners can generate API keys" });
        }

        const apiKey = await db.generateApiKey();
        await db.updateOrganization(input.organizationId, { apiKey });
        return { apiKey };
      }),

    // Update webhook settings
    updateWebhook: protectedProcedure
      .input(z.object({
        organizationId: z.number().int(),
        webhookUrl: z.string().url().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Check if user is admin/owner
        const orgs = await db.getUserOrganizations(ctx.user.id);
        const org = orgs.find(o => o.id === input.organizationId);
        if (!org || (org.role !== 'owner' && org.role !== 'admin')) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const webhookSecret = input.webhookUrl ? await db.generateApiKey() : null;
        await db.updateOrganization(input.organizationId, {
          webhookUrl: input.webhookUrl || null,
          webhookSecret,
        });
        
        return { 
          success: true, 
          message: "Webhook updated",
          webhookSecret 
        };
      }),

    // Get organization members
    getMembers: protectedProcedure
      .input(z.object({ organizationId: z.number().int() }))
      .query(async ({ input, ctx }) => {
        // Check membership
        const orgs = await db.getUserOrganizations(ctx.user.id);
        const isMember = orgs.some(o => o.id === input.organizationId);
        if (!isMember) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
        }

        const members = await db.getOrganizationMembers(input.organizationId);
        return members;
      }),
  }),
});

export type AppRouter = typeof appRouter;
