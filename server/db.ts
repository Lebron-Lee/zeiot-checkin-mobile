import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertRegistration,
  InsertUser,
  awardWinners,
  awards,
  checkins,
  eventConfig,
  lotteryEvents,
  lotteryResults,
  quizAnswers,
  quizQuestions,
  registrations,
  teamGroups,
  users,
  wishCards,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
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
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== 签到相关 =====
export async function getCheckins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(checkins).orderBy(desc(checkins.checkedInAt));
}

export async function getCheckinByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(checkins).where(eq(checkins.userId, userId)).limit(1);
  return result[0];
}

export async function createCheckin(data: {
  userId: number;
  userName: string;
  avatarUrl?: string;
  avatarStyle?: string;
  gridPosition?: number;
  department?: string;
  message?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const count = await db.select({ count: sql<number>`count(*)` }).from(checkins);
  const position = (count[0]?.count ?? 0) + 1;
  await db.insert(checkins).values({ ...data, gridPosition: position });
  const result = await db.select().from(checkins).where(eq(checkins.userId, data.userId)).limit(1);
  return result[0];
}

export async function getCheckinCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(checkins);
  return Number(result[0]?.count ?? 0);
}

// ===== 心愿卡相关 =====
export async function getWishCards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wishCards).where(eq(wishCards.isDisplayed, true)).orderBy(desc(wishCards.createdAt));
}

export async function createWishCard(data: {
  userId: number;
  userName: string;
  userAvatar?: string | null;
  content: string;
  category: "career" | "team" | "personal" | "company";
  color?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(wishCards).values(data);
  const result = await db
    .select()
    .from(wishCards)
    .where(and(eq(wishCards.userId, data.userId), eq(wishCards.content, data.content)))
    .orderBy(desc(wishCards.createdAt))
    .limit(1);
  return result[0];
}

export async function getUserWishCards(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(wishCards).where(eq(wishCards.userId, userId)).orderBy(desc(wishCards.createdAt));
}

// ===== 问答相关 =====
export async function getActiveQuizQuestions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizQuestions).where(eq(quizQuestions.isActive, true));
}

export async function getUserAnsweredQuestions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quizAnswers).where(eq(quizAnswers.userId, userId));
}

export async function submitQuizAnswer(data: {
  userId: number;
  questionId: number;
  answer: string;
  isCorrect: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(quizAnswers).values(data);
}

export async function getUserScore(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ total: sql<number>`sum(q.reward)` })
    .from(quizAnswers)
    .innerJoin(quizQuestions, eq(quizAnswers.questionId, quizQuestions.id))
    .where(and(eq(quizAnswers.userId, userId), eq(quizAnswers.isCorrect, true)));
  return Number(result[0]?.total ?? 0);
}

// ===== 奖项相关 =====
export async function getAwards() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(awards).orderBy(awards.sortOrder);
}

export async function getAwardWinners() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(awardWinners).orderBy(awardWinners.awardId);
}

export async function getAwardWithWinners() {
  const db = await getDb();
  if (!db) return [];
  const allAwards = await db.select().from(awards).orderBy(awards.sortOrder);
  const allWinners = await db.select().from(awardWinners);
  return allAwards.map((award) => ({
    ...award,
    winners: allWinners.filter((w) => w.awardId === award.id),
  }));
}

export async function saveAwardSpeech(winnerId: number, speech: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(awardWinners).set({ aiAwardSpeech: speech, isRevealed: true }).where(eq(awardWinners.id, winnerId));
}

// ===== 抽奖相关 =====
export async function getLotteryEvents() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lotteryEvents).where(eq(lotteryEvents.isActive, true));
}

export async function getLotteryResults(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(lotteryResults).where(eq(lotteryResults.lotteryEventId, eventId));
}

export async function saveLotteryResult(data: {
  lotteryEventId: number;
  userId?: number;
  winnerName: string;
  department?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(lotteryResults).values(data);
}

export async function saveTeamGroups(groups: { groupName: string; members: string; color: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teamGroups);
  if (groups.length > 0) await db.insert(teamGroups).values(groups);
}

export async function getTeamGroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamGroups).orderBy(teamGroups.createdAt);
}

// ===== 活动配置 =====
export async function getEventConfig() {
  const db = await getDb();
  if (!db) return {};
  const configs = await db.select().from(eventConfig);
  return configs.reduce(
    (acc, c) => {
      acc[c.configKey] = c.configValue ?? "";
      return acc;
    },
    {} as Record<string, string>
  );
}

export async function updateEventConfig(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(eventConfig)
    .values({ configKey: key, configValue: value })
    .onDuplicateKeyUpdate({ set: { configValue: value } });
}

// ===== 活动注册 =====
export async function createRegistration(data: InsertRegistration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(registrations).values(data).onDuplicateKeyUpdate({
    set: {
      realName: data.realName,
      department: data.department,
      position: data.position ?? null,
      phone: data.phone ?? null,
      dietaryNeeds: data.dietaryNeeds ?? null,
      expectations: data.expectations ?? null,
    },
  });
}

export async function getRegistrationByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(registrations).where(eq(registrations.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getAllRegistrations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(registrations).orderBy(desc(registrations.registeredAt));
}

// ===== 一键初始化（清空测试数据）=====
export async function resetEventData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 清空签到、心愿卡、答题记录、抽奖结果、分组记录
  await db.delete(checkins);
  await db.delete(wishCards);
  await db.delete(quizAnswers);
  await db.delete(lotteryResults);
  await db.delete(teamGroups);
}

// ===== AI问答种子数据 =====
const QUIZ_SEED_DATA = [
  {
    question: "AI（人工智能）中的'机器学习'是指什么？",
    optionA: "机器自动维修的技术",
    optionB: "让计算机通过数据自动学习规律的技术",
    optionC: "机器人学习人类语言的过程",
    optionD: "工厂自动化生产流程",
    correctAnswer: "B" as const,
    explanation: "机器学习是AI的核心分支，让计算机通过大量数据自动发现规律并做出预测，无需人工编写明确规则。",
    reward: 5,
    isActive: true,
  },
  {
    question: "ChatGPT、文心一言等大语言模型的核心技术架构是？",
    optionA: "卷积神经网络（CNN）",
    optionB: "循环神经网络（RNN）",
    optionC: "Transformer架构",
    optionD: "决策树算法",
    correctAnswer: "C" as const,
    explanation: "Transformer架构由Google在2017年提出，通过注意力机制处理序列数据，是当前大语言模型的基础架构。",
    reward: 5,
    isActive: true,
  },
  {
    question: "在物联网（IoT）应用中，AI的主要作用是？",
    optionA: "替代所有人工操作",
    optionB: "对传感器数据进行智能分析和预测",
    optionC: "提高网络传输速度",
    optionD: "降低硬件成本",
    correctAnswer: "B" as const,
    explanation: "AI在IoT中主要用于分析海量传感器数据，实现设备故障预测、异常检测、能耗优化等智能化应用。",
    reward: 5,
    isActive: true,
  },
  {
    question: "中易物联集团的主营业务方向是？",
    optionA: "互联网电商平台",
    optionB: "物联网技术与智能化解决方案",
    optionC: "传统制造业",
    optionD: "金融科技服务",
    correctAnswer: "B" as const,
    explanation: "中易物联集团专注于物联网技术，为客户提供智能化解决方案，助力企业数字化转型。",
    reward: 5,
    isActive: true,
  },
  {
    question: "以下哪个不是常见的AI应用场景？",
    optionA: "人脸识别门禁",
    optionB: "智能客服机器人",
    optionC: "传统纸质档案归档",
    optionD: "预测性设备维护",
    correctAnswer: "C" as const,
    explanation: "传统纸质档案归档是人工流程，不涉及AI技术。其他选项都是AI的典型应用场景。",
    reward: 5,
    isActive: true,
  },
];

export async function seedQuizQuestionsIfEmpty() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(quizQuestions).limit(1);
  if (existing.length > 0) return; // 已有题目，不重复插入
  await db.insert(quizQuestions).values(QUIZ_SEED_DATA);
  console.log("[DB] Quiz questions seeded:", QUIZ_SEED_DATA.length, "questions");
}
