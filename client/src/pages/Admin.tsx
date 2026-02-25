import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trophy, Shuffle, Zap, Users, Loader2 } from "lucide-react";

const EMPLOYEES = [
  "张伟", "李娜", "王芳", "刘洋", "陈静", "杨磊", "赵敏", "黄强",
  "周婷", "吴杰", "徐慧", "孙浩", "马丽", "朱峰", "胡雪", "郭明",
  "何丽", "高鹏", "林芳", "罗勇", "梁静", "宋涛", "唐敏", "韩磊", "冯丽"
];

const AWARD_PRESETS = [
  { name: "AI效率革命奖", icon: "🏆" },
  { name: "年度优秀员工奖", icon: "⭐" },
  { name: "最佳团队协作奖", icon: "🤝" },
];

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState<"award" | "lottery" | "group">("award");
  const [winnerName, setWinnerName] = useState("");
  const [selectedAward, setSelectedAward] = useState(AWARD_PRESETS[0].name);
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<{ groupName: string; members: string[]; color: string }[]>([]);

  const { data: lotteryEvents } = trpc.lottery.getEvents.useQuery();
  const [selectedLotteryId, setSelectedLotteryId] = useState<number | null>(null);

  const generateSpeechMutation = trpc.award.generateSpeech.useMutation({
    onSuccess: (data) => {
      setGeneratedSpeech(data.speech);
      toast.success("AI颁奖词已生成并同步到大屏！");
    },
    onError: (err) => toast.error(err.message),
  });

  const drawMutation = trpc.lottery.draw.useMutation({
    onSuccess: (data) => {
      toast.success(`抽奖完成！中奖者：${data.winners.map(w => w.name).join("、")}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const groupMutation = trpc.lottery.generateGroups.useMutation({
    onSuccess: (data) => {
      setGeneratedGroups(data);
      toast.success(`分组完成！共 ${data.length} 组，已同步到大屏！`);
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-deep-gradient flex flex-col items-center justify-center px-5">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-white/60 mb-2">此页面仅管理员可访问</p>
        <button onClick={() => navigate("/")} className="text-yellow-400/70 text-sm mt-4">返回首页</button>
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
            <span className="text-sm">返回</span>
          </button>
          <div className="flex items-center gap-2">
            <Zap className="text-yellow-400" size={16} />
            <span className="text-yellow-400 text-sm font-medium">管理员控制台</span>
          </div>
        </div>

        {/* 大屏快捷入口 */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-gold-glow rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-sm">大屏展示</span>
            <button onClick={() => window.open("/bigscreen", "_blank")}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
              打开大屏 →
            </button>
          </div>
        </motion.div>

        {/* 功能切换 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { key: "award", label: "颁奖词", icon: <Trophy size={16} /> },
            { key: "lottery", label: "抽奖", icon: <Zap size={16} /> },
            { key: "group", label: "分组", icon: <Users size={16} /> },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key as typeof activeSection)}
              className={`py-2.5 rounded-xl text-xs flex flex-col items-center gap-1 transition-all ${
                activeSection === tab.key
                  ? "bg-yellow-400/20 border border-yellow-400/50 text-yellow-400"
                  : "glass-card text-white/50 hover:text-white/70"
              }`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* 颁奖词生成 */}
          {activeSection === "award" && (
            <motion.div key="award" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs mb-2 block">选择奖项</label>
                  <div className="space-y-2">
                    {AWARD_PRESETS.map((award) => (
                      <button key={award.name} onClick={() => setSelectedAward(award.name)}
                        className={`w-full py-2.5 px-4 rounded-xl text-sm text-left flex items-center gap-2 transition-all ${
                          selectedAward === award.name
                            ? "bg-yellow-400/20 border border-yellow-400/40 text-yellow-300"
                            : "glass-card text-white/60"
                        }`}>
                        <span>{award.icon}</span>
                        {award.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-white/50 text-xs mb-2 block">获奖者姓名</label>
                  <input value={winnerName} onChange={(e) => setWinnerName(e.target.value)}
                    placeholder="输入获奖者姓名"
                    className="w-full glass-card rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/30 outline-none focus:border-yellow-400/40 transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>

                <button onClick={() => generateSpeechMutation.mutate({ winnerName, awardName: selectedAward })}
                  disabled={!winnerName || generateSpeechMutation.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
                  {generateSpeechMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
                  {generateSpeechMutation.isPending ? "AI生成中..." : "生成颁奖词并同步大屏"}
                </button>

                {generatedSpeech && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-gold-glow rounded-xl p-4">
                    <p className="text-yellow-400/70 text-xs mb-2">AI生成颁奖词：</p>
                    <p className="text-white/80 text-sm leading-relaxed italic">"{generatedSpeech}"</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* 抽奖 */}
          {activeSection === "lottery" && (
            <motion.div key="lottery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs mb-2 block">选择抽奖活动</label>
                  <div className="space-y-2">
                    {lotteryEvents?.map((event) => (
                      <button key={event.id} onClick={() => setSelectedLotteryId(event.id)}
                        className={`w-full py-3 px-4 rounded-xl text-sm text-left transition-all ${
                          selectedLotteryId === event.id
                            ? "bg-yellow-400/20 border border-yellow-400/40 text-yellow-300"
                            : "glass-card text-white/60"
                        }`}>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-xs opacity-60 mt-0.5">奖金 ¥{event.rewardAmount} · 最多 {event.maxWinners} 名</div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!selectedLotteryId) { toast.error("请选择抽奖活动"); return; }
                    drawMutation.mutate({
                      eventId: selectedLotteryId,
                      participants: EMPLOYEES.map(name => ({ name })),
                    });
                  }}
                  disabled={!selectedLotteryId || drawMutation.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
                  {drawMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {drawMutation.isPending ? "抽奖中..." : "开始AI抽奖"}
                </button>
              </div>
            </motion.div>
          )}

          {/* 分组 */}
          {activeSection === "group" && (
            <motion.div key="group" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="space-y-4">
                <div>
                  <label className="text-white/50 text-xs mb-2 block">分组数量：{groupCount} 组</label>
                  <input type="range" min={2} max={8} value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))}
                    className="w-full accent-yellow-400" />
                  <div className="flex justify-between text-white/30 text-xs mt-1">
                    <span>2组</span><span>8组</span>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3">
                  <p className="text-white/50 text-xs mb-2">参与人员（{EMPLOYEES.length}人）</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EMPLOYEES.map((name) => (
                      <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{name}</span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => groupMutation.mutate({ members: EMPLOYEES, groupCount })}
                  disabled={groupMutation.isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
                  {groupMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
                  {groupMutation.isPending ? "AI随机分组中..." : "AI随机分组并同步大屏"}
                </button>

                {generatedGroups.length > 0 && (
                  <div className="space-y-2">
                    {generatedGroups.map((group) => (
                      <div key={group.groupName} className="glass-card rounded-xl p-3 border"
                        style={{ borderColor: `${group.color}40` }}>
                        <div className="font-medium text-sm mb-1" style={{ color: group.color }}>{group.groupName}</div>
                        <div className="flex flex-wrap gap-1">
                          {group.members.map((m) => (
                            <span key={m} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/60">{m}</span>
                          ))}
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
