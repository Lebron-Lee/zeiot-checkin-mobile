import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Trophy, Gamepad2, Mic, Star,
  Zap, Heart, Camera, Bus, Utensils, Flag,
} from "lucide-react";

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
    time: "07:00",
    duration: "约 90 分钟",
    title: "北京集合 · 出发唐山",
    subtitle: "全体人员北京集合，乘车前往唐山",
    detail:
      "全体参会人员在北京指定地点集合，统一乘车前往中易物联唐山分公司易识通，车程约 90 分钟，请提前到达集合地点。",
    tag: "出发",
    icon: <Bus className="w-4 h-4" />,
  },
  {
    time: "08:30",
    duration: "60 分钟",
    title: "AI 刷脸签到 · 入场",
    subtitle: "AI 人脸识别签到，实时同步大屏签到墙",
    detail:
      "抵达中易物联唐山分公司易识通，使用手机 AI 刷脸完成签到，照片实时同步至大屏签到墙，感受科技仪式感，领取活动手册。",
    tag: "签到",
    highlight: true,
    icon: <Zap className="w-4 h-4" />,
  },
  {
    time: "09:00",
    duration: "30 分钟",
    title: "拍照合影留念",
    subtitle: "全体人员集合，记录 2026 开工盛典美好时刻",
    detail:
      "签到完毕后，全体人员在指定区域集合，拍摄 2026 年开工盛典团体合影，留下珍贵纪念，也为后续活动做好热场准备。",
    tag: "合影",
    icon: <Camera className="w-4 h-4" />,
  },
  {
    time: "09:30",
    duration: "20 分钟",
    title: "开场致辞 · 新年寄语",
    subtitle: "领导致辞，回顾 2025 展望 2026",
    detail:
      "总经理发表开工致辞，回顾 2025 年集团重要成就，展望 2026 年发展蓝图，强调 AI 化战略方向，提振全员士气，凝聚团队力量，共启新征程。",
    tag: "致辞",
    icon: <Mic className="w-4 h-4" />,
  },
  {
    time: "09:50",
    duration: "40 分钟",
    title: "「马上有钱」现金游戏",
    subtitle: "AI 分组团建游戏，寓意马到成功、财源广进",
    detail:
      "新年第一个互动环节！AI 智能随机分组，打破部门壁垒，以「马上有钱」为主题开展团建游戏，寓意新年马到成功、财源广进，竞技获胜队伍赢取现金奖励。",
    tag: "游戏",
    highlight: true,
    icon: <Gamepad2 className="w-4 h-4" />,
    cashInfo: "💰 现金奖励",
  },
  {
    time: "10:30",
    duration: "60 分钟",
    title: "2026 中易集团战略发布",
    subtitle: "重磅发布集团年度战略规划，AI 赋能全面升级",
    detail:
      "高管团队重磅发布 2026 年集团战略规划，结合 AI 可视化 PPT 与工具现场演示，深度解读「为什么 AI、怎么 AI」，明确全年核心方向与业务目标，共绘中易未来蓝图。",
    tag: "战略发布",
    highlight: true,
    icon: <Star className="w-4 h-4" />,
  },
];

const afternoonItems: ScheduleItem[] = [
  {
    time: "11:30",
    duration: "180 分钟",
    title: "聚餐准备 · 拿手好菜 · 共享盛宴",
    subtitle: "品味美食，感受团队温情，共叙同事情谊",
    detail:
      "战略发布后，全体人员共享丰盛午宴，品味拿手好菜，感受团队温情，在轻松愉快的氛围中共叙同事情谊，为下午精彩活动蓄力。",
    tag: "聚餐",
    highlight: true,
    icon: <Utensils className="w-4 h-4" />,
  },
  {
    time: "14:30",
    duration: "15 分钟",
    title: "颁发 AI 效率革命奖",
    subtitle: "表彰 AI 工具应用先锋，AI 生成专属颁奖词",
    detail:
      "年度最高荣誉时刻！颁发「AI 效率革命奖」，表彰在 AI 工具应用、效率提升方面做出突出贡献的员工，AI 实时生成专属颁奖词大屏同步播放，颁奖、合影、代表发言，仪式感满满。",
    tag: "颁奖",
    highlight: true,
    icon: <Trophy className="w-4 h-4" />,
    cashInfo: "🏆 荣誉奖项",
  },
  {
    time: "14:45",
    duration: "15 分钟",
    title: "颁发优秀员工奖",
    subtitle: "表彰年度综合表现卓越员工，AI 生成颁奖词",
    detail:
      "颁发「年度优秀员工奖」，表彰 2025 年度综合表现卓越的优秀员工，AI 生成个性化颁奖词，见证每一份努力与付出，激励全体员工奋勇前行。",
    tag: "颁奖",
    highlight: true,
    icon: <Trophy className="w-4 h-4" />,
    cashInfo: "🏆 荣誉奖项",
  },
  {
    time: "15:00",
    duration: "30 分钟",
    title: "誓师立愿 · 写心愿卡",
    subtitle: "手写心愿卡，AI 实时上传心愿墙大屏展示",
    detail:
      "每位员工通过手机填写 2026 年心愿卡，AI 实时同步至大屏心愿墙展示，随后全员起立，在 AI 宣誓背景音乐中共同宣誓，统一 2026 年目标，满满仪式感。",
    tag: "誓师仪式",
    highlight: true,
    icon: <Heart className="w-4 h-4" />,
  },
  {
    time: "16:00",
    duration: "整理收尾",
    title: "活动圆满结束 · 现场整理",
    subtitle: "带着满满收获与期待，踏上归途",
    detail:
      "活动圆满结束，全体人员合影留念，进行现场整理工作，带着满满的收获、新的目标与美好期待，踏上归途，共赴 2026 年新征程！",
    tag: "结束",
    icon: <Flag className="w-4 h-4" />,
  },
];

const tagColorMap: Record<string, { bg: string; text: string; border: string }> = {
  出发:     { bg: "bg-blue-500/15",   text: "text-blue-300",   border: "border-blue-500/30"   },
  签到:     { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
  合影:     { bg: "bg-purple-500/15", text: "text-purple-300", border: "border-purple-500/30" },
  致辞:     { bg: "bg-sky-500/15",    text: "text-sky-300",    border: "border-sky-500/30"    },
  游戏:     { bg: "bg-green-500/15",  text: "text-green-300",  border: "border-green-500/30"  },
  战略发布: { bg: "bg-amber-500/15",  text: "text-amber-300",  border: "border-amber-500/30"  },
  聚餐:     { bg: "bg-orange-500/15", text: "text-orange-300", border: "border-orange-500/30" },
  颁奖:     { bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/30" },
  誓师仪式: { bg: "bg-rose-500/15",   text: "text-rose-300",   border: "border-rose-500/30"   },
  结束:     { bg: "bg-gray-500/15",   text: "text-gray-300",   border: "border-gray-500/30"   },
};

function ScheduleCard({
  item,
  index,
  isExpanded,
  onToggle,
}: {
  item: ScheduleItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tagStyle = tagColorMap[item.tag] ?? {
    bg: "bg-white/10",
    text: "text-white/60",
    border: "border-white/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -15 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07 }}
      className="relative flex gap-3"
    >
      {/* 时间轴节点 */}
      <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 20 }}>
        <div
          className={`w-4 h-4 rounded-full flex items-center justify-center z-10 mt-4 ${
            item.highlight
              ? "bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-500/40"
              : "bg-gradient-to-br from-red-700 to-red-900 border border-red-500/40"
          }`}
        >
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
              <span
                className={`font-mono text-xs font-bold ${
                  item.highlight ? "text-yellow-400" : "text-white/40"
                }`}
              >
                {item.time}
              </span>
              <span className="text-white/25 text-xs">·</span>
              <span className="text-white/35 text-[10px]">{item.duration}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {item.cashInfo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/25 font-medium">
                  {item.cashInfo}
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`}
              >
                {item.tag}
              </span>
            </div>
          </div>

          {/* 标题行 */}
          <div className="flex items-start gap-2">
            <div
              className={`mt-0.5 flex-shrink-0 ${
                item.highlight ? "text-yellow-400" : "text-white/40"
              }`}
            >
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3
                className={`font-bold text-sm leading-snug ${
                  item.highlight ? "text-yellow-100" : "text-white/90"
                }`}
              >
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
          <div className="grid grid-cols-1 gap-y-1.5 text-xs text-white/60">
            <span>📅 2026 年 3 月 1 日（周日）</span>
            <span>👥 全员参与 · 约 25 人</span>
            <span>📍 中易物联唐山分公司易识通</span>
            <span>🚌 07:00 北京集合出发 · 08:30 抵达签到</span>
          </div>
        </motion.div>

        {/* 场次 Tab */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/20 rounded-2xl p-1.5 flex gap-1.5 mb-5"
        >
          {(
            [
              {
                key: "morning",
                emoji: "☀️",
                label: "上午场",
                sub: "07:00 – 11:30",
                activeClass: "from-yellow-500 to-amber-600 shadow-yellow-500/30",
              },
              {
                key: "afternoon",
                emoji: "🌆",
                label: "下午场",
                sub: "11:30 – 16:00",
                activeClass: "from-orange-500 to-red-600 shadow-orange-500/30",
              },
            ] as const
          ).map((tab) => (
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
              <p className="text-yellow-300 font-bold">集合出发 · 签到 · 游戏 · 战略发布</p>
              <p className="text-white/40 text-xs mt-0.5">仪式感 · 战略 · 互动</p>
            </>
          ) : (
            <>
              <p className="text-orange-300 font-bold">聚餐 · 颁奖 · 誓师立愿</p>
              <p className="text-white/40 text-xs mt-0.5">温情 · 荣誉 · 展望</p>
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

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-center"
        >
          <p className="text-white/25 text-xs">点击卡片查看详细说明 · 日程如有调整以现场为准</p>
        </motion.div>
      </div>
    </div>
  );
}
