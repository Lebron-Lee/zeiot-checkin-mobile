import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Question = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
};

const OPTION_LABELS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = ["optionA", "optionB", "optionC", "optionD"] as const;

export default function Quiz() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [localAnsweredIds, setLocalAnsweredIds] = useState<Set<number>>(new Set());

  const { data: questions = [] } = trpc.quiz.getQuestions.useQuery();
  const { data: myAnswers = [], refetch: refetchAnswers } = trpc.quiz.getMyAnswers.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitMutation = trpc.quiz.submitAnswer.useMutation({
    onSuccess: (data) => {
      setIsCorrect(data.isCorrect);
      setShowResult(true);
      if (data.isCorrect) {
        setCorrectCount((prev) => prev + 1);
        toast.success("🎉 回答正确！");
      } else {
        toast.error("❌ 回答错误，看看解析吧～");
      }
      refetchAnswers();
    },
    onError: (err) => toast.error(err.message),
  });

  const allQuestions = (questions as unknown) as Question[];
  const serverAnsweredIds = new Set((myAnswers as { questionId: number }[]).map((a) => a.questionId));
  const unanswered = allQuestions.filter((q) => !serverAnsweredIds.has(q.id) && !Array.from(localAnsweredIds).includes(q.id));
  const currentQ = unanswered[currentIdx] ?? null;

  const handleSelect = (label: string) => {
    if (showResult || submitMutation.isPending) return;
    setSelectedAnswer(label);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || !currentQ) return;
    submitMutation.mutate({ questionId: currentQ.id, answer: selectedAnswer });
  };

  const handleNext = () => {
    if (!currentQ) return;
    setLocalAnsweredIds((prev) => new Set(Array.from(prev).concat(currentQ.id)));
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    if (currentIdx >= unanswered.length - 1) {
      setCurrentIdx(0);
    } else {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const getOptionStyle = (label: string) => {
    if (!showResult) {
      return selectedAnswer === label
        ? { background: "rgba(180,30,30,0.55)", border: "1px solid rgba(255,100,100,0.6)" }
        : { background: "rgba(139,26,26,0.35)", border: "1px solid rgba(255,215,0,0.15)" };
    }
    if (label === currentQ?.correctAnswer) {
      return { background: "rgba(34,197,94,0.25)", border: "1px solid rgba(34,197,94,0.6)" };
    }
    if (label === selectedAnswer && label !== currentQ?.correctAnswer) {
      return { background: "rgba(239,68,68,0.25)", border: "1px solid rgba(239,68,68,0.6)" };
    }
    return { background: "rgba(139,26,26,0.2)", border: "1px solid rgba(255,215,0,0.08)" };
  };

  const totalAnswered = serverAnsweredIds.size + localAnsweredIds.size;
  const allDone = unanswered.length === 0 && totalAnswered > 0;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center p-4">
        <div className="glass-card border-gold-glow rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-white mb-2">请先登录</h2>
          <p className="text-white/60 text-sm mb-6">登录后参与AI知识问答</p>
          <a href={getLoginUrl()} className="block w-full py-3 rounded-xl btn-festive text-center font-bold">立即登录</a>
        </div>
      </div>
    );
  }

  if (allDone || !currentQ) {
    return (
      <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto px-4 py-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 text-sm mb-6 hover:text-white/90">← 返回首页</button>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border-gold-glow rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gold-gradient mb-2">答题完成！</h2>
            <p className="text-white/70 text-sm mb-6">感谢参与AI知识问答，希望对您有所启发</p>
            <div className="glass-card rounded-xl p-4 mb-6">
              <div className="text-4xl font-bold text-gold-gradient">{correctCount}</div>
              <div className="text-white/50 text-sm mt-1">本次答对题数</div>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              AI时代，持续学习是最好的竞争力。<br />期待您在工作中探索更多AI应用场景！
            </p>
            <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl btn-gold font-bold">返回首页</button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 text-sm hover:text-white/90">← 返回</button>
          <div className="flex items-center gap-2">
            <span className="text-yellow-400">🤖</span>
            <span className="text-white/80 text-sm font-semibold">AI知识问答</span>
          </div>
          <div className="text-white/50 text-sm">{totalAnswered}/{allQuestions.length}</div>
        </div>

        {/* 进度条 */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "linear-gradient(90deg, #e8001d, #ffd700)" }}
            animate={{ width: `${(totalAnswered / Math.max(allQuestions.length, 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            {/* AI标签 */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 mb-3">
              <span className="text-yellow-300 text-xs">🤖 AI知识</span>
            </div>

            {/* 题目 */}
            <div className="glass-card border-gold-glow rounded-2xl p-5 mb-4">
              <p className="text-white text-base leading-relaxed font-medium">{currentQ.question}</p>
            </div>

            {/* 选项 */}
            <div className="space-y-3 mb-4">
              {OPTION_LABELS.map((label, i) => {
                const key = OPTION_KEYS[i];
                const text = currentQ[key as keyof Question] as string;
                const isCorrectOpt = showResult && label === currentQ.correctAnswer;
                const isWrongSel = showResult && label === selectedAnswer && label !== currentQ.correctAnswer;

                return (
                  <motion.button
                    key={label}
                    onClick={() => handleSelect(label)}
                    disabled={showResult}
                    whileTap={!showResult ? { scale: 0.98 } : {}}
                    className="w-full text-left p-4 rounded-xl transition-all flex items-start gap-3"
                    style={getOptionStyle(label)}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      isCorrectOpt ? "bg-green-500 text-white"
                      : isWrongSel ? "bg-red-500 text-white"
                      : selectedAnswer === label && !showResult ? "bg-red-700 text-white"
                      : "bg-white/10 text-white/60"
                    }`}>
                      {isCorrectOpt ? "✓" : isWrongSel ? "✗" : label}
                    </span>
                    <span className={`text-sm leading-relaxed ${
                      isCorrectOpt ? "text-green-300 font-medium"
                      : isWrongSel ? "text-red-300"
                      : "text-white/90"
                    }`}>{text}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* 解析 */}
            <AnimatePresence>
              {showResult && currentQ.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 overflow-hidden"
                >
                  <div className={`rounded-xl p-4 ${isCorrect ? "border border-green-500/30 bg-green-900/20" : "border border-red-500/30 bg-red-900/20"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{isCorrect ? "✅" : "❌"}</span>
                      <span className={`text-sm font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
                        {isCorrect ? "回答正确！" : `正确答案是 ${currentQ.correctAnswer}`}
                      </span>
                    </div>
                    <div className="border-t border-white/10 pt-3 mt-2">
                      <p className="text-yellow-300/80 text-xs font-medium mb-1.5">📖 知识解析</p>
                      <p className="text-white/75 text-sm leading-relaxed">{currentQ.explanation}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 按钮 */}
            {!showResult ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitMutation.isPending}
                className={`w-full py-4 rounded-xl font-bold text-base transition-all ${selectedAnswer ? "btn-festive" : "btn-disabled cursor-not-allowed"}`}
              >
                {submitMutation.isPending ? "提交中..." : "确认答案"}
              </button>
            ) : (
              <button onClick={handleNext} className="w-full py-4 rounded-xl btn-gold font-bold text-base">
                下一题 →
              </button>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-white/25 text-xs mt-5">AI时代，学习是最好的投资 · 共 {allQuestions.length} 道题</p>
      </div>
    </div>
  );
}
