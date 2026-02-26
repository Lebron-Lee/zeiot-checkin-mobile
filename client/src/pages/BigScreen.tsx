import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useWebSocket, WSMessage } from "@/hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";

type CheckinRecord = {
  id: number;
  userName: string;
  avatarUrl?: string | null;
  department?: string | null;
  message?: string | null;
  gridPosition?: number | null;
  checkedInAt: Date;
};

type WishCardRecord = {
  id: number;
  userName: string;
  content: string;
  color?: string | null;
  createdAt: Date;
};

type GroupResult = {
  groupName: string;
  color: string;
  members: string[];
};

// 烟花粒子背景
function FestiveBigScreenBg() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 6,
    duration: Math.random() * 5 + 4,
    color: i % 4 === 0 ? "rgba(255,215,0,0.6)"
      : i % 4 === 1 ? "rgba(255,100,100,0.5)"
      : i % 4 === 2 ? "rgba(255,255,255,0.3)"
      : "rgba(255,180,0,0.4)",
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-up"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {/* 科技网格 */}
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      {/* 扫描线 */}
      <div className="absolute inset-0 scan-overlay" />
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full opacity-15"
        style={{ background: "radial-gradient(ellipse, rgba(232,0,29,0.9) 0%, transparent 70%)" }} />
      {/* 左下角光晕 */}
      <div className="absolute bottom-0 left-0 w-96 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.8) 0%, transparent 70%)" }} />
      {/* 右下角光晕 */}
      <div className="absolute bottom-0 right-0 w-96 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.8) 0%, transparent 70%)" }} />
    </div>
  );
}

// 实时时钟
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString("zh-CN", { hour12: false });
  const dateStr = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" });
  return (
    <div className="text-right">
      <div className="text-2xl font-mono font-bold text-gold-gradient">{timeStr}</div>
      <div className="text-xs text-white/50">{dateStr}</div>
    </div>
  );
}

// AI颁奖词弹窗
function AwardModal({ award, onClose }: { award: { awardName: string; winnerName: string; speech: string } | null; onClose: () => void }) {
  useEffect(() => {
    if (award) {
      const t = setTimeout(onClose, 15000);
      return () => clearTimeout(t);
    }
  }, [award, onClose]);

  return (
    <AnimatePresence>
      {award && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(60,0,0,0.92)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 60 }}
            transition={{ type: "spring", damping: 20 }}
            className="glass-card border-gold-glow rounded-3xl p-10 max-w-2xl mx-8 text-center corner-frame"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-yellow-300/70 text-sm tracking-widest mb-2 uppercase">颁奖典礼</div>
            <h2 className="text-3xl font-bold text-gold-gradient mb-2">{award.awardName}</h2>
            <div className="text-white/60 text-sm mb-4">授予</div>
            <div className="text-4xl font-bold text-white mb-6">{award.winnerName}</div>
            <div className="border-t border-yellow-400/20 pt-5">
              <p className="text-white/80 text-lg leading-relaxed italic">"{award.speech}"</p>
            </div>
            <div className="mt-6 text-white/30 text-xs">点击任意处关闭 · 15秒后自动关闭</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 抽奖结果弹窗
function LotteryModal({ result, onClose }: { result: { winnerName: string; prizeName: string; prizeAmount?: number } | null; onClose: () => void }) {
  useEffect(() => {
    if (result) {
      const t = setTimeout(onClose, 12000);
      return () => clearTimeout(t);
    }
  }, [result, onClose]);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(60,0,0,0.92)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, rotate: 10 }}
            transition={{ type: "spring", damping: 18 }}
            className="glass-card border-gold-glow rounded-3xl p-10 max-w-lg mx-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <div className="text-yellow-300/70 text-sm tracking-widest mb-3">恭喜获奖</div>
            <div className="text-5xl font-bold text-white mb-3">{result.winnerName}</div>
            <div className="text-2xl font-semibold text-gold-gradient mb-2">{result.prizeName}</div>
            {result.prizeAmount && (
              <div className="text-3xl font-bold text-red-400 animate-pulse-red">
                ¥ {result.prizeAmount}
              </div>
            )}
            <div className="mt-6 text-white/30 text-xs">点击任意处关闭 · 12秒后自动关闭</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function BigScreen() {
  const [activeTab, setActiveTab] = useState<"checkin" | "wish" | "group">("checkin");
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [wishCards, setWishCards] = useState<WishCardRecord[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [awardModal, setAwardModal] = useState<{ awardName: string; winnerName: string; speech: string } | null>(null);
  const [lotteryModal, setLotteryModal] = useState<{ winnerName: string; prizeName: string; prizeAmount?: number } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  const autoTabRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 数据查询
  const { data: checkinData } = trpc.checkin.getAll.useQuery();
  const { data: wishData } = trpc.wishCard.getAll.useQuery();
  const { data: config } = trpc.event.getConfig.useQuery();

  useEffect(() => {
    if (checkinData) {
      setCheckins(checkinData as CheckinRecord[]);
      setRecentCheckins((checkinData as CheckinRecord[]).slice(-10).reverse());
    }
  }, [checkinData]);

  useEffect(() => {
    if (wishData) setWishCards(wishData as WishCardRecord[]);
  }, [wishData]);

  // 自动切换标签
  useEffect(() => {
    autoTabRef.current = setInterval(() => {
      setActiveTab(prev => prev === "checkin" ? "wish" : prev === "wish" ? "group" : "checkin");
    }, 12000);
    return () => { if (autoTabRef.current) clearInterval(autoTabRef.current); };
  }, []);

  // WebSocket
  const handleWsMessage = useCallback((msg: WSMessage) => {
    if (msg.type === "NEW_CHECKIN" && msg.data) {
      const d = msg.data as CheckinRecord;
      setCheckins(prev => {
        const exists = prev.find(c => c.id === d.id);
        if (exists) return prev;
        return [...prev, d];
      });
      setRecentCheckins(prev => [d, ...prev].slice(0, 15));
      setActiveTab("checkin");
    }
    if (msg.type === "NEW_WISH_CARD" && msg.data) {
      const d = msg.data as WishCardRecord;
      setWishCards(prev => {
        const exists = prev.find(w => w.id === d.id);
        if (exists) return prev;
        return [d, ...prev];
      });
      setTimeout(() => setActiveTab("wish"), 2000);
    }
    if (msg.type === "AWARD_SPEECH" && msg.data) {
      const d = msg.data as { awardName: string; winnerName: string; speech: string };
      setAwardModal(d);
    }
    if (msg.type === "LOTTERY_RESULT" && msg.data) {
      const d = msg.data as { winnerName: string; prizeName: string; prizeAmount?: number };
      setLotteryModal(d);
    }
    if (msg.type === "TEAM_GROUPS" && msg.data) {
      const d = msg.data as GroupResult[];
      setGroups(d);
      setActiveTab("group");
    }
  }, []);

  useWebSocket(handleWsMessage);

  const totalSeats = Number(config?.total_seats) || 25;
  const checkinCount = checkins.length;
  const progressPct = Math.min(100, Math.round((checkinCount / totalSeats) * 100));

  // 头像网格（5×5）
  const gridCells = Array.from({ length: totalSeats }, (_, i) => {
    const pos = i + 1;
    return checkins.find(c => c.gridPosition === pos) || null;
  });

  const wishColors: Record<string, string> = {
    red: "from-red-900/70 to-red-700/50",
    gold: "from-yellow-900/70 to-yellow-700/50",
    purple: "from-purple-900/70 to-purple-700/50",
    green: "from-green-900/70 to-green-700/50",
  };

  return (
    <div className="min-h-screen bg-bigscreen-gradient relative overflow-hidden">
      <FestiveBigScreenBg />

      {/* 弹窗 */}
      <AwardModal award={awardModal} onClose={() => setAwardModal(null)} />
      <LotteryModal result={lotteryModal} onClose={() => setLotteryModal(null)} />

      <div className="relative z-10 h-screen flex flex-col p-5">

        {/* 顶部栏 */}
        <div className="flex items-center justify-center gap-8 mb-4 py-2">
          {/* Logo */}
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/309964133946657044/roiHfLVdenSnZJDu.jpg"
            alt="中易物联集团"
            className="h-16 object-contain flex-shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(255,215,0,0.6))" }}
          />
          {/* 分隔线 */}
          <div className="w-px h-14 bg-gradient-to-b from-transparent via-yellow-400/50 to-transparent flex-shrink-0" />
          {/* 标题横排 */}
          <div className="flex items-baseline gap-5">
            <h1
              className="text-5xl font-bold text-gold-gradient tracking-wider"
              style={{ fontFamily: "'Noto Serif SC', serif", textShadow: "0 0 30px rgba(255,215,0,0.5)" }}
            >
              2026 开工盛典
            </h1>
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-yellow-400/40 to-transparent flex-shrink-0" />
            <p
              className="text-2xl font-semibold tracking-[0.25em] text-gold-gradient opacity-80"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            >
              AI智启·同心聚力·焕新出发
            </p>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex gap-4 flex-1 min-h-0">

          {/* 左侧：AI头像签到墙 */}
          <div className="w-[420px] flex-shrink-0 glass-card border-gold-glow rounded-2xl p-4 flex flex-col corner-frame">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">🎯</span>
                <span className="text-white/80 text-sm font-semibold">AI头像签到墙</span>
              </div>
              <span className="text-yellow-400/70 text-xs">{checkinCount}/{totalSeats}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 flex-1">
              {gridCells.map((cell, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden flex items-center justify-center relative"
                  style={{
                    background: cell
                      ? "transparent"
                      : "rgba(139,26,26,0.3)",
                    border: cell
                      ? "1px solid rgba(255,215,0,0.5)"
                      : "1px solid rgba(255,215,0,0.12)",
                  }}
                  initial={cell ? { scale: 0, opacity: 0 } : {}}
                  animate={cell ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", damping: 15 }}
                >
                  {cell ? (
                    <>
                      {cell.avatarUrl ? (
                        <img src={cell.avatarUrl} alt={cell.userName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #8b1a1a, #c0392b)" }}>
                          <span className="text-white font-bold text-sm">{cell.userName.slice(0, 1)}</span>
                        </div>
                      )}
                      {/* 签到成功发光效果 */}
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 2, delay: 0.5 }}
                        style={{ boxShadow: "inset 0 0 20px rgba(255,215,0,0.6)" }}
                      />
                    </>
                  ) : (
                    <span className="text-white/20 text-xs font-mono">{i + 1}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          {/* 右侧：标签内容区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 标签切换 */}
            <div className="flex gap-2 mb-3">
              {[
                { key: "checkin", label: "✦ 实时签到", icon: "🎯" },
                { key: "wish", label: "✧ 心愿墙", icon: "✨" },
                { key: "group", label: "◈ 分组结果", icon: "👥" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as "checkin" | "wish" | "group");
                    if (autoTabRef.current) clearInterval(autoTabRef.current);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "btn-festive text-white"
                      : "glass-card text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.icon} {tab.label.replace(/[✦✧◈] /, "")}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="flex-1 glass-card border-red-glow rounded-2xl p-4 overflow-hidden corner-frame">
              <AnimatePresence mode="wait">

                {/* 实时签到动态 */}
                {activeTab === "checkin" && (
                  <motion.div
                    key="checkin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <div className="text-white/50 text-xs mb-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      实时签到动态
                    </div>
                    <div className="space-y-2 overflow-y-auto h-[calc(100%-28px)]">
                      {recentCheckins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-white/30">
                          <div className="text-4xl mb-3">🎯</div>
                          <p className="text-sm">等待员工签到...</p>
                        </div>
                      ) : (
                        recentCheckins.map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl"
                            style={{ background: "rgba(139,26,26,0.3)", border: "1px solid rgba(255,215,0,0.15)" }}
                          >
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                              style={{ border: "1px solid rgba(255,215,0,0.4)" }}>
                              {c.avatarUrl ? (
                                <img src={c.avatarUrl} alt={c.userName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, #8b1a1a, #c0392b)" }}>
                                  <span className="text-white font-bold text-sm">{c.userName.slice(0, 1)}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-semibold text-sm">{c.userName}</span>
                                {c.department && <span className="text-yellow-400/60 text-xs">{c.department}</span>}
                              </div>
                              {c.message && <p className="text-white/50 text-xs truncate mt-0.5">"{c.message}"</p>}
                            </div>
                            <div className="text-white/30 text-xs flex-shrink-0">
                              {new Date(c.checkedInAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 心愿墙 */}
                {activeTab === "wish" && (
                  <motion.div
                    key="wish"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <div className="text-white/50 text-xs mb-3">✨ 员工心愿墙</div>
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto h-[calc(100%-28px)]">
                      {wishCards.length === 0 ? (
                        <div className="col-span-3 flex flex-col items-center justify-center h-32 text-white/30">
                          <div className="text-4xl mb-2">✨</div>
                          <p className="text-sm">等待员工写下心愿...</p>
                        </div>
                      ) : (
                        wishCards.map((w, i) => (
                          <motion.div
                            key={w.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`p-3 rounded-xl bg-gradient-to-br ${wishColors[w.color || "red"] || wishColors.red} border border-yellow-400/20`}
                          >
                            <p className="text-white/90 text-xs leading-relaxed mb-2 line-clamp-3">"{w.content}"</p>
                            <p className="text-yellow-400/60 text-[10px]">— {w.userName}</p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}

                {/* 分组结果 */}
                {activeTab === "group" && (
                  <motion.div
                    key="group"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full"
                  >
                    <div className="text-white/50 text-xs mb-3">👥 AI随机分组结果</div>
                    {groups.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-white/30">
                        <div className="text-4xl mb-2">👥</div>
                        <p className="text-sm">等待管理员执行分组...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3 overflow-y-auto h-[calc(100%-28px)]">
                        {groups.map((g, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-3 rounded-xl glass-card"
                            style={{ borderColor: g.color + "60" }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: g.color }} />
                              <span className="text-white font-semibold text-sm">{g.groupName}</span>
                              <span className="text-white/40 text-xs ml-auto">{g.members.length}人</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {g.members.map((m, j) => (
                                <span key={j} className="text-xs px-2 py-0.5 rounded-full text-white/80"
                                  style={{ background: g.color + "30", border: `1px solid ${g.color}40` }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 底部统计 */}
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { label: "已签到", value: checkinCount, icon: "🎯", color: "#e8001d" },
                { label: "心愿卡", value: wishCards.length, icon: "✨", color: "#ffd700" },
                { label: "分组数", value: groups.length, icon: "👥", color: "#ff6b35" },
                { label: "活动进行中", value: "", icon: "🔴", color: "#22c55e", isStatus: true },
              ].map((stat, i) => (
                <div key={i} className="glass-card rounded-xl p-3 text-center"
                  style={{ borderColor: stat.color + "40" }}>
                  <div className="text-xl mb-1">{stat.icon}</div>
                  {stat.isStatus ? (
                    <div className="text-xs text-green-400 font-medium animate-pulse">{stat.label}</div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                      <div className="text-white/40 text-xs">{stat.label}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="text-center mt-3">
          <p className="text-white/20 text-xs">中易物联集团 · 2026 · AI智启新征程</p>
        </div>
      </div>

      {/* 装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />
    </div>
  );
}
