import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, CheckCircle2, Brain, Heart, Star } from "lucide-react";

export default function Profile() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { data: myCheckin } = trpc.checkin.getMyCheckin.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myScore } = trpc.quiz.getMyScore.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myAnswers } = trpc.quiz.getMyAnswers.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myWishes } = trpc.wishCard.getMine.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-deep-gradient flex flex-col items-center justify-center px-5">
        <div className="text-5xl mb-4">👤</div>
        <p className="text-white/60 mb-6 text-center">登录后查看个人参与记录</p>
        <a href={getLoginUrl()} className="w-full max-w-sm py-3 rounded-xl font-bold text-center block"
          style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
          登录
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-gradient">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">返回首页</span>
          </button>
          <button onClick={() => logout()} className="flex items-center gap-1.5 text-white/40 hover:text-white/60 text-sm transition-colors">
            <LogOut size={14} />
            退出
          </button>
        </div>

        {/* 用户信息 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-gold-glow rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {myCheckin?.avatarUrl ? (
                <img src={myCheckin.avatarUrl} alt="AI头像" className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400/40" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-2xl border-2 border-yellow-400/20">
                  {user?.name?.[0] || "✦"}
                </div>
              )}
              {myCheckin && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white/90">{user?.name || "员工"}</h2>
              {myCheckin?.department && <p className="text-white/50 text-sm">{myCheckin.department}</p>}
              <p className="text-white/30 text-xs mt-0.5">{user?.email || ""}</p>
            </div>
          </div>
        </motion.div>

        {/* 参与统计 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card rounded-xl p-3 text-center">
            <CheckCircle2 className={`mx-auto mb-1 ${myCheckin ? "text-green-400" : "text-white/20"}`} size={20} />
            <p className="text-white/80 text-xs font-medium">{myCheckin ? "已签到" : "未签到"}</p>
            <p className="text-white/30 text-[10px] mt-0.5">AI签到</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <Brain className="text-yellow-400 mx-auto mb-1" size={20} />
            <p className="text-gold-gradient text-sm font-bold">¥{myScore || 0}</p>
            <p className="text-white/30 text-[10px] mt-0.5">问答红包</p>
          </div>
          <div className="glass-card rounded-xl p-3 text-center">
            <Heart className="text-pink-400 mx-auto mb-1" size={20} />
            <p className="text-white/80 text-xs font-medium">{myWishes?.length || 0} 张</p>
            <p className="text-white/30 text-[10px] mt-0.5">心愿卡</p>
          </div>
        </motion.div>

        {/* 签到信息 */}
        {myCheckin && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="text-green-400" size={16} />
              <span className="text-white/70 text-sm font-medium">签到记录</span>
            </div>
            <p className="text-white/60 text-sm italic mb-1">"{myCheckin.message || "欢迎参加2026开工盛典！"}"</p>
            <p className="text-white/30 text-xs">{new Date(myCheckin.checkedInAt).toLocaleString("zh-CN")}</p>
          </motion.div>
        )}

        {/* 问答记录 */}
        {myAnswers && myAnswers.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="text-yellow-400" size={16} />
              <span className="text-white/70 text-sm font-medium">问答记录</span>
              <span className="ml-auto text-white/40 text-xs">共 {myAnswers.length} 题</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {myAnswers.map((ans, i) => (
                <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${ans.isCorrect ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"}`}>
                  {ans.isCorrect ? "✓" : "✗"}
                </div>
              ))}
            </div>
            <p className="text-white/40 text-xs mt-2">
              答对 {myAnswers.filter(a => a.isCorrect).length} 题，获得 ¥{myScore || 0} 红包
            </p>
          </motion.div>
        )}

        {/* 快速入口 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="space-y-2">
          {!myCheckin && (
            <button onClick={() => navigate("/checkin")} className="w-full py-3 rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
              立即AI签到
            </button>
          )}
          <button onClick={() => navigate("/quiz")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
            参与AI问答赢红包
          </button>
          <button onClick={() => navigate("/wish")} className="w-full py-3 rounded-xl border border-pink-400/30 text-pink-400/80 text-sm hover:bg-pink-400/5 transition-all">
            填写心愿卡
          </button>
        </motion.div>
      </div>
    </div>
  );
}
