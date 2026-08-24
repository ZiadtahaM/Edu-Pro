CREATE TABLE `pilotReadinessRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`status` enum('draft','in_review','approved','rejected') NOT NULL DEFAULT 'draft',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pilotReadinessRecords_id` PRIMARY KEY(`id`)
);
