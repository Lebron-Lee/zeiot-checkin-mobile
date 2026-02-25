import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "overview" | "checkins" | "awards" | "lottery" | "wishes";

const EMPLOYEES = [
  "张伟", "李娜", "王芳", "刘洋", "陈静", "杨磊", "赵敏", "黄强",
  "周婷", "吴杰", "徐慧", "孙浩", "马丽", "朱峰", "胡雪", "郭明",
  "何丽", "高鹏", "林芳", "罗勇", "梁静", "宋涛", "唐敏", "韩磊", "冯丽",
];

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [winnerName, setWinnerName] = useState("");
  const [selectedAward, setSelectedAward] = useState("");
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [lotteryCount, setLotteryCount] = useState(1);
  const [lotteryResult, setLotteryResult] = useState<string[]>([]);
  const [groupCount, setGroupCount] = useState(4);
  const [groupResult, setGroupResult] = useState<{ groupName: string; members: string[]; color: string }[]>([]);

  const { data: checkins = [] } = trpc.checkin.getAll.useQuery();
  const { data: awards = [] } = trpc.award.getAll.useQuery();
  const { data: wishes = [] } = trpc.wishCard.getAll.useQuery();
  const { data: registrations = [] } = trpc.registration.getAll.useQuery(undefined, { enabled: isAuthenticated });

  const generateSpeechMutation = trpc.award.generateSpeech.useMutation({
    onSuccess: (data) => {
      setGeneratedSpeech(data.speech);
      toast.success("✨ AI颁奖词已生成！");
    },
    onError: (e) => toast.error("生成失败：" + e.message),
  });

  const drawMutation = trpc.lottery.draw.useMutation({
    onSuccess: (data) => {
      const names = data.winners.map((w: { name: string }) => w.name);
      setLotteryResult(names);
      toast.success(`🎉 中奖：${names.join("、")}`);
    },
    onError: (e) => toast.error("抽奖失败：" + e.message),
  });

  const groupMutation = trpc.lottery.generateGroups.useMutation({
    onSuccess: (data) => {
      setGroupResult(data);
      toast.success("✅ 分组完成！");
    },
    onError: (e) => toast.error("分组失败：" + e.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center p-4">
        <div className="glass-card border-gold-glow rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">权限不足</h2>
          <p className="text-white/60 text-sm mb-6">此页面仅管理员可访问</p>
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl btn-gold font-bold">返回首页</button>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "概览", icon: "📊" },
    { id: "checkins", label: "签到", icon: "✅" },
    { id: "awards", label: "颁奖", icon: "🏆" },
    { id: "lottery", label: "抽奖", icon: "🎰" },
    { id: "wishes", label: "心愿", icon: "💌" },
  ];

  const checkinList = (checkins as unknown) as { id: number; userId: number; userName: string; checkedInAt: Date }[];
  const awardList = awards as { id: number; name: string; description: string | null; icon: string | null }[];
  const wishList = (wishes as unknown) as { id: number; content: string; userName: string; createdAt: Date }[];
  const regList = registrations as { id: number; realName: string; department: string }[];

  return (
    <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-5">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate("/")} className="text-white/60 text-sm hover:text-white/90">← 返回</button>
          <h1 className="text-white font-bold flex items-center gap-2"><span>⚙️</span> 管理后台</h1>
          <div className="text-yellow-400 text-xs">管理员</div>
        </div>

        {/* Tab */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeTab === tab.id ? "btn-festive" : "glass-card text-white/60 hover:text-white/80"
              }`}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* 概览 */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "已签到", value: checkinList.length, icon: "✅", color: "text-green-400" },
                  { label: "已报名", value: regList.length, icon: "📝", color: "text-blue-400" },
                  { label: "心愿数", value: wishList.length, icon: "💌", color: "text-pink-400" },
                  { label: "奖项数", value: awardList.length, icon: "🏆", color: "text-yellow-400" },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card border-gold-glow rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1">{stat.icon}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-white/50 text-xs mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="glass-card border-gold-glow rounded-xl p-4">
                <h3 className="text-white/70 text-xs font-medium mb-3">快捷操作</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.open("/bigscreen", "_blank")} className="py-2.5 px-3 rounded-lg btn-gold text-xs font-medium">🖥️ 打开大屏</button>
                  <button onClick={() => setActiveTab("lottery")} className="py-2.5 px-3 rounded-lg btn-festive text-xs font-medium">🎰 开始抽奖</button>
                  <button onClick={() => setActiveTab("awards")} className="py-2.5 px-3 rounded-lg glass-card text-white/70 text-xs font-medium">🏆 生成颁奖词</button>
                  <button onClick={() => setActiveTab("wishes")} className="py-2.5 px-3 rounded-lg glass-card text-white/70 text-xs font-medium">💌 查看心愿</button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 签到 */}
          {activeTab === "checkins" && (
            <motion.div key="checkins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">签到记录</h3>
                  <span className="text-yellow-400 text-xs">{checkinList.length} 人已签到</span>
                </div>
                {checkinList.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-6">暂无签到记录</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {checkinList.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-white/30 text-xs w-5">{i + 1}</span>
                          <span className="text-white/80 text-sm">{c.userName || `用户${c.userId}`}</span>
                        </div>
                        <span className="text-white/40 text-xs">
                          {new Date(c.checkedInAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="glass-card border-gold-glow rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">报名名单 ({regList.length}人)</h3>
                {regList.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-4">暂无报名</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {regList.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-white/5">
                        <span className="text-white/80 text-sm">{r.realName}</span>
                        <span className="text-white/40 text-xs">{r.department}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 颁奖 */}
          {activeTab === "awards" && (
            <motion.div key="awards" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                <h3 className="text-white font-semibold text-sm mb-3">✨ AI颁奖词生成</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">选择奖项</label>
                    <select value={selectedAward} onChange={(e) => setSelectedAward(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-white text-sm outline-none appearance-none"
                      style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}>
                      <option value="" style={{ background: "#5c0a0a" }}>请选择奖项</option>
                      {awardList.map((a) => (
                        <option key={a.id} value={a.name} style={{ background: "#5c0a0a" }}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/60 text-xs mb-1.5 block">获奖人姓名</label>
                    <input type="text" value={winnerName} onChange={(e) => setWinnerName(e.target.value)}
                      placeholder="输入获奖人姓名"
                      className="w-full px-3 py-2.5 rounded-lg text-white placeholder-white/30 text-sm outline-none"
                      style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }} />
                  </div>
                  <button
                    onClick={() => {
                      if (!selectedAward || !winnerName.trim()) { toast.error("请选择奖项并填写获奖人"); return; }
                      generateSpeechMutation.mutate({ winnerName, awardName: selectedAward });
                    }}
                    disabled={generateSpeechMutation.isPending}
                    className="w-full py-3 rounded-xl btn-festive font-bold text-sm disabled:opacity-60">
                    {generateSpeechMutation.isPending ? "AI生成中..." : "✨ AI生成颁奖词"}
                  </button>
                </div>
              </div>
              {generatedSpeech && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                  <p className="text-yellow-400/80 text-xs font-medium mb-2">📜 颁奖词</p>
                  <p className="text-white/85 text-sm leading-relaxed italic">"{generatedSpeech}"</p>
                  <button onClick={() => { navigator.clipboard?.writeText(generatedSpeech); toast.success("已复制"); }}
                    className="mt-3 w-full py-2 rounded-lg glass-card text-white/60 text-xs">📋 复制颁奖词</button>
                </motion.div>
              )}
              <div className="glass-card border-gold-glow rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">奖项列表</h3>
                <div className="space-y-2">
                  {awardList.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-2 border-b border-white/5">
                      <span className="text-xl">{a.icon || "🏆"}</span>
                      <div>
                        <p className="text-white/80 text-sm font-medium">{a.name}</p>
                        <p className="text-white/40 text-xs">{a.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 抽奖 */}
          {activeTab === "lottery" && (
            <motion.div key="lottery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                <h3 className="text-white font-semibold text-sm mb-3">🎰 随机抽奖</h3>
                <div className="mb-3">
                  <label className="text-white/60 text-xs mb-1.5 block">抽取人数</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setLotteryCount((v) => Math.max(1, v - 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">−</button>
                    <span className="text-white font-bold text-xl w-8 text-center">{lotteryCount}</span>
                    <button onClick={() => setLotteryCount((v) => Math.min(10, v + 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">+</button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const pool = checkinList.length > 0
                      ? checkinList.map((c) => ({ name: c.userName || `用户${c.userId}` }))
                      : EMPLOYEES.map((n) => ({ name: n }));
                    drawMutation.mutate({ eventId: 1, participants: pool.slice(0, lotteryCount * 5) });
                  }}
                  disabled={drawMutation.isPending}
                  className="w-full py-3 rounded-xl btn-festive font-bold text-sm disabled:opacity-60">
                  {drawMutation.isPending ? "抽取中..." : "🎲 开始抽奖"}
                </button>
                {lotteryResult.length > 0 && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 p-3 rounded-xl text-center"
                    style={{ background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)" }}>
                    <p className="text-yellow-300/70 text-xs mb-1">🎉 中奖名单</p>
                    <p className="text-white font-bold text-base">{lotteryResult.join("、")}</p>
                  </motion.div>
                )}
              </div>

              <div className="glass-card border-gold-glow rounded-xl p-4">
                <h3 className="text-white font-semibold text-sm mb-3">👥 AI随机分组</h3>
                <div className="mb-3">
                  <label className="text-white/60 text-xs mb-1.5 block">分组数量</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGroupCount((v) => Math.max(2, v - 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">−</button>
                    <span className="text-white font-bold text-xl w-8 text-center">{groupCount}</span>
                    <button onClick={() => setGroupCount((v) => Math.min(8, v + 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">+</button>
                  </div>
                </div>
                <button
                  onClick={() => groupMutation.mutate({ members: EMPLOYEES, groupCount })}
                  disabled={groupMutation.isPending}
                  className="w-full py-3 rounded-xl btn-gold font-bold text-sm disabled:opacity-60">
                  {groupMutation.isPending ? "分组中..." : "🤖 AI随机分组"}
                </button>
                {groupResult.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {groupResult.map((g) => (
                      <div key={g.groupName} className="p-3 rounded-lg"
                        style={{ background: "rgba(255,215,0,0.08)", border: `1px solid ${g.color}40` }}>
                        <p className="text-xs font-medium mb-1" style={{ color: g.color }}>{g.groupName}</p>
                        <p className="text-white/70 text-sm">{g.members.join("、")}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 心愿 */}
          {activeTab === "wishes" && (
            <motion.div key="wishes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="glass-card border-gold-glow rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">心愿墙</h3>
                  <span className="text-yellow-400 text-xs">{wishList.length} 条心愿</span>
                </div>
                {wishList.length === 0 ? (
                  <p className="text-white/40 text-sm text-center py-8">暂无心愿，等待员工填写...</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {wishList.map((w) => (
                      <div key={w.id} className="p-3 rounded-xl"
                        style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.12)" }}>
                        <p className="text-white/80 text-sm leading-relaxed">{w.content}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-white/40 text-xs">— {w.userName || "匿名"}</span>
                          <span className="text-white/30 text-xs">
                            {new Date(w.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
