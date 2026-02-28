import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type Tab = "overview" | "checkins" | "awards" | "lottery" | "wishes";

// 21人名单（雷总/王总/刘总固定分到不同组）
const FIXED_LEADERS = ["雷总", "王总", "刘总"];

// 预设名单（21人）
const DEFAULT_MEMBERS = [
  "雷总", "王总", "刘总",
  "高贺芬", "李勇", "赵辉", "李绍晖", "王尊鹏", "陈玺燊",
  "杨培玉", "张鹏辉", "边东", "周贵亮", "朱玉婷", "万华",
  "石晓林", "王燕", "李翔", "薛君浩", "石乙泽", "顾倬冉",
];

export default function Admin() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [winnerName, setWinnerName] = useState("");
  const [selectedAward, setSelectedAward] = useState("");
  const [generatedSpeech, setGeneratedSpeech] = useState("");
  const [lotteryCount, setLotteryCount] = useState(1);
  const [lotteryResult, setLotteryResult] = useState<string[]>([]);
  const [groupCount, setGroupCount] = useState(4);
  const [groupResult, setGroupResult] = useState<{ groupName: string; members: string[]; color: string }[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const { data: checkins = [], refetch: refetchCheckins } = trpc.checkin.getAll.useQuery();
  const { data: awards = [] } = trpc.award.getAll.useQuery();
  const { data: wishes = [] } = trpc.wishCard.getAll.useQuery();
  const { data: registrations = [], refetch: refetchRegs } = trpc.registration.getAll.useQuery();
  const { data: registeredMembers = [] } = trpc.admin.getRegisteredMembers.useQuery();

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

  const resetMutation = trpc.admin.resetEventData.useMutation({
    onSuccess: () => {
      toast.success("✅ 数据已清空，活动准备就绪！");
      setShowResetConfirm(false);
      refetchCheckins();
      refetchRegs();
    },
    onError: (e) => toast.error("初始化失败：" + e.message),
  });

  const updateConfigMutation = trpc.event.updateConfig.useMutation({
    onSuccess: () => {},
    onError: (e) => toast.error("配置更新失败：" + e.message),
  });

  const sendRedPacket = trpc.redPacket.send.useMutation({
    onSuccess: () => toast.success("🧧 红包已发送到大屏！"),
    onError: (e) => toast.error("发送失败：" + e.message),
  });

  const handleToggleDebugMode = (enabled: boolean) => {
    setDebugMode(enabled);
    updateConfigMutation.mutate({ key: "debug_mode", value: enabled ? "true" : "false" });
    toast.success(enabled ? "🔧 调试模式已开启，签到不受时间限制" : "✅ 调试模式已关闭，恢复正常时间限制");
  };


  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "概览", icon: "📊" },
    { id: "checkins", label: "签到", icon: "✅" },
    { id: "awards", label: "颁奖", icon: "🏆" },
    { id: "lottery", label: "抽奖", icon: "🎰" },
    { id: "wishes", label: "心愿", icon: "💌" },
  ];

  const checkinList = (checkins as unknown) as { id: number; userId: number; userName: string; checkedInAt: Date }[];
  const awardList = awards as { id: number; name: string; description: string | null; icon: string | null }[];
  const wishList = ((wishes as unknown) as { id: number; content: string; userName: string; createdAt: Date }[])
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const regList = registrations as { id: number; realName: string; department: string; position?: string }[];
  const regMemberList = registeredMembers as { name: string; department: string; position?: string | null }[];

  // 生成分组：固定雷总/刘总/王总各在不同组，其余随机分配
  const handleGenerateGroups = () => {
    // 优先使用注册用户，否则用预设名单
    const memberNames = regMemberList.length >= 5
      ? regMemberList.map((m) => m.name)
      : DEFAULT_MEMBERS;

    // 分离领导和普通成员
    const leaders = memberNames.filter((n) => FIXED_LEADERS.includes(n));
    const others = memberNames.filter((n) => !FIXED_LEADERS.includes(n));

    // 随机打乱普通成员
    const shuffled = [...others].sort(() => Math.random() - 0.5);

    // 使用用户设定的分组数（不受领导人数限制）
    const effectiveGroupCount = Math.min(groupCount, memberNames.length);
    const groupMembers: string[][] = Array.from({ length: effectiveGroupCount }, () => []);

    // 固定领导分组（雷总→第一组，王总→第二组，刘总→第三组，超出组数则轮流分配）
    leaders.forEach((leader, idx) => {
      groupMembers[idx % effectiveGroupCount].push(leader);
    });

    // 轮流分配其余成员
    shuffled.forEach((member, idx) => {
      groupMembers[idx % effectiveGroupCount].push(member);
    });

    groupMutation.mutate({
      members: memberNames,
      groupCount: effectiveGroupCount,
    });
  };

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

              {/* 快捷操作 */}
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                <h3 className="text-white/70 text-xs font-medium mb-3">快捷操作</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.open("/bigscreen", "_blank")} className="py-2.5 px-3 rounded-lg btn-gold text-xs font-medium">🖥️ 打开大屏</button>
                  <button onClick={() => setActiveTab("lottery")} className="py-2.5 px-3 rounded-lg btn-festive text-xs font-medium">🎰 开始抽奖</button>
                  <button onClick={() => setActiveTab("awards")} className="py-2.5 px-3 rounded-lg glass-card text-white/70 text-xs font-medium">🏆 生成颁奖词</button>
                  <button onClick={() => setActiveTab("wishes")} className="py-2.5 px-3 rounded-lg glass-card text-white/70 text-xs font-medium">💌 查看心愿</button>
                </div>
              </div>

              {/* 调试模式开关 */}
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-3">
                <h3 className="text-white/70 text-xs font-medium mb-3 flex items-center gap-1.5">
                  <span>🔧</span> 调试模式
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm font-medium">签到时间限制</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {debugMode ? "🔓 已关闭时间限制，可随时测试签到" : "🔒 开启后用户不受时间限制"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleDebugMode(!debugMode)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                      debugMode ? "bg-yellow-500" : "bg-white/20"
                    }`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                      debugMode ? "left-6" : "left-0.5"
                    }`} />
                  </button>
                </div>
                {debugMode && (
                  <div className="mt-3 p-2 rounded-lg text-xs text-yellow-400/80 flex items-center gap-2" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)" }}>
                    <span>⚠️</span>
                    <span>调试模式已开启，所有用户可随时签到，活动开始前请关闭</span>
                  </div>
                )}
              </div>

              {/* 一键初始化 */}
              <div className="glass-card rounded-xl p-4 border border-red-500/20">
                <h3 className="text-white/70 text-xs font-medium mb-2 flex items-center gap-1.5">
                  <span>⚠️</span> 活动初始化
                </h3>
                <p className="text-white/40 text-xs mb-3 leading-relaxed">
                  清空所有签到、心愿卡、答题记录、抽奖和分组数据。<br />
                  <strong className="text-red-400/70">活动开始前执行，不可恢复！</strong>
                </p>
                {!showResetConfirm ? (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border border-red-500/40 text-red-400/80 hover:bg-red-500/10 transition-all"
                  >
                    🔄 一键清空测试数据
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-red-400 text-xs text-center font-medium">确认清空所有活动数据？</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 rounded-lg glass-card text-white/60 text-xs">取消</button>
                      <button
                        onClick={() => resetMutation.mutate()}
                        disabled={resetMutation.isPending}
                        className="flex-1 py-2 rounded-lg bg-red-600/70 text-white text-xs font-bold disabled:opacity-60"
                      >
                        {resetMutation.isPending ? "清空中..." : "确认清空"}
                      </button>
                    </div>
                  </div>
                )}
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
                        <div className="text-right">
                          <span className="text-white/40 text-xs">{r.department}</span>
                          {r.position && <span className="text-white/30 text-xs ml-1">· {r.position}</span>}
                        </div>
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
                  <p className="text-white/85 text-sm leading-relaxed">{generatedSpeech}</p>
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
                <p className="text-white/40 text-xs mb-3">
                  参与池：{checkinList.length > 0 ? `${checkinList.length}位已签到员工` : "预设名单（25人）"}
                </p>
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
                      : DEFAULT_MEMBERS.map((n) => ({ name: n }));
                    drawMutation.mutate({ eventId: 1, participants: pool });
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
                <h3 className="text-white font-semibold text-sm mb-1">👥 AI随机分组</h3>
                <p className="text-white/40 text-xs mb-3">
                  {regMemberList.length >= 5
                    ? `基于 ${regMemberList.length} 位报名用户分组`
                    : `使用预设名单（${DEFAULT_MEMBERS.length}人），报名人数不足时自动启用`}
                  <br />
                  <span className="text-yellow-400/60">★ 雷总/王总/刘总固定分入不同组</span>
                </p>
                <div className="mb-3">
                  <label className="text-white/60 text-xs mb-1.5 block">分组数量（建议4组）</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setGroupCount((v) => Math.max(2, v - 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">−</button>
                    <span className="text-white font-bold text-xl w-8 text-center">{groupCount}</span>
                    <button onClick={() => setGroupCount((v) => Math.min(8, v + 1))}
                      className="w-9 h-9 rounded-lg glass-card text-white/70 font-bold text-lg">+</button>
                  </div>
                </div>
                <button
                  onClick={handleGenerateGroups}
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
                  <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0" style={{ background: "rgba(20,10,5,0.95)" }}>
                        <tr>
                          <th className="text-left text-white/40 text-xs font-medium py-2 px-3 w-10">#</th>
                          <th className="text-left text-white/40 text-xs font-medium py-2 px-3 w-20">提交人</th>
                          <th className="text-left text-white/40 text-xs font-medium py-2 px-3">心愿内容</th>
                          <th className="text-left text-white/40 text-xs font-medium py-2 px-3 w-28">提交时间</th>
                          <th className="text-left text-white/40 text-xs font-medium py-2 px-3 w-20">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wishList.map((w, idx) => (
                          <tr key={w.id}
                            style={{ borderTop: "1px solid rgba(255,215,0,0.08)" }}
                            className="hover:bg-yellow-400/5 transition-colors"
                          >
                            <td className="py-2.5 px-3 text-white/30 text-xs font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <span className="text-yellow-300/80 text-xs font-medium">{w.userName || "匿名"}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="text-white/80 text-xs leading-relaxed">{w.content}</p>
                            </td>
                            <td className="py-2.5 px-3 text-white/30 text-xs whitespace-nowrap">
                              {new Date(w.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => sendRedPacket.mutate({ recipientName: w.userName || "匿名", wishContent: w.content })}
                                disabled={sendRedPacket.isPending}
                                className="px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
                                style={{
                                  background: sendRedPacket.isPending ? "rgba(139,26,26,0.3)" : "linear-gradient(135deg, #c0392b, #8b1a1a)",
                                  border: "1px solid rgba(255,215,0,0.4)",
                                  color: "#ffd700",
                                  opacity: sendRedPacket.isPending ? 0.5 : 1,
                                }}
                              >
                                🧧 发红包
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
