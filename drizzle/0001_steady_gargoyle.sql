CREATE TABLE `award_winners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`awardId` int NOT NULL,
	`userId` int,
	`winnerName` varchar(100) NOT NULL,
	`department` varchar(100),
	`aiAwardSpeech` text,
	`isRevealed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `award_winners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `awards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`category` enum('efficiency','excellence','special') NOT NULL DEFAULT 'excellence',
	`rewardAmount` int DEFAULT 0,
	`icon` varchar(50),
	`sortOrder` int DEFAULT 0,
	CONSTRAINT `awards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checkins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`avatarUrl` text,
	`avatarStyle` varchar(50),
	`gridPosition` int,
	`checkedInAt` timestamp NOT NULL DEFAULT (now()),
	`department` varchar(100),
	`message` text,
	CONSTRAINT `checkins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configKey` varchar(100) NOT NULL,
	`configValue` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `event_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_config_configKey_unique` UNIQUE(`configKey`)
);
--> statement-breakpoint
CREATE TABLE `lottery_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`rewardType` enum('cash','gift','redpacket') NOT NULL DEFAULT 'cash',
	`rewardAmount` int DEFAULT 0,
	`maxWinners` int DEFAULT 1,
	`isActive` boolean DEFAULT true,
	`drawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lottery_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lottery_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lotteryEventId` int NOT NULL,
	`userId` int,
	`winnerName` varchar(100) NOT NULL,
	`department` varchar(100),
	`drawnAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lottery_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_answers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questionId` int NOT NULL,
	`answer` varchar(1) NOT NULL,
	`isCorrect` boolean NOT NULL,
	`answeredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_answers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` text NOT NULL,
	`optionA` text NOT NULL,
	`optionB` text NOT NULL,
	`optionC` text NOT NULL,
	`optionD` text NOT NULL,
	`correctAnswer` varchar(1) NOT NULL,
	`explanation` text,
	`reward` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_groups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupName` varchar(50) NOT NULL,
	`members` text NOT NULL,
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_groups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wish_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`userName` varchar(100) NOT NULL,
	`content` text NOT NULL,
	`category` enum('career','team','personal','company') NOT NULL DEFAULT 'personal',
	`color` varchar(20) DEFAULT '#FFD700',
	`isDisplayed` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wish_cards_id` PRIMARY KEY(`id`)
);
