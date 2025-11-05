CREATE TABLE `qr_chains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`seed` varchar(64) NOT NULL,
	`chainLength` int NOT NULL,
	`currentIndex` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `qr_chains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qr_hashes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chainId` int NOT NULL,
	`index` int NOT NULL,
	`hashValue` varchar(64) NOT NULL,
	`isUsed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qr_hashes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chainId` int NOT NULL,
	`hashId` int NOT NULL,
	`hashValue` varchar(64) NOT NULL,
	`chainIndex` int NOT NULL,
	`isValid` boolean NOT NULL,
	`scannedBy` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`errorMessage` text,
	`scannedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
