import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, CheckCircle2, Loader2 } from "lucide-react";

const DEPARTMENTS = ["技术研发部", "产品运营部", "市场营销部", "行政人事部", "财务部", "销售部", "其他"];

const MESSAGES = [
  "2026，AI赋能，乘风破浪！",
  "智启新征程，同心共奋进！",
  "AI时代，我们一起创造未来！",
  "焕新出发，共创佳绩！",
  "团结奋进，AI赋能新征程！",
];

export default function Checkin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState(MESSAGES[0]);
  const [step, setStep] = useState<"form" | "loading" | "success">("form");
  const [checkinResult, setCheckinResult] = useState<{ avatarUrl?: string; userName?: string } | null>(null);

  const { data: myCheckin } = trpc.checkin.getMyCheckin.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const checkinMutation = trpc.checkin.doCheckin.useMutation({
    onSuccess: (data) => {
      setCheckinResult({ avatarUrl: data.checkin?.avatarUrl || "", userName: data.checkin?.userName || "" });
      setStep("success");
      toast.success("签到成功！AI头像已生成并同步到大屏！");
    },
    onError: (err) => {
      setStep("form");
      toast.error(err.message || "签到失败，请重试");
    },
  });

  const handleCheckin = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setStep("loading");
    checkinMutation.mutate({ department, message });
  };

  // 已签到状态
  if (myCheckin && step !== "success") {
    return (
      <div className="min-h-screen bg-deep-gradient flex flex-col">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
        <div className="max-w-md mx-auto px-5 py-8 flex flex-col flex-1">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-8 transition-colors">
            <ArrowLeft size={16} />
            <span className="text-sm">返回首页</span>
          </button>

          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.8 }}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-yellow-400/50 mb-6 mx-auto animate-pulse-gold">
                {myCheckin.avatarUrl ? (
                  <img src={myCheckin.avatarUrl} alt="AI头像" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-yellow-400/20 to-blue-600/20 flex items-center justify-center text-4xl">
                    {myCheckin.userName?.[0] || "✦"}
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="text-green-400" size={20} />
                <span className="text-green-400 font-semibold">签到成功</span>
              </div>
              <h2 className="text-xl font-bold text-gold-gradient mb-1">{myCheckin.userName}</h2>
              {myCheckin.department && <p className="text-white/50 text-sm mb-4">{myCheckin.department}</p>}
              <div className="glass-card border-gold-glow rounded-xl p-4 text-center">
                <p className="text-white/70 text-sm italic">"{myCheckin.message || "欢迎参加2026开工盛典！"}"</p>
              </div>
              <p className="text-white/30 text-xs mt-4">
                签到时间：{new Date(myCheckin.checkedInAt).toLocaleString("zh-CN")}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 w-full space-y-3">
              <button onClick={() => navigate("/schedule")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                查看活动日程
              </button>
              <button onClick={() => navigate("/quiz")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                参与AI问答赢红包
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-gradient flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8 flex flex-col flex-1">
        {/* 顶部导航 */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-8 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              {/* 标题 */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center relative"
                  style={{ background: "radial-gradient(circle, rgba(245,208,96,0.2) 0%, rgba(245,208,96,0.05) 70%)" }}>
                  <Sparkles className="text-yellow-400" size={36} />
                  <div className="absolute inset-0 rounded-full animate-glow-pulse border border-yellow-400/30" />
                </div>
                <h1 className="text-2xl font-bold text-gold-gradient mb-1">AI数字签到</h1>
                <p className="text-white/50 text-sm">签到后将生成专属AI头像，实时显示在大屏</p>
              </div>

              {/* 表单 */}
              {isAuthenticated ? (
                <div className="space-y-4 flex-1">
                  {/* 用户信息 */}
                  <div className="glass-card border-gold-glow rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-lg">
                        {user?.name?.[0] || "✦"}
                      </div>
                      <div>
                        <p className="text-white/90 font-medium">{user?.name || "员工"}</p>
                        <p className="text-white/40 text-xs">已登录</p>
                      </div>
                    </div>
                  </div>

                  {/* 部门选择 */}
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">所在部门</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DEPARTMENTS.map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setDepartment(dept)}
                          className={`py-2 px-2 rounded-lg text-xs transition-all ${
                            department === dept
                              ? "bg-yellow-400/20 border border-yellow-400/50 text-yellow-400"
                              : "glass-card text-white/60 hover:text-white/80"
                          }`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 签到寄语 */}
                  <div>
                    <label className="text-white/60 text-sm mb-2 block">签到寄语</label>
                    <div className="space-y-2">
                      {MESSAGES.map((msg) => (
                        <button
                          key={msg}
                          onClick={() => setMessage(msg)}
                          className={`w-full py-2.5 px-4 rounded-lg text-sm text-left transition-all ${
                            message === msg
                              ? "bg-yellow-400/15 border border-yellow-400/40 text-yellow-300"
                              : "glass-card text-white/60 hover:text-white/80"
                          }`}
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 签到按钮 */}
                  <button
                    onClick={handleCheckin}
                    className="w-full py-4 rounded-2xl font-bold text-lg mt-4 relative overflow-hidden group"
                    style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020 50%, #f5d060 100%)", color: "#050a14" }}
                  >
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                    <span className="relative">✦ 生成AI头像并签到 ✦</span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="text-white/50 text-center mb-6">请先登录才能参与签到</p>
                  <a href={getLoginUrl()} className="w-full py-4 rounded-2xl font-bold text-lg text-center block"
                    style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020 50%, #f5d060 100%)", color: "#050a14" }}>
                    登录参与活动
                  </a>
                </div>
              )}
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full border-2 border-yellow-400/30 flex items-center justify-center">
                  <Loader2 className="text-yellow-400 animate-spin" size={40} />
                </div>
                <div className="absolute inset-0 rounded-full animate-glow-pulse border border-yellow-400/20" />
              </div>
              <h2 className="text-xl font-bold text-gold-gradient mb-3">AI正在生成您的专属头像</h2>
              <p className="text-white/50 text-sm text-center">正在为您创作独一无二的AI数字形象...</p>
              <div className="mt-6 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-yellow-400/60 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </motion.div>
          )}

          {step === "success" && checkinResult && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mb-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-yellow-400/60 animate-pulse-gold mx-auto">
                  {checkinResult.avatarUrl ? (
                    <img src={checkinResult.avatarUrl} alt="AI头像" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-5xl">
                      {checkinResult.userName?.[0] || "✦"}
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-2xl font-bold text-gold-gradient mb-2">签到成功！</h2>
                <p className="text-white/60 text-sm mb-2">{checkinResult.userName}，欢迎参加2026开工盛典</p>
                <p className="text-white/40 text-xs">您的AI头像已实时同步到大屏展示</p>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 w-full space-y-3">
                <button onClick={() => navigate("/schedule")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                  查看今日活动日程
                </button>
                <button onClick={() => navigate("/quiz")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                  参与AI问答赢红包
                </button>
                <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-all">
                  返回首页
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
