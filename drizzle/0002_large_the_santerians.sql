CREATE TABLE `organization_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','member','viewer') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`logoUrl` text,
	`primaryColor` varchar(7) DEFAULT '#3b82f6',
	`secondaryColor` varchar(7) DEFAULT '#6366f1',
	`customDomain` varchar(255),
	`plan` enum('free','starter','professional','enterprise') NOT NULL DEFAULT 'free',
	`stripeCustomerId` varchar(255),
	`stripeSubscriptionId` varchar(255),
	`ownerId` int NOT NULL,
	`apiKey` varchar(64),
	`webhookUrl` text,
	`webhookSecret` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizations_id` PRIMARY KEY(`id`),
	CONSTRAINT `organizations_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `organizations_apiKey_unique` UNIQUE(`apiKey`)
);
--> statement-breakpoint
ALTER TABLE `qr_chains` ADD `organizationId` int NOT NULL;