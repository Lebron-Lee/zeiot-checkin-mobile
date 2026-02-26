import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Phone, User, Building2, CheckCircle2, LogIn, Loader2 } from "lucide-react";

const DEPARTMENTS = [
  "技术研发部", "产品设计部", "市场营销部", "销售部", "客户成功部",
  "运营部", "人力资源部", "财务部", "行政部", "战略发展部", "其他",
];

const ROLES = [
  { value: "employee" as const, label: "正式员工", icon: "👔" },
  { value: "guest" as const, label: "特邀嘉宾", icon: "🌟" },
  { value: "partner" as const, label: "合作伙伴", icon: "🤝" },
];

export default function Register() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({
    phone: "",
    name: "",
    department: "",
    position: "",
    role: "employee" as "employee" | "guest" | "partner",
  });
  const [loginPhone, setLoginPhone] = useState("");

  // 登录/注册成功后的跳转标记
  const [pendingRedirect, setPendingRedirect] = useState(false);

  // 监听认证状态变化：一旦登录成功且有用户信息，立即跳转
  useEffect(() => {
    if (pendingRedirect && isAuthenticated && user) {
      navigate("/checkin");
    }
  }, [pendingRedirect, isAuthenticated, user, navigate]);

  const registerMutation = trpc.auth.localRegister.useMutation({
    onSuccess: (data) => {
      toast.success(data.isNew ? "🎉 注册成功！欢迎参加开工盛典！" : "👋 欢迎回来！");
      setPendingRedirect(true);
      utils.auth.me.invalidate();
      // 兜底：3秒后无论如何跳转
      setTimeout(() => navigate("/checkin"), 3000);
    },
    onError: (e) => toast.error("注册失败：" + e.message),
  });

  const loginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      setPendingRedirect(true);
      utils.auth.me.invalidate();
      // 兜底：3秒后无论如何跳转
      setTimeout(() => navigate("/checkin"), 3000);
    },
    onError: (e) => toast.error(e.message || "登录失败"),
  });

  // 已登录则直接跳转
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-festive-gradient flex flex-col items-center justify-center p-5">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card border-gold-glow rounded-2xl p-8 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-700/40 to-yellow-600/30 flex items-center justify-center text-2xl font-bold text-yellow-400 mx-auto mb-4">
            {user.name?.[0] || "✦"}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle2 className="text-green-400" size={18} />
            <span className="text-green-400 text-sm font-medium">已登录</span>
          </div>
          <h2 className="text-xl font-bold text-gold-gradient mb-1">{user.name}</h2>
          <p className="text-white/50 text-sm mb-6">您已完成注册，可以直接签到</p>
          <button onClick={() => navigate("/checkin")} className="w-full py-3 rounded-xl btn-festive font-bold mb-3">
            前往签到
          </button>
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-white/50 text-sm hover:text-white/70 transition-all">
            返回首页
          </button>
        </motion.div>
      </div>
    );
  }

  const handleRegisterStep1 = () => {
    if (!form.phone || form.phone.length !== 11) { toast.error("请输入11位手机号"); return; }
    if (!form.name.trim()) { toast.error("请填写真实姓名"); return; }
    setStep(2);
  };

  const handleRegisterSubmit = () => {
    if (!form.department) { toast.error("请选择所在部门"); return; }
    registerMutation.mutate({
      phone: form.phone,
      name: form.name,
      department: form.department,
      position: form.position,
      role: form.role,
    });
  };

  const handleLogin = () => {
    if (!loginPhone || loginPhone.length !== 11) { toast.error("请输入11位手机号"); return; }
    loginMutation.mutate({ phone: loginPhone });
  };

  return (
    <div className="min-h-screen bg-festive-gradient flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
      <div className="absolute inset-0 bg-tech-grid opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-5 py-6 flex flex-col flex-1">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft size={16} /><span className="text-sm">返回首页</span>
        </button>

        {/* 标题 */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="text-4xl mb-2">{mode === "register" ? "📝" : "🔑"}</div>
          <h1 className="text-2xl font-bold text-gold-gradient mb-1">
            {mode === "register" ? "活动注册" : "已有账号登录"}
          </h1>
          <p className="text-white/50 text-sm">2026 开工盛典 · 中易物联集团</p>
        </motion.div>

        {/* 模式切换 */}
        <div className="flex rounded-xl overflow-hidden mb-6 glass-card p-1">
          <button
            onClick={() => { setMode("register"); setStep(1); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "register" ? "btn-festive text-white" : "text-white/50 hover:text-white/70"}`}
          >
            新用户注册
          </button>
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "btn-festive text-white" : "text-white/50 hover:text-white/70"}`}
          >
            已注册登录
          </button>
        </div>

        <AnimatePresence mode="wait">

          {/* ===== 登录模式 ===== */}
          {mode === "login" && (
            <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-card border-gold-glow rounded-2xl p-6 space-y-5">
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-2">
                  <LogIn size={16} className="text-yellow-400" />
                  使用注册时的手机号登录
                </div>
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">手机号</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="请输入注册时的手机号"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none focus:border-yellow-400/60 transition-colors"
                      style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleLogin}
                  disabled={loginMutation.isPending}
                  className="w-full py-3.5 rounded-xl btn-festive font-bold flex items-center justify-center gap-2"
                >
                  {loginMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                  {loginMutation.isPending ? "登录中..." : "立即登录"}
                </button>
              </div>
              <p className="text-center text-white/30 text-xs mt-4">
                还没有账号？
                <button onClick={() => setMode("register")} className="text-yellow-400/70 hover:text-yellow-400 ml-1">
                  点击注册
                </button>
              </p>
            </motion.div>
          )}

          {/* ===== 注册步骤1 ===== */}
          {mode === "register" && step === 1 && (
            <motion.div key="reg-step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* 步骤指示 */}
              <div className="flex items-center justify-center gap-3 mb-5">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "btn-festive text-white" : "glass-card text-white/40"}`}>{s}</div>
                    {s < 2 && <div className={`w-10 h-0.5 transition-all ${step > s ? "bg-yellow-400/60" : "bg-white/20"}`} />}
                  </div>
                ))}
              </div>

              <div className="glass-card border-gold-glow rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                  <User size={16} className="text-yellow-400" /> 基本信息
                </h3>

                {/* 手机号（作为账号） */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">手机号（作为登录账号）*</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                      placeholder="请输入手机号"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none focus:border-yellow-400/60 transition-colors"
                      style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                    />
                  </div>
                </div>

                {/* 姓名 */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">真实姓名 *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="请输入您的真实姓名"
                      className="w-full pl-9 pr-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none focus:border-yellow-400/60 transition-colors"
                      style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                    />
                  </div>
                </div>

                {/* 参与身份 */}
                <div>
                  <label className="text-white/60 text-xs mb-2 block">参与身份 *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <button key={r.value} onClick={() => setForm({ ...form, role: r.value })}
                        className={`py-2.5 rounded-lg text-xs font-medium transition-all flex flex-col items-center gap-1 ${form.role === r.value ? "btn-festive text-white" : "glass-card text-white/70 hover:text-white/90"}`}>
                        <span>{r.icon}</span>
                        <span>{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleRegisterStep1} className="w-full py-3 rounded-xl btn-festive font-bold mt-2">
                  下一步 →
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== 注册步骤2 ===== */}
          {mode === "register" && step === 2 && (
            <motion.div key="reg-step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {/* 步骤指示 */}
              <div className="flex items-center justify-center gap-3 mb-5">
                {[1, 2].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "btn-festive text-white" : "glass-card text-white/40"}`}>{s}</div>
                    {s < 2 && <div className={`w-10 h-0.5 transition-all ${step > s ? "bg-yellow-400/60" : "bg-white/20"}`} />}
                  </div>
                ))}
              </div>

              <div className="glass-card border-gold-glow rounded-2xl p-6 space-y-4">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                  <Building2 size={16} className="text-yellow-400" /> 部门信息
                </h3>

                {/* 信息摘要 */}
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-700/40 to-yellow-600/30 flex items-center justify-center text-sm font-bold text-yellow-400">
                    {form.name[0] || "?"}
                  </div>
                  <div>
                    <p className="text-white/90 text-sm font-medium">{form.name}</p>
                    <p className="text-white/40 text-xs">{form.phone} · {ROLES.find(r => r.value === form.role)?.label}</p>
                  </div>
                </div>

                {/* 部门选择 */}
                <div>
                  <label className="text-white/60 text-xs mb-2 block">所在部门 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEPARTMENTS.map((d) => (
                      <button key={d} onClick={() => setForm({ ...form, department: d })}
                        className={`py-2 px-3 rounded-lg text-xs transition-all text-left ${form.department === d ? "btn-festive text-white" : "glass-card text-white/60 hover:text-white/80"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 职位（选填） */}
                <div>
                  <label className="text-white/60 text-xs mb-1.5 block">
                    {form.role === "guest" ? "单位/职务（选填）" : "职位（选填）"}
                  </label>
                  <input
                    type="text"
                    value={form.position}
                    onChange={(e) => setForm({ ...form, position: e.target.value })}
                    placeholder={form.role === "guest" ? "请输入所在单位或职务" : "请输入您的职位"}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-white/30 text-sm outline-none"
                    style={{ background: "rgba(139,26,26,0.4)", border: "1px solid rgba(255,215,0,0.2)" }}
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl glass-card text-white/60 text-sm">
                    ← 上一步
                  </button>
                  <button
                    onClick={handleRegisterSubmit}
                    disabled={registerMutation.isPending}
                    className="flex-2 flex-1 py-3 rounded-xl btn-festive font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {registerMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {registerMutation.isPending ? "注册中..." : "完成注册"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
