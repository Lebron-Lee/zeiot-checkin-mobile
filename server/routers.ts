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
} from "./db";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { broadcastToClients } from "./_core/index";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== 活动配置 =====
  event: router({
    getConfig: publicProcedure.query(async () => {
      return getEventConfig();
    }),
    updateConfig: protectedProcedure
      .input(z.object({ key: z.string(), value: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateEventConfig(input.key, input.value);
        return { success: true };
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
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 检查是否已签到
        const existing = await getCheckinByUserId(ctx.user.id);
        if (existing) return { checkin: existing, isNew: false };

        // 生成AI头像
        let avatarUrl = "";
        let avatarStyle = "ai-digital";
        try {
          const userName = ctx.user.name || "员工";
          const result = await generateImage({
            prompt: `Create a professional AI digital avatar for a tech company employee named ${userName}. 
            Style: Elegant, futuristic, digital art. 
            Features: Abstract geometric patterns, glowing blue/gold circuit elements, professional portrait style.
            Background: Deep dark blue with subtle grid lines and particle effects.
            The avatar should look sophisticated and high-tech, suitable for a corporate AI event.
            No text, no watermarks. Square format, centered portrait.`,
          });
          avatarUrl = result.url || "";
        } catch (e) {
          console.error("Avatar generation failed:", e);
          avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${ctx.user.id}&backgroundColor=0047AB`;
        }

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
    generateSpeech: protectedProcedure
      .input(z.object({ winnerName: z.string(), awardName: z.string(), department: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

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
    draw: protectedProcedure
      .input(
        z.object({
          eventId: z.number(),
          participants: z.array(z.object({ name: z.string(), department: z.string().optional() })),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

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
    generateGroups: protectedProcedure
      .input(
        z.object({
          members: z.array(z.string()),
          groupCount: z.number().min(2).max(10),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });

        const shuffled = [...input.members].sort(() => Math.random() - 0.5);
        const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];
        const groups: { groupName: string; members: string; color: string }[] = [];

        for (let i = 0; i < input.groupCount; i++) {
          const start = Math.floor((i * shuffled.length) / input.groupCount);
          const end = Math.floor(((i + 1) * shuffled.length) / input.groupCount);
          groups.push({
            groupName: `第${["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][i] || i + 1}组`,
            members: JSON.stringify(shuffled.slice(start, end)),
            color: colors[i % colors.length],
          });
        }

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
    getAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllRegistrations();
    }),
  }),
});

export type AppRouter = typeof appRouter;
