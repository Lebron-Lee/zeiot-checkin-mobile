import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy } from "lucide-react";

const categoryLabels = { efficiency: "AI效率奖", excellence: "优秀员工奖", special: "特别奖项" };
const categoryColors = {
  efficiency: { bg: "from-yellow-400/20 to-orange-400/10", border: "border-yellow-400/30", text: "text-yellow-400", badge: "bg-yellow-400/20 text-yellow-400" },
  excellence: { bg: "from-blue-400/20 to-purple-400/10", border: "border-blue-400/30", text: "text-blue-400", badge: "bg-blue-400/20 text-blue-400" },
  special: { bg: "from-green-400/20 to-teal-400/10", border: "border-green-400/30", text: "text-green-400", badge: "bg-green-400/20 text-green-400" },
};

export default function Awards() {
  const [, navigate] = useLocation();
  const { data: awards, isLoading } = trpc.award.getAll.useQuery();

  return (
    <div className="min-h-screen bg-deep-gradient">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-yellow-400" size={24} />
            <h1 className="text-2xl font-bold text-gold-gradient">荣誉殿堂</h1>
          </div>
          <p className="text-white/40 text-sm">2026年度表彰奖项 · 致敬每一位奋斗者</p>
        </motion.div>

        {/* 奖项总览 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card border-gold-glow rounded-2xl p-5 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gold-gradient">6</div>
              <div className="text-white/50 text-xs mt-1">获奖名额</div>
            </div>
            <div className="border-x border-white/10">
              <div className="text-2xl font-bold text-gold-gradient">¥3200</div>
              <div className="text-white/50 text-xs mt-1">奖金总额</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gold-gradient">2</div>
              <div className="text-white/50 text-xs mt-1">奖项类别</div>
            </div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {awards?.map((award, i) => {
              const colors = categoryColors[award.category as keyof typeof categoryColors] || categoryColors.special;
              return (
                <motion.div
                  key={award.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className={`rounded-2xl p-5 bg-gradient-to-br ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{award.icon || "🏆"}</span>
                      <div>
                        <h3 className={`font-bold text-base ${colors.text}`}>{award.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                          {categoryLabels[award.category as keyof typeof categoryLabels]}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gold-gradient font-bold text-lg">¥{award.rewardAmount}</div>
                      <div className="text-white/40 text-xs">奖金/人</div>
                    </div>
                  </div>

                  <p className="text-white/60 text-sm leading-relaxed mb-4">{award.description}</p>

                  {/* 获奖名单 */}
                  {award.winners && award.winners.length > 0 ? (
                    <div>
                      <div className="text-white/40 text-xs mb-2 flex items-center gap-1">
                        <span>✦</span>
                        <span>获奖名单</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {award.winners.map((winner) => (
                          <div key={winner.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400/30 to-blue-400/30 flex items-center justify-center text-xs">
                              {winner.winnerName[0]}
                            </div>
                            <span className="text-white/80 text-xs">{winner.winnerName}</span>
                            {winner.department && <span className="text-white/30 text-[10px]">· {winner.department}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 border border-dashed border-white/10 rounded-xl">
                      <p className="text-white/30 text-xs">获奖名单将在颁奖典礼揭晓</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 游戏奖励说明 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6 glass-card rounded-2xl p-5">
          <h3 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
            <span>🎮</span>
            <span>游戏现金奖励</span>
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">AI智多星抢答</span>
              <span className="text-yellow-400 text-sm font-medium">现金红包</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">现金盲盒大作战</span>
              <span className="text-yellow-400 text-sm font-medium">¥50-500</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">AI幸运大抽奖</span>
              <span className="text-yellow-400 text-sm font-medium">现金大奖</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/60 text-sm">节目鼓励奖</span>
              <span className="text-yellow-400 text-sm font-medium">¥100-200</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-white/80 text-sm font-medium">游戏现金池</span>
              <span className="text-gold-gradient font-bold">¥2000</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
