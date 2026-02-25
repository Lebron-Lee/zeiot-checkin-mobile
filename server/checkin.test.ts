import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock DB and LLM calls
vi.mock("./db", () => ({
  getCheckins: vi.fn().mockResolvedValue([]),
  getCheckinCount: vi.fn().mockResolvedValue(0),
  getCheckinByUserId: vi.fn().mockResolvedValue(undefined),
  createCheckin: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    userName: "测试员工",
    avatarUrl: "https://example.com/avatar.png",
    avatarStyle: "ai-digital",
    department: "技术研发部",
    message: "2026，AI赋能！",
    gridPosition: 1,
    checkedInAt: new Date(),
  }),
  getWishCards: vi.fn().mockResolvedValue([]),
  getUserWishCards: vi.fn().mockResolvedValue([]),
  createWishCard: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    userName: "测试员工",
    content: "希望团队越来越好",
    category: "team",
    color: "#FFD700",
    isDisplayed: true,
    createdAt: new Date(),
  }),
  getActiveQuizQuestions: vi.fn().mockResolvedValue([
    {
      id: 1,
      question: "AI的全称是什么？",
      optionA: "Artificial Intelligence",
      optionB: "Automatic Interface",
      optionC: "Advanced Internet",
      optionD: "Automated Input",
      correctAnswer: "A",
      explanation: "AI即人工智能",
      reward: 5,
      isActive: true,
    },
  ]),
  getUserAnsweredQuestions: vi.fn().mockResolvedValue([]),
  getUserScore: vi.fn().mockResolvedValue(0),
  submitQuizAnswer: vi.fn().mockResolvedValue(undefined),
  getAwards: vi.fn().mockResolvedValue([]),
  getAwardWinners: vi.fn().mockResolvedValue([]),
  getAwardWithWinners: vi.fn().mockResolvedValue([]),
  getLotteryEvents: vi.fn().mockResolvedValue([
    { id: 1, name: "幸运大抽奖", rewardAmount: 200, maxWinners: 1, isActive: true },
  ]),
  getLotteryResults: vi.fn().mockResolvedValue([]),
  saveLotteryResult: vi.fn().mockResolvedValue(undefined),
  saveTeamGroups: vi.fn().mockResolvedValue(undefined),
  getTeamGroups: vi.fn().mockResolvedValue([]),
  getEventConfig: vi.fn().mockResolvedValue({ event_date: "2026-03-02", event_location: "中易物联集团总部" }),
  updateEventConfig: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/ai-avatar.png" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "恭喜获得年度优秀员工奖！您的贡献有目共睹，AI时代因您而精彩！" } }],
  }),
}));

vi.mock("./_core/index", () => ({
  broadcastToClients: vi.fn(),
}));

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user-001",
      name: "测试员工",
      email: "test@zeiot.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ===== 签到路由测试 =====
describe("checkin router", () => {
  it("getAll returns empty array initially", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkin.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getCount returns 0 initially", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const count = await caller.checkin.getCount();
    expect(count).toBe(0);
  });

  it("getMyCheckin requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.checkin.getMyCheckin()).rejects.toThrow();
  });

  it("doCheckin creates new checkin for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkin.doCheckin({ department: "技术研发部", message: "2026，AI赋能！" });
    expect(result).toHaveProperty("checkin");
    expect(result).toHaveProperty("isNew");
    expect(result.checkin?.userName).toBe("测试员工");
  });

  it("doCheckin returns isNew=false if already checked in", async () => {
    const { getCheckinByUserId } = await import("./db");
    vi.mocked(getCheckinByUserId).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      userName: "测试员工",
      avatarUrl: "https://example.com/avatar.png",
      avatarStyle: "ai-digital",
      department: "技术研发部",
      message: "已签到",
      gridPosition: 1,
      checkedInAt: new Date(),
    });
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkin.doCheckin({});
    expect(result.isNew).toBe(false);
  });
});

// ===== 心愿卡路由测试 =====
describe("wishCard router", () => {
  it("getAll returns public wish cards", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wishCard.getAll();
    expect(Array.isArray(result)).toBe(true);
  });

  it("submit creates a wish card for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.wishCard.submit({
      content: "希望团队越来越好",
      category: "team",
      color: "#FFD700",
    });
    expect(result).toHaveProperty("content", "希望团队越来越好");
    expect(result).toHaveProperty("category", "team");
  });

  it("submit requires authentication", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.wishCard.submit({ content: "测试", category: "career" })
    ).rejects.toThrow();
  });
});

// ===== AI问答路由测试 =====
describe("quiz router", () => {
  it("getQuestions returns questions without correct answers", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const questions = await caller.quiz.getQuestions();
    expect(Array.isArray(questions)).toBe(true);
    if (questions.length > 0) {
      expect(questions[0]).not.toHaveProperty("correctAnswer");
      expect(questions[0]).not.toHaveProperty("explanation");
      expect(questions[0]).toHaveProperty("question");
    }
  });

  it("submitAnswer returns correct feedback for right answer", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.quiz.submitAnswer({ questionId: 1, answer: "A" });
    expect(result).toHaveProperty("isCorrect", true);
    expect(result).toHaveProperty("correctAnswer", "A");
    expect(result.reward).toBeGreaterThan(0);
  });

  it("submitAnswer returns incorrect feedback for wrong answer", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.quiz.submitAnswer({ questionId: 1, answer: "B" });
    expect(result).toHaveProperty("isCorrect", false);
    expect(result.reward).toBe(0);
  });

  it("submitAnswer prevents duplicate answers", async () => {
    const { getUserAnsweredQuestions } = await import("./db");
    vi.mocked(getUserAnsweredQuestions).mockResolvedValueOnce([
      { id: 1, userId: 1, questionId: 1, answer: "A", isCorrect: true, answeredAt: new Date() },
    ]);
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.quiz.submitAnswer({ questionId: 1, answer: "A" })).rejects.toThrow("已经回答过这道题了");
  });
});

// ===== 抽奖路由测试 =====
describe("lottery router", () => {
  it("getEvents returns active lottery events", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const events = await caller.lottery.getEvents();
    expect(Array.isArray(events)).toBe(true);
  });

  it("draw requires admin role", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.lottery.draw({
        eventId: 1,
        participants: [{ name: "张三" }, { name: "李四" }],
      })
    ).rejects.toThrow();
  });

  it("draw selects winners for admin", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.lottery.draw({
      eventId: 1,
      participants: [{ name: "张三" }, { name: "李四" }, { name: "王五" }],
    });
    expect(result).toHaveProperty("winners");
    expect(result.winners.length).toBeGreaterThan(0);
    expect(result.winners.length).toBeLessThanOrEqual(1);
  });

  it("generateGroups requires admin role", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.lottery.generateGroups({ members: ["张三", "李四"], groupCount: 2 })
    ).rejects.toThrow();
  });

  it("generateGroups creates correct number of groups for admin", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const members = ["张三", "李四", "王五", "赵六", "钱七", "孙八"];
    const result = await caller.lottery.generateGroups({ members, groupCount: 3 });
    expect(result).toHaveLength(3);
    const allMembers = result.flatMap((g) => g.members);
    expect(allMembers).toHaveLength(members.length);
  });
});

// ===== 颁奖词生成测试 =====
describe("award router", () => {
  it("generateSpeech requires admin role", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.award.generateSpeech({ winnerName: "张三", awardName: "年度优秀员工奖" })
    ).rejects.toThrow();
  });

  it("generateSpeech returns AI speech for admin", async () => {
    const ctx = createUserContext("admin");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.award.generateSpeech({
      winnerName: "张三",
      awardName: "年度优秀员工奖",
    });
    expect(result).toHaveProperty("speech");
    expect(typeof result.speech).toBe("string");
    expect(result.speech.length).toBeGreaterThan(0);
  });
});

// ===== 活动配置测试 =====
describe("event router", () => {
  it("getConfig returns event configuration", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const config = await caller.event.getConfig();
    expect(config).toHaveProperty("event_date");
    expect(config).toHaveProperty("event_location");
  });

  it("updateConfig requires admin role", async () => {
    const ctx = createUserContext("user");
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.event.updateConfig({ key: "event_date", value: "2026-03-03" })
    ).rejects.toThrow();
  });
});

// ===== 认证路由测试 =====
describe("auth router", () => {
  it("me returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.name).toBe("测试员工");
  });

  it("logout clears session cookie", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
