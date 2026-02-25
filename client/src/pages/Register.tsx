import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const DEPARTMENTS = [
  "技术研发部", "产品设计部", "市场营销部", "销售部", "客户成功部",
  "运营部", "人力资源部", "财务部", "行政部", "战略发展部", "其他",
];

const DIETARY_OPTIONS = [
  "无特殊要求", "素食", "清真", "不吃辣", "不吃海鲜", "不吃猪肉", "其他",
];

export default function Register() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    realName: user?.name || "",
    department: "",
    position: "",
    phone: "",
    dietaryNeeds: "无特殊要求",
    expectations: "",
  });

  const { data: existing, isLoading } = trpc.registration.getMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const submitMutation = trpc.registration.submit.useMutation({
    onSuccess: () => {
      toast.success("🎉 报名成功！期待与您相聚开工盛典！");
      setTimeout(() => navigate("/"), 1500);
    },
    onError: (e) => toast.error("报名失败：" + e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center p-4">
        <div className="glass-card border-gold-glow rounded-2xl p-8 text-center max-w-sm w-full">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-white mb-2">请先登录</h2>
          <p className="text-white/60 text-sm mb-6">登录后即可完成活动报名</p>
          <a href={getLoginUrl()} className="block w-full py-3 rounded-xl btn-festive text-center font-bold">
            立即登录
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-festive-gradient flex items-center justify-center">
        <div className="text-yellow-400 animate-pulse text-lg">加载中...</div>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto px-4 py-8">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 text-sm mb-6 hover:text-white/90 transition-colors">
            ← 返回首页
          </button>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card border-gold-glow rounded-2xl p-8 text-center"
          >
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gold-gradient mb-2">已完成报名</h2>
            <p className="text-white/70 text-sm mb-6">您已成功报名2026开工盛典，期待与您相聚！</p>
            <div className="space-y-3 text-left">
              {[
                { label: "姓名", value: existing.realName },
                { label: "部门", value: existing.department },
                { label: "职位", value: existing.position || "—" },
                { label: "饮食需求", value: existing.dietaryNeeds || "无特殊要求" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-yellow-400/10">
                  <span className="text-white/50 text-sm">{item.label}</span>
                  <span className="text-white/90 text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/")}
              className="mt-6 w-full py-3 rounded-xl btn-gold font-bold"
            >
              返回首页
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const handleSubmit = () => {
    if (!form.realName.trim()) { toast.error("请填写真实姓名"); return; }
    if (!form.department) { toast.error("请选择所在部门"); return; }
    submitMutation.mutate(form);
  };

  return (
    <div className="min-h-screen bg-festive-gradient relative overflow-hidden">
      <div className="absolute inset-0 bg-tech-grid opacity-30 pointer-events-none" />
      {/* 顶部装饰 */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* 顶部导航 */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/60 text-sm mb-6 hover:text-white/90 transition-colors">
          ← 返回首页
        </button>

        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="text-4xl mb-2">📝</div>
          <h1 className="text-2xl font-bold text-gold-gradient mb-1">活动报名</h1>
          <p className="text-white/60 text-sm">2026 开工盛典 · 填写信息参与活动</p>
        </motion.div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? "btn-festive text-white" : "glass-card text-white/40"
              }`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 transition-all ${step > s ? "bg-yellow-400/60" : "bg-white/20"}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* 步骤1：基本信息 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card border-gold-glow rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="text-yellow-400">👤</span> 基本信息
              </h3>

              {/* 姓名 */}
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">真实姓名 *</label>
                <input
                  type="text"
                  value={form.realName}
                  onChange={(e) => setForm({ ...form, realName: e.target.value })}
                  placeholder="请输入您的真实姓名"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none focus:border-yellow-400/60 transition-colors"
                  style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                />
              </div>

              {/* 部门 */}
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">所在部门 *</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none appearance-none"
                  style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                >
                  <option value="" style={{ background: "#5c0a0a" }}>请选择部门</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d} style={{ background: "#5c0a0a" }}>{d}</option>
                  ))}
                </select>
              </div>

              {/* 职位 */}
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">职位（选填）</label>
                <input
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="请输入您的职位"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none"
                  style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                />
              </div>

              {/* 手机号 */}
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">联系电话（选填）</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="请输入手机号码"
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none"
                  style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                />
              </div>

              <button
                onClick={() => {
                  if (!form.realName.trim()) { toast.error("请填写真实姓名"); return; }
                  if (!form.department) { toast.error("请选择所在部门"); return; }
                  setStep(2);
                }}
                className="w-full py-3 rounded-xl btn-festive font-bold mt-2"
              >
                下一步 →
              </button>
            </motion.div>
          )}

          {/* 步骤2：活动偏好 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card border-gold-glow rounded-2xl p-6 space-y-4"
            >
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <span className="text-yellow-400">🎊</span> 活动偏好
              </h3>

              {/* 饮食需求 */}
              <div>
                <label className="text-white/60 text-xs mb-2 block">饮食需求</label>
                <div className="grid grid-cols-2 gap-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setForm({ ...form, dietaryNeeds: opt })}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                        form.dietaryNeeds === opt
                          ? "btn-festive text-white"
                          : "glass-card text-white/70 hover:text-white/90"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 期待与心愿 */}
              <div>
                <label className="text-white/60 text-xs mb-1.5 block">对活动的期待（选填）</label>
                <textarea
                  value={form.expectations}
                  onChange={(e) => setForm({ ...form, expectations: e.target.value })}
                  placeholder="写下您对2026开工盛典的期待和心愿..."
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none resize-none"
                  style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                />
                <div className="text-right text-white/30 text-xs mt-1">{form.expectations.length}/200</div>
              </div>

              {/* 确认信息预览 */}
              <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)" }}>
                <p className="text-yellow-400/80 text-xs font-medium mb-2">📋 报名信息确认</p>
                {[
                  { label: "姓名", value: form.realName },
                  { label: "部门", value: form.department },
                  { label: "职位", value: form.position || "—" },
                  { label: "饮食", value: form.dietaryNeeds },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-xs">
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 rounded-xl glass-card text-white/70 font-medium text-sm"
                >
                  ← 上一步
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitMutation.isPending}
                  className="flex-1 py-3 rounded-xl btn-festive font-bold text-sm disabled:opacity-60"
                >
                  {submitMutation.isPending ? "提交中..." : "🎊 确认报名"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部说明 */}
        <p className="text-center text-white/30 text-xs mt-6">
          报名信息仅用于活动组织，请放心填写
        </p>
      </div>
    </div>
  );
}
