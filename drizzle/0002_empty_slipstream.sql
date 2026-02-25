CREATE TABLE `registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`realName` varchar(50) NOT NULL,
	`department` varchar(100) NOT NULL,
	`position` varchar(100),
	`phone` varchar(20),
	`dietaryNeeds` varchar(200),
	`expectations` text,
	`isRegistered` boolean DEFAULT true,
	`registeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `registrations_userId_unique` UNIQUE(`userId`)
);
