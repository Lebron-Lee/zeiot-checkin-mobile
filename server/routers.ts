import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createCheckin,
  createWishCard,
  getActiveQuizQuestions,
  createRegistration,
  getAllRegistrations,
  getAwardWithWinners,
  getAwards,
  getCheckinByUserId,
  getCheckinCount,
  getCheckins,
  getEventConfig,
  getLotteryEvents,
  getLotteryResults,
  getRegistrationByUserId,
  getTeamGroups,
  getUserAnsweredQuestions,
  getUserScore,
  getUserWishCards,
  getWishCards,
  saveLotteryResult,
  saveTeamGroups,
  submitQuizAnswer,
  updateEventConfig,
  resetEventData,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { broadcastToClients } from "./_core/index";
import { sdk } from "./_core/sdk";
import { getUserByOpenId, upsertUser } from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // 本地注册：手机号+姓名创建账号
    localRegister: publicProcedure
      .input(z.object({
        phone: z.string().min(11).max(11),
        name: z.string().min(1).max(50),
        department: z.string().optional(),
        position: z.string().optional(),
        role: z.enum(["employee", "guest", "partner"]).default("employee"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 以手机号作为 openId（加前缀区分本地用户）
        const openId = `local_${input.phone}`;
        let user = await getUserByOpenId(openId);
        if (user) {
          // 已注册，直接登录
          const token = await sdk.createSessionToken(openId, { name: user.name || input.name });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          return { success: true, isNew: false, user };
        }
        // 创建新用户
        await upsertUser({
          openId,
          name: input.name,
          email: null,
          loginMethod: "local",
          lastSignedIn: new Date(),
        });
        user = await getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "用户创建失败" });
        // 创建 session
        const token = await sdk.createSessionToken(openId, { name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, isNew: true, user };
      }),

    // 本地登录：手机号登录
    localLogin: publicProcedure
      .input(z.object({
        phone: z.string().min(11).max(11),
      }))
      .mutation(async ({ ctx, input }) => {
        const openId = `local_${input.phone}`;
        const user = await getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "手机号未注册，请先注册" });
        const token = await sdk.createSessionToken(openId, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, user };
      }),
  }),

  // ===== 活动配置 =====
  event: router({
    getConfig: publicProcedure.query(async () => {
      return getEventConfig();
    }),
    updateConfig: publicProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input }) => {
        await updateEventConfig(input.key, input.value);
        return { success: true };
      }),
  }),

  // ===== 照片上传 =====
  upload: router({
    photo: protectedProcedure
      .input(z.object({
        base64: z.string(), // base64编码的图片数据
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 将base64转为Buffer并上传到S3
        const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `checkin-photos/${ctx.user.id}-${Date.now()}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),

  // ===== 签到 =====
  checkin: router({
    getAll: publicProcedure.query(async () => {
      return getCheckins();
    }),
    getCount: publicProcedure.query(async () => {
      return getCheckinCount();
    }),
    getMyCheckin: protectedProcedure.query(async ({ ctx }) => {
      return getCheckinByUserId(ctx.user.id);
    }),
    doCheckin: protectedProcedure
      .input(
        z.object({
          department: z.string().optional(),
          message: z.string().optional(),
          photoUrl: z.string().optional(), // 刷脸拍照上传后的照片URL
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 检查调试模式
        const config = await getEventConfig();
        const isDebugMode = config["debug_mode"] === "true";

        // 检查签到时间（调试模式下跳过）
        if (!isDebugMode) {
          const checkinOpenTime = new Date("2026-03-01T09:00:00+08:00");
          if (new Date() < checkinOpenTime) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "签到尚未开放，请于2026年3月1日09:00后签到",
            });
          }
        }

        // 检查是否已签到
        const existing = await getCheckinByUserId(ctx.user.id);
        if (existing) return { checkin: existing, isNew: false };

        // 使用拍照的照片作为头像，无照片则使用默认头像
        const avatarUrl = input.photoUrl || "";
        const avatarStyle = "face-photo";

        const checkin = await createCheckin({
          userId: ctx.user.id,
          userName: ctx.user.name || "匿名员工",
          avatarUrl,
          avatarStyle,
          department: input.department,
          message: input.message,
        });

        // 广播到大屏
        try {
          broadcastToClients({
            type: "NEW_CHECKIN",
            data: checkin,
          });
        } catch (e) {
          console.error("Broadcast failed:", e);
        }

        return { checkin, isNew: true };
      }),
  }),

  // ===== 心愿卡 =====
  wishCard: router({
    getAll: publicProcedure.query(async () => {
      return getWishCards();
    }),
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return getUserWishCards(ctx.user.id);
    }),
    submit: protectedProcedure
      .input(
        z.object({
          content: z.string().min(1).max(200),
          category: z.enum(["career", "team", "personal", "company"]),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const card = await createWishCard({
          userId: ctx.user.id,
          userName: ctx.user.name || "匿名员工",
          content: input.content,
          category: input.category,
          color: input.color || "#FFD700",
        });

        // 广播到大屏
        try {
          broadcastToClients({
            type: "NEW_WISH_CARD",
            data: card,
          });
        } catch (e) {
          console.error("Broadcast failed:", e);
        }

        return card;
      }),
  }),

  // ===== AI问答 =====
  quiz: router({
    getQuestions: publicProcedure.query(async () => {
      const questions = await getActiveQuizQuestions();
      // 不返回正确答案
      return questions.map(({ correctAnswer: _ca, explanation: _ex, ...q }) => q);
    }),
    getMyAnswers: protectedProcedure.query(async ({ ctx }) => {
      return getUserAnsweredQuestions(ctx.user.id);
    }),
    getMyScore: protectedProcedure.query(async ({ ctx }) => {
      return getUserScore(ctx.user.id);
    }),
    submitAnswer: protectedProcedure
      .input(z.object({ questionId: z.number(), answer: z.string().length(1) }))
      .mutation(async ({ ctx, input }) => {
        // 检查是否已答过
        const existing = await getUserAnsweredQuestions(ctx.user.id);
        if (existing.some((a) => a.questionId === input.questionId)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "已经回答过这道题了" });
        }

        const questions = await getActiveQuizQuestions();
        const question = questions.find((q) => q.id === input.questionId);
        if (!question) throw new TRPCError({ code: "NOT_FOUND", message: "题目不存在" });

        const isCorrect = question.correctAnswer === input.answer;
        await submitQuizAnswer({
          userId: ctx.user.id,
          questionId: input.questionId,
          answer: input.answer,
          isCorrect,
        });

        return {
          isCorrect,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          reward: isCorrect ? question.reward : 0,
        };
      }),
  }),

  // ===== 奖项 =====
  award: router({
    getAll: publicProcedure.query(async () => {
      return getAwardWithWinners();
    }),
    generateSpeech: publicProcedure
      .input(z.object({ winnerName: z.string(), awardName: z.string(), department: z.string().optional() }))
      .mutation(async ({ input }) => {

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是中易物联集团2026开工盛典的AI颁奖词生成系统。请生成一段优雅、热情、充满仪式感的颁奖词，要体现AI时代的科技感和对获奖者的真诚赞美。颁奖词应在100-150字之间，语言流畅，充满激情。",
            },
            {
              role: "user",
              content: `请为以下获奖者生成颁奖词：
              获奖者：${input.winnerName}
              奖项：${input.awardName}
              ${input.department ? `部门：${input.department}` : ""}
              
              要求：体现AI时代精神，赞美其在工作中的突出贡献，语言优美有力，充满仪式感。`,
            },
          ],
        });

        const speech = (response.choices[0]?.message?.content as string) || "恭喜获奖！";

        // 广播颁奖词到大屏
        try {
          broadcastToClients({
            type: "AWARD_SPEECH",
            data: { winnerName: input.winnerName, awardName: input.awardName, speech },
          });
        } catch (e) {
          console.error("Broadcast failed:", e);
        }

        return { speech };
      }),
  }),

  // ===== 抽奖 =====
  lottery: router({
    getEvents: publicProcedure.query(async () => {
      return getLotteryEvents();
    }),
    getResults: publicProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return getLotteryResults(input.eventId);
      }),
    draw: publicProcedure
      .input(
        z.object({
          eventId: z.number(),
          participants: z.array(z.object({ name: z.string(), department: z.string().optional() })),
        })
      )
      .mutation(async ({ input }) => {

        const events = await getLotteryEvents();
        const event = events.find((e) => e.id === input.eventId);
        if (!event) throw new TRPCError({ code: "NOT_FOUND" });

        const maxWinners = event.maxWinners || 1;
        const shuffled = [...input.participants].sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, Math.min(maxWinners, shuffled.length));

        for (const winner of winners) {
          await saveLotteryResult({
            lotteryEventId: input.eventId,
            winnerName: winner.name,
            department: winner.department,
          });
        }

        // 广播到大屏
        try {
          broadcastToClients({
            type: "LOTTERY_RESULT",
            data: { event, winners },
          });
        } catch (e) {
          console.error("Broadcast failed:", e);
        }

        return { winners };
      }),
    generateGroups: publicProcedure
      .input(
        z.object({
          members: z.array(z.string()),
          groupCount: z.number().min(2).max(10),
        })
      )
      .mutation(async ({ input }) => {

        const FIXED_LEADERS = ["雷总", "王总", "刘总"];
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
        const groupCount = input.groupCount;

        // 分离领导和普通成员
        const leaders = input.members.filter((n) => FIXED_LEADERS.includes(n));
        const others = input.members.filter((n) => !FIXED_LEADERS.includes(n));

        // 随机打乱普通成员
        const shuffled = [...others].sort(() => Math.random() - 0.5);

        // 初始化分组数组
        const groupMembers: string[][] = Array.from({ length: groupCount }, () => []);

        // 固定领导：雷总→第0组，王总→第1组，刘总→第2组（严格不同组）
        leaders.forEach((leader, idx) => {
          groupMembers[idx % groupCount].push(leader);
        });

        // 轮流分配普通成员
        shuffled.forEach((member, idx) => {
          groupMembers[idx % groupCount].push(member);
        });

        const chineseNums = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
        const groups: { groupName: string; members: string; color: string }[] = groupMembers.map((members, i) => ({
          groupName: `第${chineseNums[i] || i + 1}组`,
          members: JSON.stringify(members),
          color: colors[i % colors.length],
        }));

        await saveTeamGroups(groups);

        // 广播到大屏
        try {
          broadcastToClients({
            type: "TEAM_GROUPS",
            data: groups.map((g) => ({ ...g, members: JSON.parse(g.members) })),
          });
        } catch (e) {
          console.error("Broadcast failed:", e);
        }

        return groups.map((g) => ({ ...g, members: JSON.parse(g.members) }));
      }),
    getGroups: publicProcedure.query(async () => {
      const groups = await getTeamGroups();
      return groups.map((g) => ({ ...g, members: JSON.parse(g.members) as string[] }));
    }),
  }),

  // ===== 管理初始化 =====
  admin: router({
    resetEventData: publicProcedure.mutation(async () => {
      await resetEventData();
      return { success: true };
    }),
    // 获取所有注册用户（用于AI分组）
    getRegisteredMembers: publicProcedure.query(async () => {
      const regs = await getAllRegistrations();
      return regs.map((r) => ({ name: r.realName, department: r.department, position: r.position }));
    }),
  }),

  // ===== 活动注册 =====
  registration: router({
    // 获取当前用户注册信息
    getMine: protectedProcedure.query(async ({ ctx }) => {
      return getRegistrationByUserId(ctx.user.id);
    }),
    // 提交注册
    submit: protectedProcedure
      .input(z.object({
        realName: z.string().min(1).max(50),
        department: z.string().min(1).max(100),
        position: z.string().max(100).optional(),
        phone: z.string().max(20).optional(),
        dietaryNeeds: z.string().max(200).optional(),
        expectations: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createRegistration({
          userId: ctx.user.id,
          realName: input.realName,
          department: input.department,
          position: input.position,
          phone: input.phone,
          dietaryNeeds: input.dietaryNeeds,
          expectations: input.expectations,
        });
        return { success: true };
      }),
    // 管理员获取所有注册
    getAll: publicProcedure.query(async () => {
      return getAllRegistrations();
    }),
  }),
});

export type AppRouter = typeof appRouter;
