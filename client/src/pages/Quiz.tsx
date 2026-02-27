import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, Trophy, RotateCcw } from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";

type Question = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type AnswerResult = {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
};

type AnswerRecord = {
  questionId: number;
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string | null;
};

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = ["optionA", "optionB", "optionC", "optionD"] as const;
const SESSION_SIZE = 10; // 每次会话题目数

function CorrectParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360,
    color: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#ff6b6b" : "#4ecdc4",
  }));
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ background: p.color, top: "50%", left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos((p.angle * Math.PI) / 180) * 80,
            y: Math.sin((p.angle * Math.PI) / 180) * 80,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// 从数组中随机选取n个元素
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

export default function Quiz() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // 本次会话的10道题（固定，不随答题变化）
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  // 当前题目在 sessionQuestions 中的索引
  const [currentIdx, setCurrentIdx] = useState(0);
  // 用户当前选择
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  // 提交后的结果
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  // 本次会话答题记录
  const [answerHistory, setAnswerHistory] = useState<AnswerRecord[]>([]);
  // 是否显示总结页
  const [showSummary, setShowSummary] = useState(false);
  // 答对后粒子效果
  const [showParticles, setShowParticles] = useState(false);
  // 防止重复提交
  const submittingRef = useRef(false);
  // 是否已初始化会话题目
  const sessionInitialized = useRef(false);

  const { data: questions = [] } = trpc.quiz.getQuestions.useQuery();
  const { data: myAnswers = [], refetch: refetchAnswers } = trpc.quiz.getMyAnswers.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const allQuestions = questions as unknown as Question[];

  // 初始化会话：从所有题中随机选10题（只初始化一次）
  useEffect(() => {
    if (allQuestions.length > 0 && !sessionInitialized.current) {
      sessionInitialized.current = true;
      const picked = pickRandom(allQuestions, SESSION_SIZE);
      setSessionQuestions(picked);
      setCurrentIdx(0);
    }
  }, [allQuestions]);

  const submitMutation = trpc.quiz.submitAnswer.useMutation({
    onSuccess: (data) => {
      submittingRef.current = false;
      const result: AnswerResult = {
        isCorrect: data.isCorrect,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation ?? null,
      };
      setAnswerResult(result);

      if (data.isCorrect) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 1000);
        // 答对：1.2秒后自动进入下一题
        setTimeout(() => {
          advanceToNext(result);
        }, 1200);
      }
      // 答错：停留，等用户点"知道了，下一题"
      refetchAnswers();
    },
    onError: (err) => {
      submittingRef.current = false;
      toast.error(err.message || "提交失败，请重试");
    },
  });

  // 当前题目
  const currentQ = sessionQuestions[currentIdx] ?? null;
  // 本次会话进度
  const sessionAnswered = answerHistory.length;
  const sessionTotal = sessionQuestions.length || SESSION_SIZE;
  // 本次答对数
  const correctCount = answerHistory.filter((r) => r.isCorrect).length;

  // 进入下一题（或结束会话）
  const advanceToNext = useCallback((result: AnswerResult) => {
    setAnswerHistory((prev) => {
      const currentQuestion = sessionQuestions[currentIdx];
      if (!currentQuestion) return prev;
      const sel = selectedAnswer || "";
      return [
        ...prev,
        {
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          selectedAnswer: sel,
          correctAnswer: result.correctAnswer,
          isCorrect: result.isCorrect,
          explanation: result.explanation,
        },
      ];
    });

    setSelectedAnswer(null);
    setAnswerResult(null);

    const nextIdx = currentIdx + 1;
    if (nextIdx >= sessionQuestions.length) {
      // 全部答完，显示总结
      setShowSummary(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  }, [currentIdx, sessionQuestions, selectedAnswer]);

  // 选择答案
  const handleSelect = useCallback((label: string) => {
    if (answerResult !== null || submitMutation.isPending) return;
    setSelectedAnswer(label);
  }, [answerResult, submitMutation.isPending]);

  // 提交答案
  const handleSubmit = () => {
    if (!selectedAnswer || !currentQ || answerResult !== null || submittingRef.current) return;
    submittingRef.current = true;
    submitMutation.mutate({ questionId: currentQ.id, answer: selectedAnswer });
  };

  // 手动点击"知道了，下一题"（仅答错时显示）
  const handleNextManual = () => {
    if (!answerResult) return;
    advanceToNext(answerResult);
  };

  // 开始新一轮
  const handleNewSession = () => {
    sessionInitialized.current = false;
    const picked = pickRandom(allQuestions, SESSION_SIZE);
    setSessionQuestions(picked);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setAnswerHistory([]);
    setShowSummary(false);
  };

  const getOptionStyle = (label: string) => {
    if (answerResult === null) {
      return selectedAnswer === label
        ? { background: "rgba(180,30,30,0.55)", border: "1.5px solid rgba(255,100,100,0.7)" }
        : { background: "rgba(139,26,26,0.35)", border: "1px solid rgba(255,215,0,0.15)" };
    }
    if (label === answerResult.correctAnswer) {
      return { background: "rgba(34,197,94,0.22)", border: "1.5px solid rgba(34,197,94,0.7)" };
    }
    if (label === selectedAnswer && label !== answerResult.correctAnswer) {
      return { background: "rgba(239,68,68,0.22)", border: "1.5px solid rgba(239,68,68,0.7)" };
    }
    return { background: "rgba(139,26,26,0.18)", border: "1px solid rgba(255,215,0,0.08)" };
  };

  // ===== 未登录 =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center p-4">
        <div className="glass-card border-gold-glow rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-white mb-2">请先登录</h2>
          <p className="text-white/60 text-sm mb-6">登录后参与AI知识问答</p>
          <button onClick={() => navigate("/register")} className="block w-full py-3 rounded-xl btn-festive text-center font-bold">
            立即注册 / 登录
          </button>
        </div>
      </div>
    );
  }

  // ===== 总结页 =====
  if (showSummary) {
    const accuracy = sessionTotal > 0 ? Math.round((correctCount / sessionTotal) * 100) : 0;
    const levelInfo =
      accuracy >= 90 ? { label: "AI大师", emoji: "🏆", color: "text-yellow-400" }
      : accuracy >= 70 ? { label: "AI达人", emoji: "⭐", color: "text-blue-400" }
      : accuracy >= 50 ? { label: "AI学徒", emoji: "📚", color: "text-green-400" }
      : { label: "AI新手", emoji: "🌱", color: "text-white/60" };

    return (
      <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto px-4 py-6 pb-10">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-5 transition-colors text-sm">
            <ArrowLeft size={15} />返回首页
          </button>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-gold-glow rounded-2xl p-6 mb-4 text-center">
            <div className="text-5xl mb-3">{levelInfo.emoji}</div>
            <h2 className="text-2xl font-bold text-gold-gradient mb-1">答题完成！</h2>
            <p className={`text-lg font-semibold ${levelInfo.color} mb-4`}>{levelInfo.label}</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "本轮题数", value: sessionTotal, unit: "题" },
                { label: "答对数量", value: correctCount, unit: "题" },
                { label: "正确率", value: `${accuracy}`, unit: "%" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3">
                  <div className="text-2xl font-bold text-gold-gradient">{stat.value}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">{stat.unit} {stat.label}</div>
                </div>
              ))}
            </div>

            <p className="text-white/50 text-xs leading-relaxed">
              AI时代，持续学习是最好的竞争力。<br />期待您在工作中探索更多AI应用场景！
            </p>
          </motion.div>

          {/* 本次答题详情 */}
          {answerHistory.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-yellow-400" />
                <span className="text-white/70 text-sm font-medium">本次答题回顾</span>
                <span className="text-white/30 text-xs">（{answerHistory.length} 题）</span>
              </div>
              <div className="space-y-2">
                {answerHistory.map((record, idx) => (
                  <motion.div
                    key={record.questionId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className={`rounded-xl p-3.5 border ${
                      record.isCorrect
                        ? "bg-green-900/20 border-green-500/25"
                        : "bg-red-900/20 border-red-500/25"
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {record.isCorrect
                        ? <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                        : <XCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                      }
                      <p className="text-white/85 text-xs leading-relaxed flex-1">{record.question}</p>
                    </div>
                    {!record.isCorrect && (
                      <div className="ml-5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="text-red-400/70">你的答案：</span>
                          <span className="text-red-300 font-medium">{record.selectedAnswer}</span>
                          <span className="text-white/30 mx-1">·</span>
                          <span className="text-green-400/70">正确答案：</span>
                          <span className="text-green-300 font-medium">{record.correctAnswer}</span>
                        </div>
                        {record.explanation && (
                          <p className="text-yellow-300/70 text-[11px] leading-relaxed">
                            💡 {record.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-5 space-y-2">
            <button
              onClick={handleNewSession}
              className="w-full py-3 rounded-xl btn-festive font-bold flex items-center justify-center gap-2"
            >
              <RotateCcw size={15} />再来一轮（随机10题）
            </button>
            <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl glass-card text-white/60 text-sm">
              返回首页
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ===== 加载中 =====
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center">
        <div className="text-white/50 text-sm">加载题目中...</div>
      </div>
    );
  }

  // ===== 答题页 =====
  return (
    <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-5">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-white/50 text-sm hover:text-white/80 transition-colors">
            <ArrowLeft size={15} />返回
          </button>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm">🤖</span>
            <span className="text-white/80 text-sm font-semibold">AI知识问答</span>
          </div>
          <div className="text-white/40 text-xs">
            {sessionAnswered + 1}/{sessionTotal}
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #e8001d, #ffd700)" }}
            animate={{ width: `${((sessionAnswered) / Math.max(sessionTotal, 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="relative"
          >
            {showParticles && <CorrectParticles />}

            {/* AI标签 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 mb-3">
              <span className="text-yellow-300 text-xs font-medium">🤖 第 {sessionAnswered + 1} 题 / 共 {sessionTotal} 题</span>
            </div>

            {/* 题目 */}
            <div className="glass-card border-gold-glow rounded-2xl p-5 mb-4">
              <p className="text-white text-[15px] leading-relaxed font-medium">{currentQ.question}</p>
            </div>

            {/* 选项 */}
            <div className="space-y-2.5 mb-4">
              {OPTION_LABELS.map((label, i) => {
                const key = OPTION_KEYS[i];
                const text = currentQ[key as keyof Question] as string;
                const isCorrectOpt = answerResult !== null && label === answerResult.correctAnswer;
                const isWrongSel = answerResult !== null && label === selectedAnswer && label !== answerResult.correctAnswer;

                return (
                  <motion.button
                    key={label}
                    onClick={() => handleSelect(label)}
                    disabled={answerResult !== null || submitMutation.isPending}
                    whileTap={answerResult === null ? { scale: 0.98 } : {}}
                    className="w-full text-left p-3.5 rounded-xl transition-all flex items-start gap-3"
                    style={getOptionStyle(label)}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isCorrectOpt ? "bg-green-500 text-white"
                      : isWrongSel ? "bg-red-500 text-white"
                      : selectedAnswer === label && answerResult === null ? "bg-red-700 text-white"
                      : "bg-white/10 text-white/60"
                    }`}>
                      {isCorrectOpt ? "✓" : isWrongSel ? "✗" : label}
                    </span>
                    <span className={`text-sm leading-relaxed pt-0.5 ${
                      isCorrectOpt ? "text-green-300 font-medium"
                      : isWrongSel ? "text-red-300"
                      : "text-white/90"
                    }`}>{text}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* 答错后的解析区域 */}
            <AnimatePresence>
              {answerResult !== null && !answerResult.isCorrect && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className="rounded-2xl p-4 border border-red-500/30 bg-red-900/20">
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle size={18} className="text-red-400 flex-shrink-0" />
                      <div>
                        <span className="text-red-300 font-semibold text-sm">回答错误</span>
                        <span className="text-white/40 text-xs ml-2">
                          正确答案是 <span className="text-green-300 font-bold">{answerResult.correctAnswer}</span>
                        </span>
                      </div>
                    </div>

                    {answerResult.explanation && (
                      <div className="bg-black/20 rounded-xl p-3 mb-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookOpen size={12} className="text-yellow-400" />
                          <span className="text-yellow-300 text-xs font-semibold">知识解析</span>
                        </div>
                        <p className="text-white/75 text-sm leading-relaxed">{answerResult.explanation}</p>
                      </div>
                    )}

                    <button
                      onClick={handleNextManual}
                      className="w-full py-3 rounded-xl btn-festive font-bold text-sm"
                    >
                      {currentIdx + 1 >= sessionQuestions.length ? "查看本轮总结 →" : "知道了，下一题 →"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 答对后的短暂提示 */}
            <AnimatePresence>
              {answerResult !== null && answerResult.isCorrect && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mb-4 rounded-2xl p-4 border border-green-500/40 bg-green-900/25 text-center"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} className="text-green-400" />
                    <span className="text-green-300 font-bold">
                      {currentIdx + 1 >= sessionQuestions.length ? "回答正确！正在统计结果..." : "回答正确！即将进入下一题..."}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 提交按钮（未提交时显示） */}
            {answerResult === null && (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitMutation.isPending}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${
                  selectedAnswer && !submitMutation.isPending ? "btn-festive" : "btn-disabled cursor-not-allowed opacity-50"
                }`}
              >
                {submitMutation.isPending ? "提交中..." : "确认答案"}
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 底部提示 */}
        <div className="flex items-center justify-between mt-5">
          <p className="text-white/25 text-xs">AI时代，学习是最好的投资</p>
          <div className="flex items-center gap-1">
            <Trophy size={11} className="text-yellow-400/50" />
            <span className="text-yellow-400/50 text-xs">本轮答对 {correctCount} 题</span>
          </div>
        </div>
      </div>
    </div>
  );
}
