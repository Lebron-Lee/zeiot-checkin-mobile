import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion, AnimatePresence } from "framer-motion";

// 计算倒计时
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(targetDate + "T09:00:00+08:00").getTime();
    const update = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return timeLeft;
}

// 判断签到按钮是否可用（2026-03-01 08:00:00 CST 之后）
function useCheckinAvailable() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const unlockTime = new Date("2026-03-01T08:00:00+08:00").getTime();
    const check = () => setAvailable(Date.now() >= unlockTime);
    check();
    const t = setInterval(check, 10000);
    return () => clearInterval(t);
  }, []);
  return available;
}

// 烟花粒子背景
function FestiveBackground() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 4 + 3,
    color: i % 3 === 0 ? "rgba(255,215,0,0.5)" : i % 3 === 1 ? "rgba(255,100,100,0.4)" : "rgba(255,255,255,0.3)",
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* 粒子 */}
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
      {/* 网格 */}
      <div className="absolute inset-0 bg-tech-grid opacity-40" />
      {/* 顶部光晕 */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full opacity-20"
        style={{ background: "radial-gradient(ellipse, rgba(232,0,29,0.8) 0%, transparent 70%)" }} />
    </div>
  );
}

// 倒计时数字块
function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="glass-card border-gold-glow rounded-xl w-16 h-16 flex items-center justify-center mb-1">
        <span className="text-2xl font-bold text-gold-gradient countdown-digit font-mono">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-xs text-yellow-300/70 font-light tracking-widest">{label}</span>
    </div>
  );
}

const navItems = [
  { path: "/checkin", icon: "🎯", label: "AI签到", desc: "立即签到", color: "from-red-800/60 to-red-600/40" },
  { path: "/schedule", icon: "📅", label: "活动日程", desc: "全天流程", color: "from-orange-900/60 to-orange-700/40" },
  { path: "/awards", icon: "🏆", label: "荣誉殿堂", desc: "奖项展示", color: "from-yellow-900/60 to-yellow-700/40" },
  { path: "/quiz", icon: "🤖", label: "AI问答", desc: "涨知识", color: "from-red-900/60 to-pink-800/40" },
  { path: "/wish", icon: "✨", label: "心愿卡", desc: "写下心愿", color: "from-purple-900/60 to-purple-700/40" },
  { path: "/profile", icon: "👤", label: "我的", desc: "个人中心", color: "from-rose-900/60 to-rose-700/40" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const { data: config } = trpc.event.getConfig.useQuery();
  const { data: checkinCount } = trpc.checkin.getCount.useQuery();
  const checkinAvailable = useCheckinAvailable();

  const eventDate = config?.event_date || "2026-03-02";
  const timeLeft = useCountdown(eventDate);
  const isEventDay = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0;

  const handleCheckin = () => {
    if (!checkinAvailable) return;
    navigate("/checkin");
  };

  return (
    <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
      <FestiveBackground />

      {/* 顶部金色装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6 min-h-screen flex flex-col">

        {/* 顶部Logo + 签到人数 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-6"
        >
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/309964133946657044/GxUwIVJwQhtvDjzz.jpg"
            alt="中易物联集团"
            className="h-9 object-contain"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,215,0,0.4))" }}
          />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-300 font-medium">{checkinCount ?? 0} 人已签到</span>
          </div>
        </motion.div>

        {/* 主题标题 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 mb-3">
            <span className="text-yellow-300 text-xs tracking-[0.2em] font-medium">🎊 2026 开工盛典 🎊</span>
          </div>
          <h1 className="text-3xl font-bold text-gold-gradient mb-1 leading-tight" style={{ fontFamily: "'Noto Serif SC', serif" }}>
            AI智启·同心聚力
          </h1>
          <h2 className="text-xl font-semibold text-white/90 mb-3">焕新出发</h2>
          <div className="flex items-center justify-center gap-3 text-sm text-white/60">
            <span>📅 {config?.event_date || "2026-03-02"}</span>
            <span className="w-px h-3 bg-white/20" />
            <span>📍 {config?.event_location || "中易物联集团总部"}</span>
          </div>
        </motion.div>

        {/* 倒计时 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="glass-card border-gold-glow rounded-2xl p-5 mb-5"
        >
          {isEventDay ? (
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-gold-gradient text-lg font-bold">盛典正在进行中！</p>
              <p className="text-white/60 text-sm mt-1">快去签到参与活动吧</p>
            </div>
          ) : (
            <>
              <p className="text-center text-white/50 text-xs tracking-[0.2em] mb-4 uppercase">距离盛典开始</p>
              <div className="flex justify-center gap-3">
                <CountdownBlock value={timeLeft.days} label="天" />
                <div className="text-yellow-400/60 text-2xl font-light self-start mt-3">:</div>
                <CountdownBlock value={timeLeft.hours} label="时" />
                <div className="text-yellow-400/60 text-2xl font-light self-start mt-3">:</div>
                <CountdownBlock value={timeLeft.minutes} label="分" />
                <div className="text-yellow-400/60 text-2xl font-light self-start mt-3">:</div>
                <CountdownBlock value={timeLeft.seconds} label="秒" />
              </div>
            </>
          )}
        </motion.div>

        {/* 签到主按钮 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="mb-5"
        >
          {!isAuthenticated ? (
            <a
              href={getLoginUrl()}
              className="block w-full py-4 text-center rounded-2xl font-bold text-lg btn-festive"
            >
              🎊 登录参与活动
            </a>
          ) : checkinAvailable ? (
            <button
              onClick={handleCheckin}
              className="w-full py-4 rounded-2xl font-bold text-lg btn-festive animate-pulse-red"
            >
              <span className="flex items-center justify-center gap-2">
                <span>🎯</span> 立即AI签到 <span>🎯</span>
              </span>
            </button>
          ) : (
            <div className="w-full">
              <button
                disabled
                className="w-full py-4 rounded-2xl font-bold text-base btn-disabled"
              >
                🔒 签到将于 3月1日 08:00 开启
              </button>
              <p className="text-center text-yellow-300/60 text-xs mt-2">
                活动预热中，敬请期待 ✨
              </p>
            </div>
          )}
        </motion.div>

        {/* 功能导航网格 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          {navItems.map((item, i) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 + i * 0.07 }}
              onClick={() => navigate(item.path)}
              className={`rounded-xl p-3 flex flex-col items-center gap-1.5 border border-yellow-400/20 hover:border-yellow-400/50 transition-all active:scale-95 bg-gradient-to-br ${item.color}`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-white/95 text-xs font-semibold">{item.label}</span>
              <span className="text-white/50 text-[10px]">{item.desc}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* 底部信息 */}
        <div className="mt-auto text-center pb-4">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-yellow-400/30" />
            <span className="text-yellow-400/60 text-xs">🏮</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-yellow-400/30" />
          </div>
          <p className="text-white/25 text-xs">中易物联集团 · 2026 · AI智启新征程</p>
        </div>
      </div>

      {/* 底部金色装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
    </div>
  );
}
