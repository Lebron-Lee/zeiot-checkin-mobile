import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Trophy, Gamepad2, Mic, Star, Zap, Users, Heart } from "lucide-react";

type Session = "morning" | "afternoon";

interface ScheduleItem {
  time: string;
  duration: string;
  title: string;
  subtitle: string;
  detail: string;
  tag: string;
  highlight?: boolean;
  icon: React.ReactNode;
  cashInfo?: string;
}

const morningItems: ScheduleItem[] = [
  {
    time: "08:30",
    duration: "30 分钟",
    title: "AI 数字签到入场",
    subtitle: "扫码生成 AI 头像，投屏拼成公司 LOGO",
    detail: "扫描专属二维码完成签到，系统自动生成您的 AI 数字头像，实时投屏拼接成中易物联集团 LOGO，营造科技仪式感，快速收心。",
    tag: "AI 签到",
    highlight: true,
    icon: <Zap className="w-4 h-4" />,
  },
  {
    time: "09:00",
    duration: "15 分钟",
    title: "开场致辞 · 收心动员",
    subtitle: "总经理讲：收心、聚力、AI 新征程",
    detail: "总经理发表开工致辞，强调 2026 年全面 AI 化战略方向，提振全员士气，凝聚团队力量，共启新征程。",
    tag: "致辞",
    icon: <Mic className="w-4 h-4" />,
  },
  {
    time: "09:15",
    duration: "45 分钟",
    title: "2026 集团工作规划宣贯",
    subtitle: "AI 化工作落地解读 + 现场演示",
    detail: "高管团队深度解读 2026 年集团 AI 化工作规划，结合 AI 可视化 PPT 与工具现场演示，讲透「为什么 AI、怎么 AI」，明确全年方向。",
    tag: "战略宣贯",
    highlight: true,
    icon: <Star className="w-4 h-4" />,
  },
  {
    time: "10:00",
    duration: "15 分钟",
    title: "茶歇 · AI 知识小问答",
    subtitle: "答对 AI 知识题，赢取现金奖励",
    detail: "休息片刻，轻松互动。通过手机参与 AI 知识小问答，答对即可赢取小现金奖励（50 元红包），轻松巩固 AI 认知，活跃现场氛围。",
    tag: "互动问答",
    icon: <Zap className="w-4 h-4" />,
    cashInfo: "小红包 50 元",
  },
  {
    time: "10:15",
    duration: "65 分钟",
    title: "双奖项隆重表彰典礼",
    subtitle: "AI 效率革命奖 · 年度优秀员工奖",
    detail: "年度最高荣誉时刻！颁发「AI 效率革命奖」与「年度优秀员工奖」各 3 名，AI 颁奖词大屏同步播放，颁奖、合影、代表发言，大额现金红包当场发放（800 元/人）。",
    tag: "颁奖典礼",
    highlight: true,
    icon: <Trophy className="w-4 h-4" />,
    cashInfo: "现金 800 元/人",
  },
  {
    time: "11:20",
    duration: "40 分钟",
    title: "AI 誓师立愿",
    subtitle: "写心愿卡 · 投入心愿箱 · 全员宣誓",
    detail: "每位员工手写心愿卡，投入心愿箱，随后全员起立，在 AI 宣誓背景音乐中共同宣誓，统一 2026 年目标，收心到位，满满仪式感。",
    tag: "誓师仪式",
    icon: <Heart className="w-4 h-4" />,
  },
];

const afternoonItems: ScheduleItem[] = [
  {
    time: "13:30",
    duration: "30 分钟",
    title: "AI 随机分组 · 破冰热场",
    subtitle: "AI 软件随机组队，打破部门壁垒",
    detail: "AI 分组系统智能随机组队，打破部门壁垒，快速热场拉近距离。各组领取队旗、确定队名，准备迎接团建挑战！",
    tag: "AI 分组",
    highlight: true,
    icon: <Users className="w-4 h-4" />,
  },
  {
    time: "14:00",
    duration: "150 分钟",
    title: "AI 主题现金游戏团建",
    subtitle: "四大游戏 · 全员参与 · 现金池 2000 元",
    detail: "四大核心游戏轮番上阵：①「AI 智多星」抢答赛——考验 AI 知识；②「团队 AI 接力赛」——协作竞速；③「现金盲盒大作战」——神秘奖励；④「AI 幸运大抽奖」——压轴惊喜。总现金池 2000 元，分散发放，人人有机会，不搞独赢！",
    tag: "核心团建",
    highlight: true,
    icon: <Gamepad2 className="w-4 h-4" />,
    cashInfo: "现金池 2000 元",
  },
  {
    time: "16:30",
    duration: "60 分钟",
    title: "文艺表演 · 风采展示",
    subtitle: "歌曲 / 舞蹈 / AI 创意节目，每节目均有现金鼓励",
    detail: "员工代表自由展示才艺，歌曲、舞蹈、AI 创意节目均可。每个节目设现金鼓励奖（100-200 元），自由放松，展现活力，为全天活动画上欢乐句号。",
    tag: "文艺表演",
    icon: <Mic className="w-4 h-4" />,
    cashInfo: "100-200 元/节目",
  },
];

const tagColorMap: Record<string, { bg: string; text: string; border: string }> = {
  "AI 签到":    { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
  "致辞":       { bg: "bg-blue-500/15",   text: "text-blue-300",   border: "border-blue-500/30"   },
  "战略宣贯":   { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
  "互动问答":   { bg: "bg-green-500/15",  text: "text-green-300",  border: "border-green-500/30"  },
  "颁奖典礼":   { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30"  },
  "誓师仪式":   { bg: "bg-rose-500/15",   text: "text-rose-300",   border: "border-rose-500/30"   },
  "AI 分组":    { bg: "bg-cyan-500/15",   text: "text-cyan-300",   border: "border-cyan-500/30"   },
  "核心团建":   { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30" },
  "文艺表演":   { bg: "bg-pink-500/15",   text: "text-pink-300",   border: "border-pink-500/30"   },
};

function ScheduleCard({ item, index, isExpanded, onToggle }: {
  item: ScheduleItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tagStyle = tagColorMap[item.tag] ?? { bg: "bg-white/10", text: "text-white/60", border: "border-white/20" };

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="relative flex gap-3"
    >
      {/* 时间轴节点 */}
      <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 20 }}>
        <div className={`w-4 h-4 rounded-full flex items-center justify-center z-10 mt-4 ${
          item.highlight
            ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-500/40"
            : "bg-gradient-to-br from-red-700 to-red-900 border border-red-500/40"
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
        </div>
      </div>

      {/* 卡片 */}
      <div
        className={`flex-1 mb-2 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${
          item.highlight
            ? "bg-gradient-to-br from-yellow-900/35 to-amber-900/15 border border-yellow-500/35 shadow-md shadow-yellow-900/20"
            : "bg-white/[0.06] border border-white/10"
        }`}
        onClick={onToggle}
      >
        <div className="p-3.5">
          {/* 时间 + 标签行 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`font-mono text-xs font-bold ${item.highlight ? "text-yellow-400" : "text-white/40"}`}>
                {item.time}
              </span>
              <span className="text-white/25 text-xs">·</span>
              <span className="text-white/35 text-[10px]">{item.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {item.cashInfo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/25 font-medium">
                  💰 {item.cashInfo}
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`}>
                {item.tag}
              </span>
            </div>
          </div>

          {/* 标题行 */}
          <div className="flex items-start gap-2">
            <div className={`mt-0.5 flex-shrink-0 ${item.highlight ? "text-yellow-400" : "text-white/40"}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-sm leading-snug ${item.highlight ? "text-yellow-100" : "text-white/90"}`}>
                {item.title}
              </h3>
              <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{item.subtitle}</p>
            </div>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 text-white/25 mt-1"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>

          {/* 展开详情 */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-white/70 text-xs leading-relaxed">{item.detail}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export default function Schedule() {
  const [, navigate] = useLocation();
  const [activeSession, setActiveSession] = useState<Session>("morning");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const items = activeSession === "morning" ? morningItems : afternoonItems;

  const handleToggle = (idx: number) => {
    setExpandedIdx(expandedIdx === idx ? null : idx);
  };

  const handleSessionChange = (s: Session) => {
    setActiveSession(s);
    setExpandedIdx(null);
  };

  return (
    <div className="min-h-screen bg-deep-gradient text-white">
      {/* 顶部装饰线 */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

      <div className="max-w-md mx-auto px-4 py-6 pb-10">
        {/* 导航栏 */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-5 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        {/* 页面标题 */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-2xl font-bold text-gold-gradient">活动日程</h1>
          <p className="text-white/40 text-sm mt-0.5">2026 年 3 月 1 日（周日）· 全天流程</p>
        </motion.div>

        {/* 活动概览卡 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card border border-yellow-500/25 rounded-2xl p-4 mb-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-gradient-to-b from-yellow-400 to-amber-600 rounded-full" />
            <span className="text-yellow-300 font-bold text-sm">AI 智启 · 同心聚力 · 焕新出发</span>
          </div>
          <div className="grid grid-cols-2 gap-y-1.5 text-xs text-white/60">
            <span>📅 2026 年 3 月 1 日（周日）</span>
            <span>👥 全员参与 · 约 25 人</span>
            <span className="col-span-2">📍 中易物联集团总部 · 多功能厅 / 活动区</span>
          </div>
        </motion.div>

        {/* 场次 Tab */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/20 rounded-2xl p-1.5 flex gap-1.5 mb-5"
        >
          {([
            { key: "morning",   emoji: "☀️", label: "上午场", sub: "09:00 – 12:00", activeClass: "from-yellow-500 to-amber-600 shadow-yellow-500/30" },
            { key: "afternoon", emoji: "🎮", label: "下午场", sub: "13:30 – 17:30", activeClass: "from-orange-500 to-red-600 shadow-orange-500/30" },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => handleSessionChange(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                activeSession === tab.key
                  ? `bg-gradient-to-r ${tab.activeClass} text-white shadow-lg`
                  : "text-white/55 hover:text-white/75"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-base">{tab.emoji}</span>
                <div className="text-left">
                  <div className="leading-tight">{tab.label}</div>
                  <div className="text-[10px] font-normal opacity-75">{tab.sub}</div>
                </div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* 场次副标题 */}
        <motion.div
          key={activeSession}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mb-4"
        >
          {activeSession === "morning" ? (
            <>
              <p className="text-yellow-300 font-bold">收心启智 · AI 赋能</p>
              <p className="text-white/40 text-xs mt-0.5">庄重 · 战略 · 表彰</p>
            </>
          ) : (
            <>
              <p className="text-orange-300 font-bold">团建狂欢 · 现金游戏</p>
              <p className="text-white/40 text-xs mt-0.5">欢乐 · 凝聚 · 刺激</p>
            </>
          )}
        </motion.div>

        {/* 时间轴 */}
        <div className="relative">
          {/* 竖线 */}
          <div className="absolute left-[9px] top-6 bottom-6 w-px bg-gradient-to-b from-yellow-500/50 via-yellow-500/20 to-transparent" />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSession}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-1"
            >
              {items.map((item, idx) => (
                <ScheduleCard
                  key={`${activeSession}-${idx}`}
                  item={item}
                  index={idx}
                  isExpanded={expandedIdx === idx}
                  onToggle={() => handleToggle(idx)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 点击提示 */}
        <p className="text-center text-white/30 text-xs mt-4 mb-6">点击各环节卡片查看详细说明</p>

        {/* 奖项速览（上午场） */}
        {activeSession === "morning" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card border border-yellow-500/25 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-300 font-bold text-sm">奖项速览</span>
            </div>
            <div className="space-y-2.5">
              {[
                { emoji: "🤖", name: "AI 效率革命奖", desc: "年度 AI 应用先锋 · 3 名", cash: "¥800/人" },
                { emoji: "⭐", name: "年度优秀员工奖", desc: "综合表现卓越 · 3 名",   cash: "¥800/人" },
              ].map((award, i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px bg-white/8 mb-2.5" />}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{award.emoji}</span>
                      <div>
                        <div className="text-white font-semibold">{award.name}</div>
                        <div className="text-white/45 mt-0.5">{award.desc}</div>
                      </div>
                    </div>
                    <span className="text-yellow-400 font-bold text-sm">{award.cash}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 游戏现金速览（下午场） */}
        {activeSession === "afternoon" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card border border-orange-500/25 rounded-2xl p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Gamepad2 className="w-4 h-4 text-orange-400" />
              <span className="text-orange-300 font-bold text-sm">游戏现金池</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              {[
                { emoji: "🎯", name: "AI 智多星抢答" },
                { emoji: "🏃", name: "团队 AI 接力赛" },
                { emoji: "📦", name: "现金盲盒大作战" },
                { emoji: "🎰", name: "AI 幸运大抽奖" },
              ].map((g, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-2.5 text-center">
                  <div className="text-xl mb-1">{g.emoji}</div>
                  <div className="text-white/80 font-medium leading-tight">{g.name}</div>
                </div>
              ))}
            </div>
            <div className="text-center">
              <span className="text-white/45 text-xs">游戏总现金池</span>
              <span className="text-orange-300 font-bold text-xl ml-2">¥2,000</span>
              <span className="text-white/45 text-xs ml-1">· 人人有机会</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
