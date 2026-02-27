import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

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

// 签到记录表
export const checkins = mysqlTable("checkins", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 100 }).notNull(),
  avatarUrl: text("avatarUrl"), // AI生成头像URL
  avatarStyle: varchar("avatarStyle", { length: 50 }), // AI头像风格
  gridPosition: int("gridPosition"), // 在LOGO拼图中的位置
  checkedInAt: timestamp("checkedInAt").defaultNow().notNull(),
  department: varchar("department", { length: 100 }),
  message: text("message"), // 签到寄语
});

export type Checkin = typeof checkins.$inferSelect;
export type InsertCheckin = typeof checkins.$inferInsert;

// 心愿卡表
export const wishCards = mysqlTable("wish_cards", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 100 }).notNull(),
  userAvatar: varchar("userAvatar", { length: 500 }),
  content: text("content").notNull(),
  category: mysqlEnum("category", ["career", "team", "personal", "company"]).default("personal").notNull(),
  color: varchar("color", { length: 20 }).default("#FFD700"),
  isDisplayed: boolean("isDisplayed").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WishCard = typeof wishCards.$inferSelect;
export type InsertWishCard = typeof wishCards.$inferInsert;

// AI问答题目表
export const quizQuestions = mysqlTable("quiz_questions", {
  id: int("id").autoincrement().primaryKey(),
  question: text("question").notNull(),
  optionA: text("optionA").notNull(),
  optionB: text("optionB").notNull(),
  optionC: text("optionC").notNull(),
  optionD: text("optionD").notNull(),
  correctAnswer: varchar("correctAnswer", { length: 1 }).notNull(), // A/B/C/D
  explanation: text("explanation"),
  reward: int("reward").default(0), // 奖励积分
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuizQuestion = typeof quizQuestions.$inferSelect;

// 用户答题记录表
export const quizAnswers = mysqlTable("quiz_answers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: int("questionId").notNull(),
  answer: varchar("answer", { length: 1 }).notNull(),
  isCorrect: boolean("isCorrect").notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
});

export type QuizAnswer = typeof quizAnswers.$inferSelect;

// 奖项表
export const awards = mysqlTable("awards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["efficiency", "excellence", "special"]).default("excellence").notNull(),
  rewardAmount: int("rewardAmount").default(0), // 奖金金额（元）
  icon: varchar("icon", { length: 50 }),
  sortOrder: int("sortOrder").default(0),
});

export type Award = typeof awards.$inferSelect;

// 获奖记录表
export const awardWinners = mysqlTable("award_winners", {
  id: int("id").autoincrement().primaryKey(),
  awardId: int("awardId").notNull(),
  userId: int("userId"),
  winnerName: varchar("winnerName", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  aiAwardSpeech: text("aiAwardSpeech"), // AI生成的颁奖词
  isRevealed: boolean("isRevealed").default(false), // 是否已在大屏揭晓
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AwardWinner = typeof awardWinners.$inferSelect;

// 抽奖活动表
export const lotteryEvents = mysqlTable("lottery_events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  rewardType: mysqlEnum("rewardType", ["cash", "gift", "redpacket"]).default("cash").notNull(),
  rewardAmount: int("rewardAmount").default(0),
  maxWinners: int("maxWinners").default(1),
  isActive: boolean("isActive").default(true),
  drawnAt: timestamp("drawnAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LotteryEvent = typeof lotteryEvents.$inferSelect;

// 抽奖结果表
export const lotteryResults = mysqlTable("lottery_results", {
  id: int("id").autoincrement().primaryKey(),
  lotteryEventId: int("lotteryEventId").notNull(),
  userId: int("userId"),
  winnerName: varchar("winnerName", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  drawnAt: timestamp("drawnAt").defaultNow().notNull(),
});

export type LotteryResult = typeof lotteryResults.$inferSelect;

// 分组记录表
export const teamGroups = mysqlTable("team_groups", {
  id: int("id").autoincrement().primaryKey(),
  groupName: varchar("groupName", { length: 50 }).notNull(),
  members: text("members").notNull(), // JSON array of member names
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TeamGroup = typeof teamGroups.$inferSelect;

// 活动注册信息表（手机端用户注册）
export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  realName: varchar("realName", { length: 50 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  dietaryNeeds: varchar("dietaryNeeds", { length: 200 }), // 饮食需求
  expectations: text("expectations"), // 对活动的期待
  isRegistered: boolean("isRegistered").default(true),
  registeredAt: timestamp("registeredAt").defaultNow().notNull(),
});

export type Registration = typeof registrations.$inferSelect;
export type InsertRegistration = typeof registrations.$inferInsert;

// 活动配置表
export const eventConfig = mysqlTable("event_config", {
  id: int("id").autoincrement().primaryKey(),
  configKey: varchar("configKey", { length: 100 }).notNull().unique(),
  configValue: text("configValue"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
