import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, XCircle, BookOpen, Trophy, RotateCcw } from "lucide-react";

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

// 答题记录（用于最终总结）
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

// 答对后的粒子动画
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
          style={{
            background: p.color,
            top: "50%",
            left: "50%",
          }}
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

export default function Quiz() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  // 当前题目索引（在未答题列表中的索引）
  const [currentIdx, setCurrentIdx] = useState(0);
  // 用户当前选择（null = 未选）
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  // 提交后的结果（null = 未提交）
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  // 本次会话中已答完的题目ID
  const [localAnsweredIds, setLocalAnsweredIds] = useState<number[]>([]);
  // 本次答题记录（用于总结页）
  const [answerHistory, setAnswerHistory] = useState<AnswerRecord[]>([]);
  // 是否显示总结页
  const [showSummary, setShowSummary] = useState(false);
  // 答对后粒子效果
  const [showParticles, setShowParticles] = useState(false);
  // 防止重复提交
  const submittingRef = useRef(false);

  const { data: questions = [] } = trpc.quiz.getQuestions.useQuery();
  const { data: myAnswers = [], refetch: refetchAnswers } = trpc.quiz.getMyAnswers.useQuery(undefined, {
    enabled: isAuthenticated,
  });

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
        // 答对：短暂显示正确提示后自动跳下一题
        setTimeout(() => {
          goNextQuestion(result);
        }, 1200);
      }
      // 答错：停留在当前题目，显示解析，等待用户点击"知道了，下一题"
      refetchAnswers();
    },
    onError: (err) => {
      submittingRef.current = false;
      toast.error(err.message || "提交失败，请重试");
    },
  });

  const allQuestions = questions as unknown as Question[];

  // 服务端已答题ID集合
  const serverAnsweredIds = new Set((myAnswers as { questionId: number }[]).map((a) => a.questionId));
  // 合并服务端和本地已答ID
  const allAnsweredIds = new Set([...Array.from(serverAnsweredIds), ...localAnsweredIds]);
  // 未答题列表
  const unanswered = allQuestions.filter((q) => !allAnsweredIds.has(q.id));

  // 当前题目（基于索引，但索引越界时取第一题）
  const safeIdx = currentIdx < unanswered.length ? currentIdx : 0;
  const currentQ = unanswered[safeIdx] ?? null;

  const totalAnswered = allAnsweredIds.size;
  const totalQuestions = allQuestions.length;
  const correctCount = answerHistory.filter((r) => r.isCorrect).length;

  // 进入下一题的逻辑（由答对自动触发，或答错手动触发）
  const goNextQuestion = useCallback((result: AnswerResult) => {
    if (!currentQ) return;

    // 记录本题答题历史
    setAnswerHistory((prev) => [
      ...prev,
      {
        questionId: currentQ.id,
        question: currentQ.question,
        selectedAnswer: selectedAnswer || "",
        correctAnswer: result.correctAnswer,
        isCorrect: result.isCorrect,
        explanation: result.explanation,
      },
    ]);

    // 将当前题加入本地已答列表
    setLocalAnsweredIds((prev) => [...prev, currentQ.id]);

    // 重置答题状态
    setSelectedAnswer(null);
    setAnswerResult(null);

    // 检查是否还有未答题
    const nextUnanswered = unanswered.filter((q) => q.id !== currentQ.id);
    if (nextUnanswered.length === 0) {
      // 全部答完，显示总结
      setShowSummary(true);
    } else {
      setCurrentIdx((prev) => (prev < nextUnanswered.length ? prev : 0));
    }
  }, [currentQ, selectedAnswer, unanswered]);

  // 选择答案（只在未提交时有效）
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
    goNextQuestion(answerResult);
  };

  // 检查是否一开始就全部答完了（服务端数据）
  useEffect(() => {
    if (allQuestions.length > 0 && unanswered.length === 0 && localAnsweredIds.length === 0 && !showSummary) {
      setShowSummary(true);
    }
  }, [allQuestions.length, unanswered.length, localAnsweredIds.length, showSummary]);

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
    const sessionCorrect = answerHistory.filter((r) => r.isCorrect).length;
    const sessionTotal = answerHistory.length;
    const serverTotal = (myAnswers as { isCorrect: boolean }[]).length;
    const serverCorrect = (myAnswers as { isCorrect: boolean }[]).filter((a) => a.isCorrect).length;
    const totalCorrectAll = serverCorrect + sessionCorrect - answerHistory.filter((r) => {
      // 避免重复计算（本次答题的题目可能已在服务端记录）
      return (myAnswers as { questionId: number; isCorrect: boolean }[]).some(
        (a) => a.questionId === r.questionId && a.isCorrect
      );
    }).length;
    const totalAnsweredAll = Math.max(serverTotal, totalAnswered);
    const accuracy = totalAnsweredAll > 0 ? Math.round((totalCorrectAll / totalAnsweredAll) * 100) : 0;

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

          {/* 总结卡 */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-gold-glow rounded-2xl p-6 mb-4 text-center">
            <div className="text-5xl mb-3">{levelInfo.emoji}</div>
            <h2 className="text-2xl font-bold text-gold-gradient mb-1">答题完成！</h2>
            <p className={`text-lg font-semibold ${levelInfo.color} mb-4`}>{levelInfo.label}</p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "答题总数", value: totalAnsweredAll, unit: "题" },
                { label: "答对数量", value: totalCorrectAll, unit: "题" },
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
                        <div className="flex items-center gap-1.5 text-xs">
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
            <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl btn-gold font-bold">
              返回首页
            </button>
            {unanswered.length > 0 && (
              <button
                onClick={() => { setShowSummary(false); setCurrentIdx(0); }}
                className="w-full py-3 rounded-xl glass-card text-white/60 text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw size={14} />继续答题（还有 {unanswered.length} 题）
              </button>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ===== 答题页 =====
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center">
        <div className="text-white/50 text-sm">加载题目中...</div>
      </div>
    );
  }

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
            {totalAnswered}/{totalQuestions}
          </div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #e8001d, #ffd700)" }}
            animate={{ width: `${(totalAnswered / Math.max(totalQuestions, 1)) * 100}%` }}
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
            {/* 粒子效果（答对时） */}
            {showParticles && <CorrectParticles />}

            {/* AI标签 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 mb-3">
              <span className="text-yellow-300 text-xs font-medium">🤖 第 {totalAnswered + 1} 题</span>
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

            {/* 答错后的解析区域（答对时不显示，自动跳转） */}
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
                    {/* 错误提示 */}
                    <div className="flex items-center gap-2 mb-3">
                      <XCircle size={18} className="text-red-400 flex-shrink-0" />
                      <div>
                        <span className="text-red-300 font-semibold text-sm">回答错误</span>
                        <span className="text-white/40 text-xs ml-2">
                          正确答案是 <span className="text-green-300 font-bold">{answerResult.correctAnswer}</span>
                        </span>
                      </div>
                    </div>

                    {/* 知识解析 */}
                    {answerResult.explanation && (
                      <div className="bg-black/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <BookOpen size={12} className="text-yellow-400" />
                          <span className="text-yellow-300 text-xs font-semibold">知识解析</span>
                        </div>
                        <p className="text-white/75 text-sm leading-relaxed">{answerResult.explanation}</p>
                      </div>
                    )}

                    {/* 下一题按钮 */}
                    <button
                      onClick={handleNextManual}
                      className="w-full mt-3 py-3 rounded-xl btn-festive font-bold text-sm"
                    >
                      知道了，下一题 →
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
                    <span className="text-green-300 font-bold">回答正确！即将进入下一题...</span>
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
            <span className="text-yellow-400/50 text-xs">本次答对 {correctCount} 题</span>
          </div>
        </div>
      </div>
    </div>
  );
}
