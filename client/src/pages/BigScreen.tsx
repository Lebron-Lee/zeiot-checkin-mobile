import { useState, useEffect, useCallback, useRef } from "react";
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
  userAvatar?: string | null;
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
      <div className="absolute inset-0 bg-tech-grid opacity-30" />
      <div className="absolute inset-0 scan-overlay" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 rounded-full opacity-15"
        style={{ background: "radial-gradient(ellipse, rgba(232,0,29,0.9) 0%, transparent 70%)" }} />
      <div className="absolute bottom-0 left-0 w-96 h-64 rounded-full opacity-10"
        style={{ background: "radial-gradient(ellipse, rgba(255,215,0,0.8) 0%, transparent 70%)" }} />
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

// 飘动的心愿卡
function FloatingWishCard({ card, index }: { card: WishCardRecord; index: number }) {
  // 每张卡片有固定的随机初始位置和运动参数（用index做seed，保证稳定）
  const seed = (index * 137 + 42) % 100;
  const x = (seed * 7) % 80 + 5; // 5%~85%
  const y = (seed * 13) % 70 + 5; // 5%~75%
  const duration = 8 + (seed % 8); // 8~15秒
  const delay = (seed % 6) * -1; // 0~-5秒（负delay让动画错开）
  const driftX = ((seed * 3) % 40) - 20; // -20~20px
  const driftY = ((seed * 5) % 30) - 15; // -15~15px
  const rotate = ((seed * 2) % 12) - 6; // -6~6度

  const wishColors: Record<string, string> = {
    red: "from-red-900/80 to-red-700/60",
    gold: "from-yellow-900/80 to-yellow-700/60",
    purple: "from-purple-900/80 to-purple-700/60",
    green: "from-green-900/80 to-green-700/60",
  };
  const colorClass = wishColors[card.color || "red"] || wishColors.red;

  return (
    <motion.div
      className={`absolute w-44 rounded-xl p-3 bg-gradient-to-br ${colorClass} border border-yellow-400/25 cursor-default`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        rotate: `${rotate}deg`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        zIndex: index % 3 + 1,
      }}
      animate={{
        x: [0, driftX, -driftX / 2, driftX / 3, 0],
        y: [0, driftY, -driftY / 2, driftY / 3, 0],
        rotate: [rotate, rotate + 2, rotate - 1, rotate + 1, rotate],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
    >
      {/* 用户头像 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-yellow-400/30">
          {card.userAvatar ? (
            <img src={card.userAvatar} alt={card.userName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-yellow-400"
              style={{ background: "linear-gradient(135deg, #8b1a1a, #c0392b)" }}>
              {card.userName.slice(0, 1)}
            </div>
          )}
        </div>
        <span className="text-yellow-400/70 text-[10px] truncate">{card.userName}</span>
      </div>
      <p className="text-white/90 text-xs leading-relaxed line-clamp-3">"{card.content}"</p>
    </motion.div>
  );
}

// 签到动态自动滚动列表
function AutoScrollCheckinList({ checkins }: { checkins: CheckinRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayList, setDisplayList] = useState<CheckinRecord[]>([]);

  // 每次checkins更新时，将新签到加到列表顶部
  useEffect(() => {
    setDisplayList([...checkins]);
  }, [checkins]);

  // 自动向上滚动
  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayList.length === 0) return;
    let animId: number;
    let lastTime = 0;
    const speed = 0.4; // px/ms

    const scroll = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      container.scrollTop += speed * delta;
      // 当滚动到底部时，无缝回到顶部
      if (container.scrollTop >= container.scrollHeight - container.clientHeight - 2) {
        container.scrollTop = 0;
      }
      animId = requestAnimationFrame(scroll);
    };

    // 有足够内容才滚动
    if (container.scrollHeight > container.clientHeight + 10) {
      animId = requestAnimationFrame(scroll);
    }

    return () => cancelAnimationFrame(animId);
  }, [displayList]);

  if (displayList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/30">
        <div className="text-4xl mb-3">🎯</div>
        <p className="text-sm">等待员工签到...</p>
      </div>
    );
  }

  // 复制一份用于无缝循环
  const loopList = displayList.length < 6 ? [...displayList, ...displayList] : displayList;

  return (
    <div
      ref={containerRef}
      className="h-full overflow-hidden"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="space-y-2 pb-2">
        {loopList.map((c, i) => (
          <div
            key={`${c.id}-${i}`}
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
              {/* 使用本地时间显示，避免UTC偏差 */}
              {new Date(c.checkedInAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// AI问答题目类型
type QuizQuestion = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string | null;
};

export default function BigScreen() {
  const [activeTab, setActiveTab] = useState<"checkin" | "wish" | "quiz">("checkin");
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [wishCards, setWishCards] = useState<WishCardRecord[]>([]);
  const [groups, setGroups] = useState<GroupResult[]>([]);
  const [awardModal, setAwardModal] = useState<{ awardName: string; winnerName: string; speech: string } | null>(null);
  const [lotteryModal, setLotteryModal] = useState<{ winnerName: string; prizeName: string; prizeAmount?: number } | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<CheckinRecord[]>([]);
  // 是否暂停自动切换（手动选AI问答时暂停）
  const [autoPaused, setAutoPaused] = useState(false);
  const autoTabRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // AI问答状态
  const [quizQuestion, setQuizQuestion] = useState<QuizQuestion | null>(null);
  const [quizSelected, setQuizSelected] = useState<string | null>(null);
  const [quizAllQuestions, setQuizAllQuestions] = useState<QuizQuestion[]>([]);
  const [quizUsedIds, setQuizUsedIds] = useState<Set<number>>(new Set());

  // 数据查询
  const { data: checkinData } = trpc.checkin.getAll.useQuery();
  const { data: wishData } = trpc.wishCard.getAll.useQuery();
  const { data: config } = trpc.event.getConfig.useQuery();

  useEffect(() => {
    if (checkinData) {
      setCheckins(checkinData as CheckinRecord[]);
      setRecentCheckins((checkinData as CheckinRecord[]).slice(-15).reverse());
    }
  }, [checkinData]);

  useEffect(() => {
    if (wishData) setWishCards(wishData as WishCardRecord[]);
  }, [wishData]);

  // 自动切换标签：只在 checkin ↔ wish 之间切换，暂停时停止
  const startAutoSwitch = useCallback(() => {
    if (autoTabRef.current) clearInterval(autoTabRef.current);
    autoTabRef.current = setInterval(() => {
      setActiveTab(prev => prev === "checkin" ? "wish" : "checkin");
    }, 12000);
  }, []);

  useEffect(() => {
    if (!autoPaused) {
      startAutoSwitch();
    } else {
      if (autoTabRef.current) clearInterval(autoTabRef.current);
    }
    return () => { if (autoTabRef.current) clearInterval(autoTabRef.current); };
  }, [autoPaused, startAutoSwitch]);

  // 手动点击标签
  const handleTabClick = (tab: "checkin" | "wish" | "quiz") => {
    setActiveTab(tab);
    if (tab === "quiz") {
      // 手动选AI问答：暂停自动切换
      setAutoPaused(true);
    } else {
      // 手动选签到/心愿墙：恢复自动切换
      setAutoPaused(false);
    }
  };

  // 加载AI问答题库
  const { data: quizData } = trpc.quiz.getQuestions.useQuery();
  useEffect(() => {
    if (quizData) setQuizAllQuestions(quizData as unknown as QuizQuestion[]);
  }, [quizData]);

  // 出题：从未用过的题目中随机取一题
  const handleDrawQuestion = () => {
    const available = quizAllQuestions.filter(q => !quizUsedIds.has(q.id));
    if (available.length === 0) {
      // 题库已出完，重置
      setQuizUsedIds(new Set());
      const idx = Math.floor(Math.random() * quizAllQuestions.length);
      setQuizQuestion(quizAllQuestions[idx] || null);
      setQuizUsedIds(new Set([quizAllQuestions[idx]?.id ?? 0]));
    } else {
      const idx = Math.floor(Math.random() * available.length);
      const q = available[idx];
      setQuizQuestion(q);
      setQuizUsedIds(prev => new Set(Array.from(prev).concat(q.id)));
    }
    setQuizSelected(null);
  };

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
      // 新签到时切换到签到tab并恢复自动切换
      setActiveTab("checkin");
      setAutoPaused(false);
    }
    if (msg.type === "NEW_WISH_CARD" && msg.data) {
      const d = msg.data as WishCardRecord;
      setWishCards(prev => {
        const exists = prev.find(w => w.id === d.id);
        if (exists) return prev;
        return [d, ...prev];
      });
      setTimeout(() => {
        setActiveTab("wish");
        setAutoPaused(false);
      }, 2000);
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
      // 分组结果不再切换大屏页签
    }
  }, []);

  useWebSocket(handleWsMessage);

  const totalSeats = Number(config?.total_seats) || 25;
  const checkinCount = checkins.length;

  // 头像网格（5×5）
  const gridCells = Array.from({ length: totalSeats }, (_, i) => {
    const pos = i + 1;
    return checkins.find(c => c.gridPosition === pos) || null;
  });

  return (
    <div className="min-h-screen bg-bigscreen-gradient relative overflow-hidden">
      <FestiveBigScreenBg />

      {/* 弹窗 */}
      <AwardModal award={awardModal} onClose={() => setAwardModal(null)} />
      <LotteryModal result={lotteryModal} onClose={() => setLotteryModal(null)} />

      <div className="relative z-10 h-screen flex flex-col p-5">

        {/* 顶部栏 */}
        <div className="flex items-center justify-center gap-8 mb-4 py-2">
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/309964133946657044/roiHfLVdenSnZJDu.jpg"
            alt="中易物联集团"
            className="h-16 object-contain flex-shrink-0"
            style={{ filter: "drop-shadow(0 0 14px rgba(255,215,0,0.6))" }}
          />
          <div className="w-px h-14 bg-gradient-to-b from-transparent via-yellow-400/50 to-transparent flex-shrink-0" />
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

          {/* 左侧：签到墙 */}
          <div className="w-[420px] flex-shrink-0 glass-card border-gold-glow rounded-2xl p-4 flex flex-col corner-frame">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">🎯</span>
                <span className="text-white/80 text-sm font-semibold">签到墙</span>
              </div>
              <span className="text-yellow-400/70 text-xs">{checkinCount}/{totalSeats}</span>
            </div>
            <div className="grid grid-cols-5 gap-2 flex-1">
              {gridCells.map((cell, i) => (
                <motion.div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden flex items-center justify-center relative"
                  style={{
                    background: cell ? "transparent" : "rgba(139,26,26,0.3)",
                    border: cell ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(255,215,0,0.12)",
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
            <div className="flex gap-2 mb-3 items-center">
              {[
                { key: "checkin", label: "实时签到", icon: "🎯" },
                { key: "wish", label: "心愿墙", icon: "✨" },
                { key: "quiz", label: "AI问答", icon: "🤖" },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => handleTabClick(tab.key as "checkin" | "wish" | "quiz")}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "btn-festive text-white"
                      : "glass-card text-white/60 hover:text-white/90"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
              {/* 自动切换状态指示 */}
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${autoPaused ? "bg-yellow-400/50" : "bg-green-400 animate-pulse"}`} />
                <span className="text-white/30">{autoPaused ? "手动模式" : "自动切换"}</span>
              </div>
            </div>

            {/* 内容区 */}
            <div className="flex-1 glass-card border-red-glow rounded-2xl p-4 overflow-hidden corner-frame">
              <AnimatePresence mode="wait">

                {/* 实时签到动态（自动滚动） */}
                {activeTab === "checkin" && (
                  <motion.div
                    key="checkin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col"
                  >
                    <div className="text-white/50 text-xs mb-3 flex items-center gap-2 flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      实时签到动态（{recentCheckins.length}人已签到）
                    </div>
                    <div className="flex-1 min-h-0">
                      <AutoScrollCheckinList checkins={recentCheckins} />
                    </div>
                  </motion.div>
                )}

                {/* 心愿墙（随机飘动） */}
                {activeTab === "wish" && (
                  <motion.div
                    key="wish"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full relative"
                  >
                    <div className="text-white/50 text-xs mb-2 flex items-center gap-2">
                      <span>✨</span>
                      <span>员工心愿墙（{wishCards.length}张）</span>
                    </div>
                    {wishCards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-[calc(100%-28px)] text-white/30">
                        <div className="text-4xl mb-2">✨</div>
                        <p className="text-sm">等待员工写下心愿...</p>
                      </div>
                    ) : (
                      <div className="relative h-[calc(100%-28px)] overflow-hidden">
                        {wishCards.map((w, i) => (
                          <FloatingWishCard key={w.id} card={w} index={i} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* AI问答 */}
                {activeTab === "quiz" && (
                  <motion.div
                    key="quiz"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col"
                  >
                    <div className="flex items-center justify-between mb-3 flex-shrink-0">
                      <div className="text-white/50 text-xs flex items-center gap-2">
                        <span>🤖</span>
                        <span>AI知识问答（题库{quizAllQuestions.length}道，已出{quizUsedIds.size}道）</span>
                      </div>
                      <button
                        onClick={handleDrawQuestion}
                        className="px-5 py-2 rounded-xl text-sm font-bold btn-festive text-white transition-all hover:scale-105 active:scale-95"
                      >
                        🎲 出题
                      </button>
                    </div>
                    {!quizQuestion ? (
                      <div className="flex flex-col items-center justify-center flex-1 text-white/30">
                        <div className="text-5xl mb-4">🤖</div>
                        <p className="text-base">点击「出题」按钮开始答题</p>
                        <p className="text-xs mt-2 text-white/20">题库共{quizAllQuestions.length}道前沿AI知识题</p>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                        {/* 题目 */}
                        <div className="glass-card rounded-xl p-4" style={{ borderColor: "rgba(255,215,0,0.3)" }}>
                          <p className="text-white font-semibold text-base leading-relaxed">{quizQuestion.question}</p>
                        </div>
                        {/* 选项 */}
                        <div className="grid grid-cols-2 gap-3">
                          {(["A", "B", "C", "D"] as const).map(opt => {
                            const text = quizQuestion[`option${opt}` as keyof QuizQuestion] as string;
                            const isSelected = quizSelected === opt;
                            const isCorrect = quizQuestion.correctAnswer === opt;
                            const answered = quizSelected !== null;
                            let bgStyle = "rgba(255,255,255,0.05)";
                            let borderStyle = "rgba(255,255,255,0.1)";
                            let textColor = "text-white/80";
                            if (answered && isCorrect) {
                              bgStyle = "rgba(34,197,94,0.2)";
                              borderStyle = "rgba(34,197,94,0.6)";
                              textColor = "text-green-300";
                            } else if (answered && isSelected && !isCorrect) {
                              bgStyle = "rgba(239,68,68,0.2)";
                              borderStyle = "rgba(239,68,68,0.6)";
                              textColor = "text-red-300";
                            } else if (!answered && isSelected) {
                              bgStyle = "rgba(255,215,0,0.15)";
                              borderStyle = "rgba(255,215,0,0.5)";
                              textColor = "text-yellow-300";
                            }
                            return (
                              <button
                                key={opt}
                                onClick={() => !answered && setQuizSelected(opt)}
                                disabled={answered}
                                className={`p-3 rounded-xl text-left transition-all ${textColor} ${!answered ? "hover:scale-[1.02] cursor-pointer" : "cursor-default"}`}
                                style={{ background: bgStyle, border: `1px solid ${borderStyle}` }}
                              >
                                <span className="font-bold mr-2">{opt}.</span>{text}
                                {answered && isCorrect && <span className="ml-2">✅</span>}
                                {answered && isSelected && !isCorrect && <span className="ml-2">❌</span>}
                              </button>
                            );
                          })}
                        </div>
                        {/* 答题结果提示 */}
                        {quizSelected && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card rounded-xl p-4"
                            style={{
                              borderColor: quizSelected === quizQuestion.correctAnswer
                                ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"
                            }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">
                                {quizSelected === quizQuestion.correctAnswer ? "✅" : "❌"}
                              </span>
                              <span className={`font-bold text-sm ${
                                quizSelected === quizQuestion.correctAnswer ? "text-green-400" : "text-red-400"
                              }`}>
                                {quizSelected === quizQuestion.correctAnswer
                                  ? "回答正确！"
                                  : `回答错误，正确答案是「${quizQuestion.correctAnswer}」`
                                }
                              </span>
                            </div>
                            {quizQuestion.explanation && (
                              <p className="text-white/60 text-xs leading-relaxed">
                                💡 {quizQuestion.explanation}
                              </p>
                            )}
                          </motion.div>
                        )}
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
                { label: "已出题", value: quizUsedIds.size, icon: "🤖", color: "#ff6b35" },
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
