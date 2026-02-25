import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";

// 计算倒计时
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate + "T09:00:00+08:00").getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

// 粒子背景
function ParticleBackground() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 4 + 3,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-yellow-400/20 animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {/* 网格线 */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,208,96,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,208,96,0.3) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />
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
      <span className="text-xs text-yellow-400/60 font-light tracking-widest">{label}</span>
    </div>
  );
}

const navItems = [
  { path: "/checkin", icon: "✦", label: "AI签到", desc: "立即签到" },
  { path: "/schedule", icon: "◈", label: "活动日程", desc: "全天流程" },
  { path: "/awards", icon: "◆", label: "荣誉殿堂", desc: "奖项展示" },
  { path: "/quiz", icon: "◉", label: "AI问答", desc: "赢红包" },
  { path: "/wish", icon: "✧", label: "心愿卡", desc: "写下心愿" },
  { path: "/profile", icon: "◎", label: "我的", desc: "个人中心" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { data: config } = trpc.event.getConfig.useQuery();
  const { data: checkinCount } = trpc.checkin.getCount.useQuery();

  const eventDate = config?.event_date || "2026-03-02";
  const timeLeft = useCountdown(eventDate);
  const isEventDay = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0;

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-deep-gradient relative overflow-hidden" ref={containerRef}>
      <ParticleBackground />

      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

      <div className="relative z-10 max-w-md mx-auto px-5 py-8 min-h-screen flex flex-col">
        {/* Logo区域 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-between mb-8"
        >
          <img
            src="https://files.manuscdn.com/user_upload_by_module/session_file/309964133946657044/GxUwIVJwQhtvDjzz.jpg"
            alt="中易物联集团"
            className="h-8 object-contain opacity-90"
          />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400/80">
              {checkinCount ?? 0} 人已签到
            </span>
          </div>
        </motion.div>

        {/* 主题区域 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/5 mb-4">
            <span className="text-yellow-400 text-xs tracking-widest">2026 开工盛典</span>
          </div>
          <h1 className="text-2xl font-bold text-gold-gradient mb-2 leading-tight">
            AI智启·同心聚力
          </h1>
          <h2 className="text-xl font-semibold text-yellow-300/80 mb-3">
            焕新出发
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm text-white/50">
            <span>📅 {config?.event_date || "2026-03-02"}</span>
            <span className="w-px h-3 bg-white/20" />
            <span>📍 {config?.event_location || "中易物联集团总部"}</span>
          </div>
        </motion.div>

        {/* 倒计时 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="glass-card border-gold-glow rounded-2xl p-5 mb-6"
        >
          {isEventDay ? (
            <div className="text-center">
              <div className="text-3xl mb-2 animate-pulse-gold">🎉</div>
              <p className="text-gold-gradient text-lg font-bold">盛典正在进行中！</p>
              <p className="text-white/60 text-sm mt-1">快去签到参与活动吧</p>
            </div>
          ) : (
            <>
              <p className="text-center text-white/50 text-xs tracking-widest mb-4 uppercase">
                距离盛典开始
              </p>
              <div className="flex justify-center gap-4">
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

        {/* 签到入口 - 主CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-6"
        >
          {isAuthenticated ? (
            <button
              onClick={() => navigate("/checkin")}
              className="w-full py-4 rounded-2xl font-bold text-lg relative overflow-hidden group"
              style={{
                background: "linear-gradient(135deg, #f5d060 0%, #e8a020 50%, #f5d060 100%)",
                color: "#050a14",
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              <span className="relative flex items-center justify-center gap-2">
                <span className="text-xl">✦</span>
                立即AI签到
                <span className="text-xl">✦</span>
              </span>
            </button>
          ) : (
            <a
              href={getLoginUrl()}
              className="block w-full py-4 rounded-2xl font-bold text-lg text-center"
              style={{
                background: "linear-gradient(135deg, #f5d060 0%, #e8a020 50%, #f5d060 100%)",
                color: "#050a14",
              }}
            >
              登录参与活动
            </a>
          )}
        </motion.div>

        {/* 功能导航网格 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          {navItems.map((item, i) => (
            <motion.button
              key={item.path}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.08 }}
              onClick={() => navigate(item.path)}
              className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 hover:border-yellow-400/40 transition-all active:scale-95"
            >
              <span className="text-yellow-400 text-xl">{item.icon}</span>
              <span className="text-white/90 text-xs font-medium">{item.label}</span>
              <span className="text-white/40 text-[10px]">{item.desc}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* 底部信息 */}
        <div className="mt-auto text-center">
          <p className="text-white/20 text-xs">
            中易物联集团 · 2026 · AI智启新征程
          </p>
        </div>
      </div>

      {/* 底部装饰线 */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
    </div>
  );
}
