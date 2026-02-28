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

// 红包弹窗
function RedPacketModal({ packet, onClose }: { packet: { recipientName: string; wishContent: string } | null; onClose: () => void }) {
  useEffect(() => {
    if (packet) {
      const t = setTimeout(onClose, 10000);
      return () => clearTimeout(t);
    }
  }, [packet, onClose]);
  return (
    <AnimatePresence>
      {packet && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(80,0,0,0.90)" }}
          onClick={onClose}
        >
          {/* 散落红包装饰 */}
          {["🧧","🧧","🧧","🧧","🧧","🧧"].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl pointer-events-none"
              initial={{ y: -80, x: (i - 2.5) * 180, opacity: 1, rotate: 0 }}
              animate={{ y: "110vh", rotate: (i % 2 === 0 ? 360 : -360), opacity: [1, 1, 0] }}
              transition={{ duration: 3 + i * 0.4, delay: i * 0.2, ease: "easeIn" }}
            >
              🧧
            </motion.div>
          ))}
          <motion.div
            initial={{ scale: 0.3, y: 80 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.3, y: 80 }}
            transition={{ type: "spring", damping: 16, stiffness: 200 }}
            className="rounded-3xl p-10 max-w-lg mx-8 text-center relative"
            style={{
              background: "linear-gradient(160deg, #c0392b 0%, #8b1a1a 40%, #6b0f0f 100%)",
              border: "3px solid rgba(255,215,0,0.8)",
              boxShadow: "0 0 60px rgba(255,100,0,0.5), 0 0 120px rgba(255,50,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 金圆装饰 */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #ffd700, #ff8c00)", border: "3px solid #fff", boxShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
              <span className="text-2xl">🏧</span>
            </div>
            <div className="mt-6 mb-2 text-yellow-200/80 text-sm tracking-widest">恭喜收到红包</div>
            <div className="text-5xl font-bold text-white mb-2" style={{ textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
              {packet.recipientName}
            </div>
            <div className="text-yellow-300 text-2xl font-semibold mb-4">🧧 恭喜发财！大吉大利！</div>
            {packet.wishContent && (
              <div className="bg-black/20 rounded-xl p-3 mb-4">
                <p className="text-white/80 text-sm leading-relaxed">“{packet.wishContent}”</p>
              </div>
            )}
            <div className="text-yellow-200/40 text-xs">点击任意处关闭 · 10秒后自动关闭</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 瀑布流心愿墙组件：3列错位垂直滚动，彻底避免卡片重叠
const COLUMN_COUNT = 3;
// 各列滚动速度（像素/秒），不同速度产生错落感
const COLUMN_SPEEDS = [35, 28, 42];
// 各列初始垂直偏移（px），产生错位效果
const COLUMN_OFFSETS = [0, -80, -160];

const wishColors: Record<string, { bg: string; border: string; glow: string }> = {
  red:    { bg: "rgba(120,0,0,0.80)",    border: "rgba(255,100,100,0.45)",  glow: "rgba(255,80,80,0.15)" },
  gold:   { bg: "rgba(100,65,0,0.80)",   border: "rgba(255,215,0,0.45)",   glow: "rgba(255,215,0,0.15)" },
  purple: { bg: "rgba(65,0,100,0.80)",   border: "rgba(180,100,255,0.45)", glow: "rgba(180,100,255,0.15)" },
  green:  { bg: "rgba(0,70,35,0.80)",    border: "rgba(100,220,130,0.45)", glow: "rgba(100,220,130,0.15)" },
};

function WishCard({ card }: { card: WishCardRecord }) {
  const colors = wishColors[card.color || "red"] || wishColors.red;
  return (
    <div
      className="rounded-2xl p-4 mb-3 flex-shrink-0"
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: `0 4px 20px rgba(0,0,0,0.4), inset 0 0 20px ${colors.glow}`,
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: `1.5px solid ${colors.border}` }}>
          {card.userAvatar ? (
            <img src={card.userAvatar} alt={card.userName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xs font-bold text-yellow-300"
              style={{ background: "linear-gradient(135deg, #8b1a1a, #c0392b)" }}
            >
              {card.userName.slice(0, 1)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-yellow-300/90 text-xs font-semibold truncate block">{card.userName}</span>
          <span className="text-white/30 text-[10px]">写下心愿</span>
        </div>
        <span className="text-white/20 text-[10px] flex-shrink-0">✨</span>
      </div>
      <p className="text-white/90 text-sm leading-relaxed">
        &ldquo;{card.content}&rdquo;
      </p>
    </div>
  );
}

function WaterfallColumn({ cards, speed, initialOffset, visible }: {
  cards: WishCardRecord[];
  speed: number;
  initialOffset: number;
  visible: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const posRef = useRef<number>(initialOffset);

  useEffect(() => {
    if (!visible || cards.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    let lastTime = 0;
    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000; // 转为秒
      lastTime = timestamp;

      posRef.current -= speed * delta;
      // 内容高度的一半（因为内容复制了两份）
      const halfHeight = container.scrollHeight / 2;
      if (Math.abs(posRef.current) >= halfHeight) {
        posRef.current += halfHeight;
      }
      container.style.transform = `translateY(${posRef.current}px)`;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [cards, speed, visible]);

  // 复制两份内容实现无缝循环
  const doubled = [...cards, ...cards];

  return (
    <div className="flex-1 overflow-hidden relative" style={{ minWidth: 0 }}>
      <div ref={containerRef} style={{ willChange: "transform" }}>
        {doubled.map((card, i) => (
          <WishCard key={`${card.id}-${i}`} card={card} />
        ))}
      </div>
    </div>
  );
}

function DanmakuWishWall({ cards, visible }: { cards: WishCardRecord[]; visible: boolean }) {
  // 将卡片按列分配（轮流分配到3列）
  const columns: WishCardRecord[][] = Array.from({ length: COLUMN_COUNT }, () => []);
  cards.forEach((card, i) => {
    columns[i % COLUMN_COUNT].push(card);
  });

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ visibility: visible ? "visible" : "hidden", pointerEvents: visible ? "auto" : "none" }}
    >
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white/30">
          <div className="text-4xl mb-2">✨</div>
          <p className="text-sm">等待员工写下心愿...</p>
        </div>
      ) : (
        <div className="flex gap-4 h-full px-2 pt-2">
          {columns.map((colCards, colIdx) => (
            <WaterfallColumn
              key={colIdx}
              cards={colCards.length > 0 ? colCards : cards.slice(0, Math.max(1, Math.floor(cards.length / 3)))}
              speed={COLUMN_SPEEDS[colIdx]}
              initialOffset={COLUMN_OFFSETS[colIdx]}
              visible={visible}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// 签到动态自动滚动列表
function AutoScrollCheckinList({ checkins }: { checkins: CheckinRecord[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayList, setDisplayList] = useState<CheckinRecord[]>([]);

  // 每次checkins更新时，去重（同一userId只保留最新一条）并按时间倒序
  useEffect(() => {
    const deduped = Object.values(
      checkins.reduce((acc, c) => {
        // 同一用户名只保留最新的签到记录
        if (!acc[c.userName] || new Date(c.checkedInAt) > new Date(acc[c.userName].checkedInAt)) {
          acc[c.userName] = c;
        }
        return acc;
      }, {} as Record<string, CheckinRecord>)
    ).sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());
    setDisplayList(deduped);
  }, [checkins]);

  // 自动向上滚动，速度根据记录数自适应
  useEffect(() => {
    const container = containerRef.current;
    if (!container || displayList.length === 0) return;
    let animId: number;
    let lastTime = 0;
    // 记录越多滚动越慢：<5条 0.15px/ms，5-10条 0.25px/ms，>10条 0.35px/ms
    const speed = displayList.length < 5 ? 0.15 : displayList.length < 10 ? 0.25 : 0.35;

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

  // 记录较少时复制一份用于无缝循环
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
  const [redPacketModal, setRedPacketModal] = useState<{ recipientName: string; wishContent: string } | null>(null);
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
      const data = checkinData as CheckinRecord[];
      setCheckins(data);
      // 初始化时去重：同一用户名只保留最新签到，按时间倒序取前15条
      const deduped = Object.values(
        data.reduce((acc, c) => {
          if (!acc[c.userName] || new Date(c.checkedInAt) > new Date(acc[c.userName].checkedInAt)) {
            acc[c.userName] = c;
          }
          return acc;
        }, {} as Record<string, CheckinRecord>)
      ).sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()).slice(0, 15);
      setRecentCheckins(deduped);
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

  // 加载AI问答题库（大屏端专用接口，含正确答案和解析）
  const { data: quizData } = trpc.quiz.getQuestionsWithAnswers.useQuery();
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
        // 按 id 替换（更新头像/信息），不存在则追加
        const exists = prev.find(c => c.id === d.id);
        if (exists) return prev.map(c => c.id === d.id ? d : c);
        return [...prev, d];
      });
      // 新签到时，先移除同名旧记录，再将新记录插入顶部
      setRecentCheckins(prev => [d, ...prev.filter(c => c.userName !== d.userName)].slice(0, 15));
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
    if (msg.type === "RED_PACKET" && msg.data) {
      const d = msg.data as { recipientName: string; wishContent: string };
      setRedPacketModal(d);
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
      <RedPacketModal packet={redPacketModal} onClose={() => setRedPacketModal(null)} />

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
          <div className="w-[480px] flex-shrink-0 glass-card border-gold-glow rounded-2xl p-4 flex flex-col corner-frame">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">🎯</span>
                <span className="text-white/80 text-sm font-semibold">签到墙</span>
              </div>
              <span className="text-yellow-400/70 text-xs">{checkinCount}/{totalSeats}</span>
            </div>
            {/* 5列网格，每格包含头像+名字 */}
            <div className="grid grid-cols-5 gap-2 flex-1 content-start">
              {gridCells.map((cell, i) => (
                <motion.div
                  key={i}
                  className="relative aspect-square rounded-xl overflow-hidden"
                  style={{
                    background: cell ? "rgba(139,26,26,0.15)" : "rgba(139,26,26,0.3)",
                    border: cell ? "1px solid rgba(255,215,0,0.5)" : "1px solid rgba(255,215,0,0.12)",
                  }}
                  initial={cell ? { scale: 0, opacity: 0 } : {}}
                  animate={cell ? { scale: 1, opacity: 1 } : {}}
                  transition={{ type: "spring", damping: 15 }}
                >
                  {cell ? (
                    <>
                      {/* 头像平铺整个方形区域 */}
                      {cell.avatarUrl ? (
                        <img
                          src={cell.avatarUrl}
                          alt={cell.userName}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: "linear-gradient(135deg, #8b1a1a, #c0392b)" }}>
                          <span className="text-white font-bold text-xl">{cell.userName.slice(0, 1)}</span>
                        </div>
                      )}
                      {/* 名字标签：绝对定位在底部 */}
                      <div
                        className="absolute bottom-0 left-0 right-0 px-1 py-0.5 text-center"
                        style={{ background: "rgba(0,0,0,0.6)" }}
                      >
                        <span className="text-white text-[10px] font-medium leading-tight block truncate">
                          {cell.userName}
                        </span>
                      </div>
                      {/* 新签到发光动画 */}
                      <motion.div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 2, delay: 0.5 }}
                        style={{ boxShadow: "inset 0 0 20px rgba(255,215,0,0.6)" }}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white/20 text-xs font-mono">{i + 1}</span>
                    </div>
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
            <div className="flex-1 glass-card border-red-glow rounded-2xl p-4 overflow-hidden corner-frame relative">
              {/* 心愿墙弹幕——始终渲染，用 visibility 控制显隐，页签切换后动画不中断 */}
              <div
                className="absolute inset-4"
                style={{ visibility: activeTab === "wish" ? "visible" : "hidden", zIndex: activeTab === "wish" ? 1 : 0 }}
              >
                <div className="text-white/50 text-xs mb-2 flex items-center gap-2">
                  <span>✨</span>
                  <span>员工心愿墙（{wishCards.length}张）</span>
                </div>
                <div className="relative overflow-hidden" style={{ height: "calc(100% - 28px)" }}>
                  <DanmakuWishWall cards={wishCards} visible={activeTab === "wish"} />
                </div>
              </div>

              <AnimatePresence mode="wait">

                {/* 实时签到动态（自动滚动） */}
                {activeTab === "checkin" && (
                  <motion.div
                    key="checkin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col relative z-10"
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
                        <span>AI知识问答</span>
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
                        <p className="text-xs mt-2 text-white/20">点击「出题」开始活动现场互动</p>
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

            {/* 底部统计：紧凑横排，减小内边距和字体，空出更多空间给上方页签 */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[
                { label: "已签到", value: checkinCount, icon: "🎯", color: "#e8001d" },
                { label: "心愿卡", value: wishCards.length, icon: "✨", color: "#ffd700" },
                { label: "已出题", value: quizUsedIds.size, icon: "🤖", color: "#ff6b35" },
                { label: "活动进行中", value: "", icon: "🔴", color: "#22c55e", isStatus: true },
              ].map((stat, i) => (
                <div key={i} className="glass-card rounded-lg px-2 py-1.5 text-center flex items-center justify-center gap-2"
                  style={{ borderColor: stat.color + "40" }}>
                  <span className="text-base flex-shrink-0">{stat.icon}</span>
                  {stat.isStatus ? (
                    <span className="text-xs text-green-400 font-medium animate-pulse">{stat.label}</span>
                  ) : (
                    <span className="text-sm font-bold" style={{ color: stat.color }}>
                      {stat.value} <span className="text-white/40 text-xs font-normal">{stat.label}</span>
                    </span>
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
