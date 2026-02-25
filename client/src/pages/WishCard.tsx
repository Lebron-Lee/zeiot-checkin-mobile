import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Heart, Send, Sparkles } from "lucide-react";

const CATEGORIES = [
  { key: "career" as const, label: "职业成长", icon: "🚀", color: "#60a5fa" },
  { key: "team" as const, label: "团队愿景", icon: "🤝", color: "#34d399" },
  { key: "personal" as const, label: "个人心愿", icon: "✨", color: "#f472b6" },
  { key: "company" as const, label: "公司祝愿", icon: "🏢", color: "#f5d060" },
];

const CARD_COLORS = ["#1a2a4a", "#1a3a2a", "#3a1a2a", "#2a1a3a", "#3a2a1a"];

const WISH_TEMPLATES = [
  "希望2026年能在AI领域取得突破，成为团队的AI先锋！",
  "期待与团队一起成长，共同创造更多价值！",
  "祝公司业绩腾飞，每位同事都能实现自己的目标！",
  "希望能掌握更多AI工具，提升工作效率10倍！",
  "期待团队更加团结，共同迎接AI时代的挑战！",
];

export default function WishCard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [category, setCategory] = useState<"career" | "team" | "personal" | "company">("career");
  const [content, setContent] = useState("");
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [submitted, setSubmitted] = useState(false);
  const [submittedCard, setSubmittedCard] = useState<{ content: string; category: string } | null>(null);

  const { data: myCards } = trpc.wishCard.getMine.useQuery(undefined, { enabled: isAuthenticated });

  const submitMutation = trpc.wishCard.submit.useMutation({
    onSuccess: (data) => {
      setSubmittedCard({ content: data?.content || content, category });
      setSubmitted(true);
      toast.success("心愿卡已提交！正在同步到大屏心愿墙！");
    },
    onError: (err) => {
      toast.error(err.message || "提交失败，请重试");
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("请填写心愿内容");
      return;
    }
    submitMutation.mutate({ content: content.trim(), category, color: cardColor });
  };

  const selectedCategory = CATEGORIES.find((c) => c.key === category)!;

  return (
    <div className="min-h-screen bg-deep-gradient">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
      <div className="max-w-md mx-auto px-5 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm">返回首页</span>
        </button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="text-pink-400" size={24} />
            <h1 className="text-2xl font-bold text-gold-gradient">心愿卡</h1>
          </div>
          <p className="text-white/40 text-sm">写下2026年的心愿，将显示在大屏心愿墙</p>
        </motion.div>

        {!isAuthenticated ? (
          <div className="glass-card border-gold-glow rounded-2xl p-8 text-center">
            <Heart className="text-pink-400 mx-auto mb-4" size={48} />
            <p className="text-white/60 mb-6">登录后填写心愿卡</p>
            <a href={getLoginUrl()} className="block w-full py-3 rounded-xl font-bold text-center"
              style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
              登录参与
            </a>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* 心愿卡预览 */}
                <motion.div
                  className="rounded-2xl p-5 mb-5 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}cc 100%)`, border: "1px solid rgba(245,208,96,0.3)", minHeight: "140px" }}
                  animate={{ backgroundColor: cardColor }}
                >
                  <div className="absolute top-3 right-3 text-2xl opacity-30">{selectedCategory.icon}</div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full opacity-5"
                    style={{ background: selectedCategory.color, transform: "translate(30%, 30%)" }} />
                  <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${selectedCategory.color}30`, color: selectedCategory.color }}>
                      {selectedCategory.icon} {selectedCategory.label}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed min-h-[60px]">
                    {content || <span className="text-white/30">在下方写下您的心愿...</span>}
                  </p>
                  <p className="text-white/40 text-xs mt-2">—— {user?.name || "员工"}</p>
                </motion.div>

                {/* 类别选择 */}
                <div className="mb-4">
                  <label className="text-white/50 text-xs mb-2 block">心愿类别</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button key={cat.key} onClick={() => setCategory(cat.key)}
                        className={`py-2 px-1 rounded-xl text-xs flex flex-col items-center gap-1 transition-all ${
                          category === cat.key ? "border" : "glass-card"
                        }`}
                        style={category === cat.key ? { borderColor: `${cat.color}60`, background: `${cat.color}15`, color: cat.color } : {}}>
                        <span className="text-base">{cat.icon}</span>
                        <span className={category === cat.key ? "" : "text-white/50"}>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 卡片颜色 */}
                <div className="mb-4">
                  <label className="text-white/50 text-xs mb-2 block">卡片颜色</label>
                  <div className="flex gap-2">
                    {CARD_COLORS.map((color) => (
                      <button key={color} onClick={() => setCardColor(color)}
                        className={`w-8 h-8 rounded-full transition-all ${cardColor === color ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-transparent scale-110" : ""}`}
                        style={{ background: color, border: "1px solid rgba(255,255,255,0.2)" }} />
                    ))}
                  </div>
                </div>

                {/* 内容输入 */}
                <div className="mb-4">
                  <label className="text-white/50 text-xs mb-2 block">心愿内容</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    maxLength={200}
                    rows={3}
                    placeholder="写下您在2026年的心愿..."
                    className="w-full glass-card rounded-xl p-3 text-sm text-white/80 placeholder-white/30 resize-none outline-none focus:border-yellow-400/40 transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-white/30 text-xs">{content.length}/200</span>
                  </div>
                </div>

                {/* 快捷模板 */}
                <div className="mb-5">
                  <label className="text-white/50 text-xs mb-2 block flex items-center gap-1">
                    <Sparkles size={10} />
                    快捷模板
                  </label>
                  <div className="space-y-1.5">
                    {WISH_TEMPLATES.slice(0, 3).map((tmpl, i) => (
                      <button key={i} onClick={() => setContent(tmpl)}
                        className="w-full text-left text-xs text-white/50 hover:text-white/70 py-1.5 px-3 rounded-lg hover:bg-white/5 transition-all truncate">
                        {tmpl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 提交按钮 */}
                <button onClick={handleSubmit} disabled={submitMutation.isPending || !content.trim()}
                  className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #f5d060 0%, #e8a020)", color: "#050a14" }}>
                  <Send size={18} />
                  {submitMutation.isPending ? "提交中..." : "提交心愿卡"}
                </button>

                {/* 已提交的卡片 */}
                {myCards && myCards.length > 0 && (
                  <div className="mt-6">
                    <p className="text-white/40 text-xs mb-3">我的心愿卡 ({myCards.length})</p>
                    <div className="space-y-2">
                      {myCards.map((card) => (
                        <div key={card.id} className="glass-card rounded-xl p-3">
                          <p className="text-white/70 text-sm">{card.content}</p>
                          <p className="text-white/30 text-xs mt-1">{CATEGORIES.find(c => c.key === card.category)?.icon} {CATEGORIES.find(c => c.key === card.category)?.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-xl font-bold text-gold-gradient mb-2">心愿已送出！</h2>
                <p className="text-white/50 text-sm text-center mb-6">您的心愿正在大屏心愿墙上展示</p>

                {/* 心愿卡展示 */}
                <div className="w-full rounded-2xl p-5 mb-6 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${cardColor} 0%, ${cardColor}cc 100%)`, border: "1px solid rgba(245,208,96,0.3)" }}>
                  <div className="mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${selectedCategory.color}30`, color: selectedCategory.color }}>
                      {selectedCategory.icon} {selectedCategory.label}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed">{submittedCard?.content}</p>
                  <p className="text-white/40 text-xs mt-2">—— {user?.name}</p>
                </div>

                <div className="w-full space-y-3">
                  <button onClick={() => { setSubmitted(false); setContent(""); }}
                    className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                    再写一张
                  </button>
                  <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-all">
                    返回首页
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
