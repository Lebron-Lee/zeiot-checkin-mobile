import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Brain, CheckCircle2, XCircle, Trophy, Coins } from "lucide-react";

export default function Quiz() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{ isCorrect: boolean; correctAnswer: string; explanation: string | null; reward: number | null } | null>(null);
  const [totalEarned, setTotalEarned] = useState(0);

  const { data: questions } = trpc.quiz.getQuestions.useQuery();
  const { data: myAnswers, refetch: refetchAnswers } = trpc.quiz.getMyAnswers.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myScore } = trpc.quiz.getMyScore.useQuery(undefined, { enabled: isAuthenticated });

  const submitMutation = trpc.quiz.submitAnswer.useMutation({
    onSuccess: (data) => {
      setResult(data);
      if (data.isCorrect) {
        setTotalEarned((prev) => prev + (data.reward || 0));
        toast.success(`回答正确！获得 ¥${data.reward} 红包！`);
      } else {
        toast.error("回答错误，继续加油！");
      }
      refetchAnswers();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const answeredIds = new Set(myAnswers?.map((a) => a.questionId) || []);
  const unansweredQuestions = questions?.filter((q) => !answeredIds.has(q.id)) || [];
  const currentQuestion = unansweredQuestions[currentIdx];

  const handleSelectAnswer = (answer: string) => {
    if (result || !currentQuestion) return;
    setSelectedAnswer(answer);
    submitMutation.mutate({ questionId: currentQuestion.id, answer });
  };

  const handleNext = () => {
    setSelectedAnswer(null);
    setResult(null);
    if (currentIdx < unansweredQuestions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];
  const options = currentQuestion
    ? [currentQuestion.optionA, currentQuestion.optionB, currentQuestion.optionC, currentQuestion.optionD]
    : [];

  return (
    <div className="min-h-screen bg-deep-gradient">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        {/* 标题 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-yellow-400" size={24} />
            <h1 className="text-2xl font-bold text-gold-gradient">AI知识问答</h1>
          </div>
          <p className="text-white/40 text-sm">答对每题获得 ¥50 红包奖励</p>
        </motion.div>

        {!isAuthenticated ? (
          <div className="glass-card border-gold-glow rounded-2xl p-8 text-center">
            <Brain className="text-yellow-400 mx-auto mb-4" size={48} />
            <p className="text-white/60 mb-6">登录后参与问答赢红包</p>
            <a href={getLoginUrl()} className="block w-full py-3 rounded-xl font-bold text-center"
              style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
              登录参与
            </a>
          </div>
        ) : (
          <>
            {/* 积分卡 */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card border-gold-glow rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-400/20 flex items-center justify-center">
                  <Coins className="text-yellow-400" size={20} />
                </div>
                <div>
                  <p className="text-white/50 text-xs">累计获得红包</p>
                  <p className="text-gold-gradient font-bold text-xl">¥{(myScore || 0) + totalEarned}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs">已答题</p>
                <p className="text-white/80 font-bold">{answeredIds.size} / {questions?.length || 0}</p>
              </div>
            </motion.div>

            {/* 全部答完 */}
            {unansweredQuestions.length === 0 ? (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card border-gold-glow rounded-2xl p-8 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gold-gradient mb-2">全部答完啦！</h2>
                <p className="text-white/60 text-sm mb-2">共答对 {myAnswers?.filter(a => a.isCorrect).length || 0} 题</p>
                <p className="text-yellow-400 font-bold text-lg">累计获得 ¥{myScore || 0} 红包</p>
                <button onClick={() => navigate("/")} className="mt-6 w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm">
                  返回首页
                </button>
              </motion.div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div key={currentQuestion?.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {/* 进度 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/40 text-xs">第 {currentIdx + 1} / {unansweredQuestions.length} 题</span>
                    <div className="flex gap-1">
                      {unansweredQuestions.map((_, i) => (
                        <div key={i} className={`h-1 w-6 rounded-full ${i === currentIdx ? "bg-yellow-400" : "bg-white/20"}`} />
                      ))}
                    </div>
                  </div>

                  {/* 题目 */}
                  <div className="glass-card border-gold-glow rounded-2xl p-5 mb-4">
                    <p className="text-white/90 text-base leading-relaxed font-medium">{currentQuestion?.question}</p>
                  </div>

                  {/* 选项 */}
                  <div className="space-y-3 mb-4">
                    {options.map((option, i) => {
                      const label = optionLabels[i];
                      const isSelected = selectedAnswer === label;
                      const isCorrect = result?.correctAnswer === label;
                      const isWrong = isSelected && !result?.isCorrect;

                      let btnClass = "w-full p-4 rounded-xl text-left transition-all flex items-start gap-3 ";
                      if (result) {
                        if (isCorrect) btnClass += "bg-green-400/20 border border-green-400/50";
                        else if (isWrong) btnClass += "bg-red-400/20 border border-red-400/50";
                        else btnClass += "glass-card opacity-50";
                      } else {
                        btnClass += isSelected ? "bg-yellow-400/20 border border-yellow-400/50" : "glass-card hover:border-yellow-400/30";
                      }

                      return (
                        <button key={label} onClick={() => handleSelectAnswer(label)} disabled={!!result || submitMutation.isPending} className={btnClass}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                            result ? (isCorrect ? "bg-green-400 text-white" : isWrong ? "bg-red-400 text-white" : "bg-white/10 text-white/40")
                              : isSelected ? "bg-yellow-400 text-gray-900" : "bg-white/10 text-white/60"
                          }`}>{label}</span>
                          <span className={`text-sm leading-relaxed ${result ? (isCorrect ? "text-green-300" : isWrong ? "text-red-300" : "text-white/40") : "text-white/80"}`}>
                            {option}
                          </span>
                          {result && isCorrect && <CheckCircle2 className="text-green-400 ml-auto flex-shrink-0" size={18} />}
                          {result && isWrong && <XCircle className="text-red-400 ml-auto flex-shrink-0" size={18} />}
                        </button>
                      );
                    })}
                  </div>

                  {/* 结果解析 */}
                  <AnimatePresence>
                    {result && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-xl p-4 mb-4 ${result.isCorrect ? "bg-green-400/10 border border-green-400/30" : "bg-red-400/10 border border-red-400/30"}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {result.isCorrect ? <CheckCircle2 className="text-green-400" size={18} /> : <XCircle className="text-red-400" size={18} />}
                          <span className={`font-semibold text-sm ${result.isCorrect ? "text-green-400" : "text-red-400"}`}>
                            {result.isCorrect ? `回答正确！获得 ¥${result.reward} 红包` : "回答错误"}
                          </span>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed">{result.explanation}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 下一题 */}
                  {result && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={handleNext}
                      className="w-full py-3 rounded-xl font-bold text-sm"
                      style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
                      {currentIdx < unansweredQuestions.length - 1 ? "下一题 →" : "查看成绩"}
                    </motion.button>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  );
}
