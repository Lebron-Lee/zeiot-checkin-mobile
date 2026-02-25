import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useWebSocket, WSMessage } from "@/hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";

// ===== 类型定义 =====
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
  category: string;
  color?: string | null;
  createdAt: Date;
};

type AwardSpeechData = { winnerName: string; awardName: string; speech: string };
type LotteryResultData = { event: { name: string; rewardAmount: number | null }; winners: { name: string; department?: string }[] };
type TeamGroupData = { groupName: string; members: string[]; color: string }[];

// ===== 粒子背景 =====
function TechBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* 网格 */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(245,208,96,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,208,96,0.5) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }} />
      {/* 扫描线 */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(245,208,96,0.1) 2px, rgba(245,208,96,0.1) 4px)`,
        }} />
      {/* 角落装饰 */}
      {["top-4 left-4", "top-4 right-4", "bottom-4 left-4", "bottom-4 right-4"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-12 h-12`}>
          <div className="w-full h-full border-t-2 border-l-2 border-yellow-400/30" style={{ transform: i % 2 === 1 ? "scaleX(-1)" : "", borderRadius: i >= 2 ? "0 0 0 0" : "" }} />
        </div>
      ))}
      {/* 浮动粒子 */}
      {Array.from({ length: 15 }, (_, i) => (
        <div key={i} className="absolute rounded-full bg-yellow-400/10 animate-float"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: `${Math.random() * 4 + 2}px`, height: `${Math.random() * 4 + 2}px`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 5 + 4}s` }} />
      ))}
    </div>
  );
}

// ===== AI头像网格（拼LOGO） =====
function AvatarGrid({ checkins }: { checkins: CheckinRecord[] }) {
  const totalSlots = 25;
  const slots = Array.from({ length: totalSlots }, (_, i) => checkins.find(c => c.gridPosition === i + 1) || null);

  return (
    <div className="grid grid-cols-5 gap-2">
      {slots.map((checkin, i) => (
        <motion.div key={i}
          initial={checkin ? { scale: 0, opacity: 0 } : {}}
          animate={checkin ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", duration: 0.6, delay: 0.1 }}
          className={`aspect-square rounded-xl overflow-hidden relative ${checkin ? "border border-yellow-400/40" : "border border-white/5 bg-white/2"}`}>
          {checkin ? (
            <>
              {checkin.avatarUrl ? (
                <img src={checkin.avatarUrl} alt={checkin.userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-white font-bold text-lg">
                  {checkin.userName[0]}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-1 text-center">
                <p className="text-white text-[10px] truncate font-medium">{checkin.userName}</p>
              </div>
              {/* 新签到发光效果 */}
              <motion.div className="absolute inset-0 rounded-xl border-2 border-yellow-400/60"
                initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 2, delay: 0.5 }} />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-white/10 text-xs">{i + 1}</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ===== 实时签到动态 =====
function CheckinFeed({ checkins }: { checkins: CheckinRecord[] }) {
  const recent = [...checkins].slice(0, 8);
  return (
    <div className="space-y-2 overflow-hidden max-h-[320px]">
      <AnimatePresence initial={false}>
        {recent.map((c) => (
          <motion.div key={c.id}
            initial={{ opacity: 0, x: -20, height: 0 }}
            animate={{ opacity: 1, x: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 glass-card rounded-xl px-3 py-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-yellow-400/30">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-xs font-bold text-white">
                  {c.userName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white/90 text-sm font-medium truncate">{c.userName}</span>
                {c.department && <span className="text-white/40 text-xs flex-shrink-0">{c.department}</span>}
              </div>
              {c.message && <p className="text-white/50 text-xs truncate">{c.message}</p>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400/70 text-[10px]">已签到</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ===== 心愿墙 =====
function WishWall({ wishes }: { wishes: WishCardRecord[] }) {
  const categoryIcons: Record<string, string> = { career: "🚀", team: "🤝", personal: "✨", company: "🏢" };
  const recent = wishes.slice(0, 9);

  return (
    <div className="grid grid-cols-3 gap-2">
      <AnimatePresence>
        {recent.map((wish, i) => (
          <motion.div key={wish.id}
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: (i % 3 - 1) * 2 }}
            className="rounded-xl p-3 relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${wish.color || "#1a2a4a"} 0%, ${wish.color || "#1a2a4a"}cc 100%)`, border: "1px solid rgba(245,208,96,0.2)" }}>
            <div className="text-lg mb-1">{categoryIcons[wish.category] || "✨"}</div>
            <p className="text-white/80 text-xs leading-relaxed line-clamp-3">{wish.content}</p>
            <p className="text-white/30 text-[10px] mt-1">—— {wish.userName}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ===== AI颁奖词弹窗 =====
function AwardSpeechModal({ data, onClose }: { data: AwardSpeechData; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 15000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="max-w-2xl w-full mx-8 glass-card border-gold-glow rounded-3xl p-8 text-center"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-4">🏆</div>
        <div className="text-yellow-400 text-sm tracking-widest mb-2 uppercase">AI颁奖词</div>
        <h2 className="text-3xl font-bold text-gold-gradient mb-1">{data.awardName}</h2>
        <h3 className="text-xl text-white/80 mb-6">{data.winnerName}</h3>
        <div className="border-t border-yellow-400/20 pt-6">
          <p className="text-white/80 text-lg leading-relaxed italic">"{data.speech}"</p>
        </div>
        <button onClick={onClose} className="mt-6 text-white/30 text-sm hover:text-white/50 transition-colors">
          点击关闭
        </button>
      </motion.div>
    </motion.div>
  );
}

// ===== 抽奖结果弹窗 =====
function LotteryResultModal({ data, onClose }: { data: LotteryResultData; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 12000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", duration: 0.8 }}
        className="max-w-xl w-full mx-8 glass-card border-gold-glow rounded-3xl p-8 text-center"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-5xl mb-4 animate-bounce">🎉</div>
        <div className="text-yellow-400 text-sm tracking-widest mb-2">{data.event.name}</div>
        <h2 className="text-2xl font-bold text-gold-gradient mb-6">恭喜获奖！</h2>
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {data.winners.map((w, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.2 + 0.3 }}
              className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400/30 to-blue-600/30 flex items-center justify-center text-2xl font-bold text-white border-2 border-yellow-400/50 mb-2">
                {w.name[0]}
              </div>
              <p className="text-white/90 font-bold">{w.name}</p>
              {w.department && <p className="text-white/40 text-xs">{w.department}</p>}
            </motion.div>
          ))}
        </div>
        {data.event.rewardAmount && (
          <div className="text-gold-gradient text-3xl font-bold mb-4">¥{data.event.rewardAmount}</div>
        )}
        <button onClick={onClose} className="text-white/30 text-sm hover:text-white/50 transition-colors">
          点击关闭
        </button>
      </motion.div>
    </motion.div>
  );
}

// ===== 主大屏组件 =====
export default function BigScreen() {
  const [activeTab, setActiveTab] = useState<"checkin" | "wish" | "groups">("checkin");
  const [checkins, setCheckins] = useState<CheckinRecord[]>([]);
  const [wishes, setWishes] = useState<WishCardRecord[]>([]);
  const [awardSpeech, setAwardSpeech] = useState<AwardSpeechData | null>(null);
  const [lotteryResult, setLotteryResult] = useState<LotteryResultData | null>(null);
  const [groups, setGroups] = useState<TeamGroupData>([]);

  // 初始数据加载
  const { data: initialCheckins } = trpc.checkin.getAll.useQuery();
  const { data: initialWishes } = trpc.wishCard.getAll.useQuery();
  const { data: checkinCount } = trpc.checkin.getCount.useQuery();
  const { data: initialGroups } = trpc.lottery.getGroups.useQuery();

  useEffect(() => {
    if (initialCheckins) setCheckins(initialCheckins as CheckinRecord[]);
  }, [initialCheckins]);

  useEffect(() => {
    if (initialWishes) setWishes(initialWishes as WishCardRecord[]);
  }, [initialWishes]);

  useEffect(() => {
    if (initialGroups) setGroups(initialGroups.map(g => ({ ...g, color: g.color || '#f5d060' })));
  }, [initialGroups]);

  // WebSocket实时更新
  const handleWSMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {
      case "NEW_CHECKIN":
        setCheckins((prev) => [msg.data as CheckinRecord, ...prev]);
        break;
      case "NEW_WISH_CARD":
        setWishes((prev) => [msg.data as WishCardRecord, ...prev]);
        setActiveTab("wish");
        setTimeout(() => setActiveTab("checkin"), 8000);
        break;
      case "AWARD_SPEECH":
        setAwardSpeech(msg.data as AwardSpeechData);
        break;
      case "LOTTERY_RESULT":
        setLotteryResult(msg.data as LotteryResultData);
        break;
      case "TEAM_GROUPS":
        setGroups(msg.data as TeamGroupData);
        setActiveTab("groups");
        break;
    }
  }, []);

  const { connected } = useWebSocket(handleWSMessage);

  // 自动轮播
  useEffect(() => {
    const tabs: typeof activeTab[] = ["checkin", "wish", "groups"];
    let idx = 0;
    const timer = setInterval(() => {
      idx = (idx + 1) % tabs.length;
      setActiveTab(tabs[idx]);
    }, 12000);
    return () => clearInterval(timer);
  }, []);

  const totalAttendees = 25;
  const checkedIn = checkinCount ?? checkins.length;

  return (
    <div className="min-h-screen bg-deep-gradient overflow-hidden relative" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
      <TechBackground />

      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/70 to-transparent" />

      <div className="relative z-10 h-screen flex flex-col p-6">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/309964133946657044/GxUwIVJwQhtvDjzz.jpg"
              alt="中易物联集团" className="h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gold-gradient">2026 开工盛典</h1>
              <p className="text-white/40 text-xs tracking-widest">AI智启·同心聚力·焕新出发</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* 签到进度 */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gold-gradient">{checkedIn}</div>
              <div className="text-white/40 text-xs">/ {totalAttendees} 人已签到</div>
              <div className="mt-1 h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${Math.min(100, (checkedIn / totalAttendees) * 100)}%` }}
                  transition={{ duration: 1 }} />
              </div>
            </div>

            {/* 连接状态 */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              <span className={`text-xs ${connected ? "text-green-400/70" : "text-red-400/70"}`}>
                {connected ? "实时同步" : "连接中..."}
              </span>
            </div>

            {/* 时间 */}
            <LiveClock />
          </div>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
          {/* 左侧：AI头像拼LOGO */}
          <div className="col-span-5 flex flex-col">
            <div className="glass-card border-gold-glow rounded-2xl p-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white/80 font-semibold flex items-center gap-2">
                  <span className="text-yellow-400">◆</span>
                  AI头像签到墙
                </h2>
                <span className="text-yellow-400/60 text-xs">{checkedIn}/{totalAttendees}</span>
              </div>
              <div className="flex-1">
                <AvatarGrid checkins={checkins} />
              </div>
            </div>
          </div>

          {/* 右侧：动态内容 */}
          <div className="col-span-7 flex flex-col gap-4">
            {/* 标签切换 */}
            <div className="flex gap-2">
              {[
                { key: "checkin", label: "实时签到", icon: "✦" },
                { key: "wish", label: "心愿墙", icon: "✧" },
                { key: "groups", label: "分组结果", icon: "◈" },
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all ${
                    activeTab === tab.key
                      ? "bg-yellow-400/20 border border-yellow-400/50 text-yellow-400"
                      : "glass-card text-white/50 hover:text-white/70"
                  }`}>
                  <span>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="glass-card border-gold-glow rounded-2xl p-4 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === "checkin" && (
                  <motion.div key="checkin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      实时签到动态
                    </h3>
                    <CheckinFeed checkins={checkins} />
                  </motion.div>
                )}
                {activeTab === "wish" && (
                  <motion.div key="wish" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
                      <span>✧</span>
                      员工心愿墙 ({wishes.length})
                    </h3>
                    {wishes.length > 0 ? <WishWall wishes={wishes} /> : (
                      <div className="flex items-center justify-center h-48 text-white/20 text-sm">
                        心愿卡将在员工提交后实时显示
                      </div>
                    )}
                  </motion.div>
                )}
                {activeTab === "groups" && (
                  <motion.div key="groups" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h3 className="text-white/60 text-sm mb-3">AI随机分组结果</h3>
                    {groups.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {groups.map((group) => (
                          <div key={group.groupName} className="rounded-xl p-3 border"
                            style={{ background: `${group.color}15`, borderColor: `${group.color}40` }}>
                            <h4 className="font-bold text-sm mb-2" style={{ color: group.color }}>{group.groupName}</h4>
                            <div className="space-y-1">
                              {group.members.map((m) => (
                                <div key={m} className="text-white/70 text-xs flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full" style={{ background: group.color }} />
                                  {m}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-white/20 text-sm">
                        分组结果将在管理员操作后显示
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 底部统计 */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "已签到", value: checkedIn, icon: "✓", color: "text-green-400" },
                { label: "心愿卡", value: wishes.length, icon: "♥", color: "text-pink-400" },
                { label: "分组数", value: groups.length, icon: "◈", color: "text-blue-400" },
                { label: "活动进行中", value: "🔴", icon: "", color: "text-yellow-400" },
              ].map((stat) => (
                <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-white/40 text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-400/20" />
          <span className="text-white/20 text-xs tracking-widest">中易物联集团 · 2026 · AI智启新征程</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-400/20" />
        </div>
      </div>

      {/* 弹窗 */}
      <AnimatePresence>
        {awardSpeech && <AwardSpeechModal data={awardSpeech} onClose={() => setAwardSpeech(null)} />}
        {lotteryResult && <LotteryResultModal data={lotteryResult} onClose={() => setLotteryResult(null)} />}
      </AnimatePresence>
    </div>
  );
}

// 实时时钟
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-right">
      <div className="text-white/80 font-mono text-lg">
        {time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-white/30 text-xs">
        {time.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "short" })}
      </div>
    </div>
  );
}
