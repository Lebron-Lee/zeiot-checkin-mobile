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

export async function upsertCheckin(data: {
  userId: number;
  userName: string;
  avatarUrl?: string;
  avatarStyle?: string;
  department?: string;
  message?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(checkins).where(eq(checkins.userId, data.userId)).limit(1);
  if (existing[0]) {
    // 更新已有签到记录
    await db.update(checkins)
      .set({
        userName: data.userName,
        avatarUrl: data.avatarUrl,
        avatarStyle: data.avatarStyle,
        department: data.department,
        message: data.message,
        checkedInAt: new Date(),
      })
      .where(eq(checkins.userId, data.userId));
  } else {
    // 新建签到记录
    const count = await db.select({ count: sql<number>`count(*)` }).from(checkins);
    const position = (count[0]?.count ?? 0) + 1;
    await db.insert(checkins).values({ ...data, gridPosition: position });
  }
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
  // 将null转为undefined，避免MySQL对nullable varchar插入null时的SQL错误
  const insertData = { ...data, userAvatar: data.userAvatar || undefined };
  await db.insert(wishCards).values(insertData);
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

// ===== AI问答种子数据（200道前沿AI知识题）=====
import { QUIZ_QUESTIONS_200 } from "./quiz_data";

export async function seedQuizQuestionsIfEmpty() {
  const db = await getDb();
  if (!db) return;
  // 检查题目数量，如果少于预期数量则重新初始化
  const existing = await db.select({ id: quizQuestions.id }).from(quizQuestions);
  if (existing.length >= QUIZ_QUESTIONS_200.length) {
    console.log("[DB] Quiz questions already seeded:", existing.length, "questions");
    return;
  }
  // 题目数量不足，清空旧题目并重新插入
  if (existing.length > 0) {
    await db.delete(quizQuestions);
    console.log("[DB] Cleared old quiz questions:", existing.length, "questions");
  }
  // 分批插入，避免单次插入过多
  const batchSize = 50;
  for (let i = 0; i < QUIZ_QUESTIONS_200.length; i += batchSize) {
    const batch = QUIZ_QUESTIONS_200.slice(i, i + batchSize);
    await db.insert(quizQuestions).values(batch);
  }
  console.log("[DB] Quiz questions seeded:", QUIZ_QUESTIONS_200.length, "questions");
}
