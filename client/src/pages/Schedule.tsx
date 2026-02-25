import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

const scheduleData = [
  {
    session: "上午场",
    subtitle: "收心启智·AI赋能",
    time: "09:00 - 12:00",
    theme: "庄重 · 战略 · 表彰",
    color: "#f5d060",
    icon: "☀️",
    items: [
      {
        time: "09:00",
        duration: "30分钟",
        title: "AI数字签到入场",
        desc: "扫码生成AI头像，实时投屏拼成公司LOGO，感受科技仪式感",
        tag: "AI签到",
        highlight: true,
      },
      {
        time: "09:30",
        duration: "15分钟",
        title: "开场致辞·收心动员",
        desc: "总经理致辞：收心、聚力、AI新征程，强调2026全面AI化战略",
        tag: "致辞",
        highlight: false,
      },
      {
        time: "09:45",
        duration: "45分钟",
        title: "2026集团工作规划宣贯",
        desc: "AI化工作落地解读+现场演示，讲透「为什么AI、怎么AI」",
        tag: "战略",
        highlight: true,
      },
      {
        time: "10:30",
        duration: "15分钟",
        title: "茶歇·AI知识互动",
        desc: "AI知识小问答，提升员工AI认知，现场氛围活跃",
        tag: "互动",
        highlight: false,
      },
      {
        time: "10:45",
        duration: "65分钟",
        title: "双奖项隆重表彰",
        desc: "AI效率革命奖 · 年度优秀员工奖，颁奖+合影+代表发言，AI颁奖词大屏同步",
        tag: "颁奖",
        highlight: true,
      },
      {
        time: "11:50",
        duration: "10分钟",
        title: "AI誓师立愿",
        desc: "写心愿卡→投入心愿箱→全员宣誓，统一目标，收心到位",
        tag: "仪式",
        highlight: false,
      },
    ],
  },
  {
    session: "下午场",
    subtitle: "团建狂欢·现金游戏",
    time: "13:30 - 17:30",
    theme: "欢乐 · 凝聚 · 刺激",
    color: "#60a5fa",
    icon: "🎮",
    items: [
      {
        time: "13:30",
        duration: "30分钟",
        title: "AI随机分组·破冰",
        desc: "AI软件随机组队，破除部门壁垒，快速热场拉近距离",
        tag: "分组",
        highlight: true,
      },
      {
        time: "14:00",
        duration: "150分钟",
        title: "AI主题现金游戏",
        desc: "① AI智多星抢答  ② 团队AI接力赛  ③ 现金盲盒大作战  ④ AI幸运大抽奖，现金池2000元",
        tag: "游戏",
        highlight: true,
      },
      {
        time: "16:30",
        duration: "60分钟",
        title: "文艺表演·风采展示",
        desc: "歌曲/舞蹈/AI创意节目，每个节目小现金鼓励，自由放松展现活力",
        tag: "表演",
        highlight: false,
      },
    ],
  },
];

const tagColors: Record<string, string> = {
  "AI签到": "bg-yellow-400/20 text-yellow-400",
  "致辞": "bg-blue-400/20 text-blue-400",
  "战略": "bg-purple-400/20 text-purple-400",
  "互动": "bg-green-400/20 text-green-400",
  "颁奖": "bg-yellow-400/20 text-yellow-400",
  "仪式": "bg-pink-400/20 text-pink-400",
  "分组": "bg-cyan-400/20 text-cyan-400",
  "游戏": "bg-red-400/20 text-red-400",
  "表演": "bg-orange-400/20 text-orange-400",
};

export default function Schedule() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-deep-gradient">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-gold-gradient mb-1">活动日程</h1>
          <p className="text-white/40 text-sm">2026年3月1日（周日）· 全天活动流程</p>
        </motion.div>

        <div className="space-y-6">
          {scheduleData.map((session, si) => (
            <motion.div
              key={session.session}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.15 }}
            >
              {/* 场次标题 */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{session.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white/90">{session.session}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${session.color}20`, color: session.color }}
                    >
                      {session.time}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs">
                    {session.subtitle} · {session.theme}
                  </p>
                </div>
              </div>

              {/* 时间线 */}
              <div className="relative pl-4">
                <div
                  className="absolute left-0 top-0 bottom-0 w-px"
                  style={{ background: `linear-gradient(to bottom, ${session.color}60, transparent)` }}
                />

                <div className="space-y-3">
                  {session.items.map((item, ii) => (
                    <motion.div
                      key={ii}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.15 + ii * 0.08 }}
                      className={`relative glass-card rounded-xl p-3 ${item.highlight ? "border-gold-glow" : ""}`}
                    >
                      {/* 时间线节点 */}
                      <div
                        className="absolute -left-5 top-4 w-2 h-2 rounded-full"
                        style={{ background: session.color }}
                      />

                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 font-medium text-sm">{item.title}</span>
                          {item.highlight && <span className="text-yellow-400 text-xs">★</span>}
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                            tagColors[item.tag] || "bg-white/10 text-white/50"
                          }`}
                        >
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-white/30 text-[10px]">{item.time}</span>
                        <span className="text-white/20 text-[10px]">·</span>
                        <span className="text-white/30 text-[10px]">{item.duration}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 glass-card border-gold-glow rounded-xl p-4 text-center"
        >
          <p className="text-yellow-400/80 text-sm font-medium mb-1">💡 温馨提示</p>
          <p className="text-white/50 text-xs leading-relaxed">
            请准时参加各场次活动，签到后可实时查看大屏互动效果
          </p>
        </motion.div>
      </div>
    </div>
  );
}
