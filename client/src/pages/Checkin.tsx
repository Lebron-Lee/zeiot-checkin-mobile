import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Camera, CheckCircle2, RotateCcw, Scan, Loader2, UserCircle2, Upload } from "lucide-react";

const MESSAGES = [
  "2026，AI赋能，乘风破浪！",
  "智启新征程，同心共奋进！",
  "AI时代，我们一起创造未来！",
  "焕新出发，共创佳绩！",
  "团结奋进，AI赋能新征程！",
];

const DEPARTMENTS = ["技术研发部", "产品运营部", "市场营销部", "行政人事部", "财务部", "销售部", "其他"];

// AI扫描线动画覆盖层
function AIScanOverlay({ scanning }: { scanning: boolean }) {
  if (!scanning) return null;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden rounded-2xl">
      {/* 扫描线 */}
      <motion.div
        className="absolute left-0 right-0 h-0.5"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,255,200,0.9), transparent)" }}
        initial={{ top: "0%" }}
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      {/* 角框 */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-green-400 rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-green-400 rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-green-400 rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-green-400 rounded-br-lg" />
      {/* AI识别网格 */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: "linear-gradient(rgba(0,255,200,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.3) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      {/* 识别点 */}
      {[
        { top: "30%", left: "25%" }, { top: "30%", right: "25%" },
        { top: "50%", left: "50%" }, { top: "65%", left: "35%" }, { top: "65%", right: "35%" },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-green-400"
          style={pos}
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      {/* AI识别文字 */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center">
        <motion.div
          className="px-3 py-1 rounded-full text-xs font-mono text-green-300"
          style={{ background: "rgba(0,40,30,0.8)", border: "1px solid rgba(0,255,200,0.4)" }}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          AI人脸识别中...
        </motion.div>
      </div>
    </div>
  );
}

// 人脸识别成功动画
function FaceDetectedOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center rounded-2xl overflow-hidden">
      <div className="absolute inset-0" style={{ background: "rgba(0,255,150,0.08)" }} />
      {/* 成功框 */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative"
      >
        <div className="w-40 h-40 border-2 border-green-400 rounded-2xl flex items-center justify-center"
          style={{ boxShadow: "0 0 30px rgba(0,255,150,0.5), inset 0 0 20px rgba(0,255,150,0.1)" }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <CheckCircle2 size={48} className="text-green-400" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -bottom-8 left-0 right-0 text-center"
        >
          <span className="text-green-300 text-sm font-semibold">识别成功</span>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function Checkin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"form" | "camera" | "preview" | "uploading" | "submitting" | "success">("form");
  const [department, setDepartment] = useState("");
  const [message, setMessage] = useState(MESSAGES[0]);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [checkinResult, setCheckinResult] = useState<{ avatarUrl?: string; userName?: string } | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myCheckin } = trpc.checkin.getMyCheckin.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const uploadMutation = trpc.upload.photo.useMutation();
  const checkinMutation = trpc.checkin.doCheckin.useMutation({
    onSuccess: (data) => {
      setCheckinResult({ avatarUrl: data.checkin?.avatarUrl || "", userName: data.checkin?.userName || "" });
      setStep("success");
      toast.success("签到成功！照片已同步到大屏！");
    },
    onError: (err) => {
      setStep("form");
      toast.error(err.message || "签到失败，请重试");
    },
  });

  // 打开摄像头
  const openCamera = useCallback(async () => {
    // 检查是否支持 getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraFailed(true);
      toast.error("当前环境不支持摄像头，请使用文件上传方式签到");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraFailed(false);
      setStep("camera");
      setScanning(true);
      setFaceDetected(false);
      // 等待video元素挂载后设置srcObject
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
        // 模拟AI人脸识别过程（2.5秒后显示识别成功）
        setTimeout(() => {
          setScanning(false);
          setFaceDetected(true);
        }, 2500);
      }, 100);
    } catch (err: unknown) {
      console.error("Camera error:", err);
      const errName = (err as { name?: string })?.name;
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        toast.error("摄像头权限被拒绝，请在浏览器设置中允许访问摄像头，或使用照片上传方式签到");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        toast.error("未找到摄像头设备，请使用照片上传方式签到");
      } else if (errName === "NotSupportedError" || errName === "InsecureContextError") {
        toast.error("当前页面不支持摄像头（需要HTTPS），请使用照片上传方式签到");
      } else {
        toast.error("无法访问摄像头，请检查权限设置或使用照片上传方式签到");
      }
      setCameraFailed(true);
    }
  }, []);

  // 文件上传方式（降级方案）
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        setPhotoDataUrl(dataUrl);
        setStep("preview");
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // 关闭摄像头
  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStep("form");
    setScanning(false);
    setFaceDetected(false);
  }, []);

  // 拍照
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // 居中裁剪为正方形
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoDataUrl(dataUrl);
    // 关闭摄像头
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStep("preview");
  }, []);

  // 重拍
  const retakePhoto = useCallback(() => {
    setPhotoDataUrl(null);
    openCamera();
  }, [openCamera]);

  // 提交签到
  const handleCheckin = useCallback(async () => {
    if (!isAuthenticated) {
      navigate("/register");
      return;
    }
    setStep("uploading");
    let photoUrl = "";
    if (photoDataUrl) {
      try {
        const result = await uploadMutation.mutateAsync({
          base64: photoDataUrl,
          mimeType: "image/jpeg",
        });
        photoUrl = result.url;
      } catch (e) {
        console.error("Photo upload failed:", e);
        // 上传失败不阻断签到
      }
    }
    setStep("submitting");
    checkinMutation.mutate({ department, message, photoUrl });
  }, [isAuthenticated, navigate, photoDataUrl, uploadMutation, checkinMutation, department, message]);

  // ===== 未登录 =====
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-festive-gradient flex flex-col">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
        <div className="max-w-md mx-auto px-5 py-8 flex flex-col flex-1">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-8 transition-colors">
            <ArrowLeft size={16} /><span className="text-sm">返回首页</span>
          </button>
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
              <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "radial-gradient(circle, rgba(232,0,29,0.3) 0%, rgba(232,0,29,0.05) 70%)", border: "1px solid rgba(255,215,0,0.3)" }}>
                <UserCircle2 className="text-yellow-400" size={44} />
              </div>
            </motion.div>
            <h2 className="text-2xl font-bold text-gold-gradient mb-2">请先注册登录</h2>
            <p className="text-white/50 text-sm text-center mb-8 leading-relaxed">
              参与签到需要先完成注册，<br />注册后即可刷脸签到并显示在大屏上
            </p>
            <button
              onClick={() => navigate("/register")}
              className="w-full py-4 rounded-2xl font-bold text-lg btn-festive mb-3"
            >
              立即注册参与活动
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-all"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== 已签到 =====
  if (myCheckin && step !== "success") {
    return (
      <div className="min-h-screen bg-festive-gradient flex flex-col">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
        <div className="max-w-md mx-auto px-5 py-8 flex flex-col flex-1">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-8 transition-colors">
            <ArrowLeft size={16} /><span className="text-sm">返回首页</span>
          </button>
          <div className="flex-1 flex flex-col items-center justify-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.8 }}>
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-yellow-400/60 mb-6 mx-auto"
                style={{ boxShadow: "0 0 20px rgba(255,215,0,0.3)" }}>
                {myCheckin.avatarUrl ? (
                  <img src={myCheckin.avatarUrl} alt="签到照片" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-800/50 to-yellow-600/30 flex items-center justify-center text-4xl font-bold text-yellow-400">
                    {myCheckin.userName?.[0] || "✦"}
                  </div>
                )}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="text-green-400" size={20} />
                <span className="text-green-400 font-semibold">已完成签到</span>
              </div>
              <h2 className="text-xl font-bold text-gold-gradient mb-1">{myCheckin.userName}</h2>
              {myCheckin.department && <p className="text-white/50 text-sm mb-4">{myCheckin.department}</p>}
              <div className="glass-card border-gold-glow rounded-xl p-4 text-center">
                <p className="text-white/70 text-sm italic">"{myCheckin.message || "欢迎参加2026开工盛典！"}"</p>
              </div>
              <p className="text-white/30 text-xs mt-4">
                签到时间：{new Date(myCheckin.checkedInAt).toLocaleString("zh-CN")}
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 w-full space-y-3">
              <button onClick={() => navigate("/schedule")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                查看活动日程
              </button>
              <button onClick={() => navigate("/quiz")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                参与AI知识问答
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-festive-gradient flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-yellow-400/80 to-transparent" />
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

      <div className="max-w-md mx-auto px-5 py-6 flex flex-col flex-1">
        <button onClick={() => step === "camera" ? closeCamera() : navigate("/")}
          className="flex items-center gap-2 text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft size={16} /><span className="text-sm">{step === "camera" ? "取消拍照" : "返回首页"}</span>
        </button>

        <AnimatePresence mode="wait">

          {/* ===== 表单步骤 ===== */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center relative"
                  style={{ background: "radial-gradient(circle, rgba(232,0,29,0.25) 0%, rgba(232,0,29,0.05) 70%)", border: "1px solid rgba(255,215,0,0.3)" }}>
                  <Scan className="text-yellow-400" size={36} />
                  <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-ping" style={{ animationDuration: "2s" }} />
                </div>
                <h1 className="text-2xl font-bold text-gold-gradient mb-1">刷脸签到</h1>
                <p className="text-white/50 text-sm">AI人脸识别，照片实时显示在大屏</p>
              </div>

              {/* 用户信息 */}
              <div className="glass-card border-gold-glow rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-700/40 to-yellow-600/30 flex items-center justify-center text-lg font-bold text-yellow-400">
                    {user?.name?.[0] || "✦"}
                  </div>
                  <div>
                    <p className="text-white/90 font-medium">{user?.name || "员工"}</p>
                    <p className="text-white/40 text-xs">已登录 · 点击下方按钮开始签到</p>
                  </div>
                </div>
              </div>

              {/* 部门选择 */}
              <div className="mb-4">
                <label className="text-white/60 text-sm mb-2 block">所在部门（可选）</label>
                <div className="grid grid-cols-3 gap-2">
                  {DEPARTMENTS.map((dept) => (
                    <button key={dept} onClick={() => setDepartment(dept)}
                      className={`py-2 px-2 rounded-lg text-xs transition-all ${
                        department === dept
                          ? "bg-red-700/40 border border-yellow-400/50 text-yellow-400"
                          : "glass-card text-white/60 hover:text-white/80"
                      }`}>
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* 签到寄语 */}
              <div className="mb-6">
                <label className="text-white/60 text-sm mb-2 block">签到寄语</label>
                <div className="space-y-2">
                  {MESSAGES.map((msg) => (
                    <button key={msg} onClick={() => setMessage(msg)}
                      className={`w-full py-2.5 px-4 rounded-lg text-sm text-left transition-all ${
                        message === msg
                          ? "bg-red-700/30 border border-yellow-400/40 text-yellow-300"
                          : "glass-card text-white/60 hover:text-white/80"
                      }`}>
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* 开始刷脸按钮 */}
              <button onClick={openCamera} className="w-full py-4 rounded-2xl font-bold text-lg relative overflow-hidden group btn-festive mb-3">
                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
                <span className="relative flex items-center justify-center gap-2">
                  <Camera size={20} />
                  开始刷脸签到
                </span>
              </button>
              {/* 摄像头失败时显示文件上传降级方案 */}
              {cameraFailed && (
                <div className="text-center">
                  <p className="text-white/40 text-xs mb-2">摄像头不可用？可以上传照片代替</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload size={16} />
                    上传照片签到
                  </button>
                </div>
              )}
              {/* 始终显示上传选项 */}
              {!cameraFailed && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl text-white/30 text-xs hover:text-white/50 transition-all flex items-center justify-center gap-1.5 mt-1"
                >
                  <Upload size={12} />
                  或上传照片签到
                </button>
              )}
            </motion.div>
          )}

          {/* ===== 摄像头步骤 ===== */}
          {step === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gold-gradient">AI人脸识别</h2>
                <p className="text-white/50 text-sm mt-1">
                  {scanning ? "正在识别人脸，请保持正面朝向..." : "识别成功！点击拍照完成签到"}
                </p>
              </div>

              {/* 摄像头预览 */}
              <div className="relative mx-auto w-72 h-72 rounded-2xl overflow-hidden mb-6"
                style={{ border: faceDetected ? "2px solid rgba(0,255,150,0.7)" : "2px solid rgba(255,215,0,0.3)" }}>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                <AIScanOverlay scanning={scanning} />
                <FaceDetectedOverlay show={faceDetected} />
              </div>

              {/* 拍照按钮 */}
              <div className="flex gap-3">
                <button onClick={closeCamera}
                  className="flex-1 py-3 rounded-xl glass-card text-white/60 text-sm flex items-center justify-center gap-2">
                  <RotateCcw size={16} />取消
                </button>
                <button
                  onClick={takePhoto}
                  disabled={!faceDetected}
                  className={`flex-2 flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    faceDetected ? "btn-festive" : "bg-white/10 text-white/30 cursor-not-allowed"
                  }`}
                >
                  <Camera size={18} />
                  {faceDetected ? "拍照签到" : "识别中..."}
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== 预览步骤 ===== */}
          {step === "preview" && photoDataUrl && (
            <motion.div key="preview" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-gold-gradient">确认签到照片</h2>
                <p className="text-white/50 text-sm mt-1">照片将显示在大屏签到墙上</p>
              </div>

              {/* 照片预览 */}
              <div className="relative mx-auto w-64 h-64 rounded-2xl overflow-hidden mb-6"
                style={{ border: "2px solid rgba(255,215,0,0.5)", boxShadow: "0 0 30px rgba(255,215,0,0.2)" }}>
                <img src={photoDataUrl} alt="签到照片" className="w-full h-full object-cover scale-x-[-1]" />
                {/* AI风格叠加效果 */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(232,0,29,0.08) 0%, transparent 50%, rgba(255,215,0,0.06) 100%)" }} />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-mono text-green-300"
                  style={{ background: "rgba(0,40,30,0.8)", border: "1px solid rgba(0,255,150,0.4)" }}>
                  ✓ AI识别完成
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={retakePhoto}
                  className="flex-1 py-3 rounded-xl glass-card text-white/60 text-sm flex items-center justify-center gap-2">
                  <RotateCcw size={16} />重新拍照
                </button>
                <button onClick={handleCheckin}
                  className="flex-1 py-3 rounded-xl btn-festive font-bold text-sm flex items-center justify-center gap-2">
                  <CheckCircle2 size={18} />确认签到
                </button>
              </div>
            </motion.div>
          )}

          {/* ===== 上传/提交中 ===== */}
          {(step === "uploading" || step === "submitting") && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center">
              <div className="relative mb-8">
                <div className="w-28 h-28 rounded-full border-2 border-yellow-400/30 flex items-center justify-center">
                  <Loader2 className="text-yellow-400 animate-spin" size={40} />
                </div>
                <div className="absolute inset-0 rounded-full border border-yellow-400/20 animate-ping" style={{ animationDuration: "1.5s" }} />
              </div>
              <h2 className="text-xl font-bold text-gold-gradient mb-3">
                {step === "uploading" ? "AI正在处理照片..." : "正在完成签到..."}
              </h2>
              <p className="text-white/50 text-sm text-center">
                {step === "uploading" ? "照片上传中，请稍候" : "签到信息同步到大屏中"}
              </p>
              <div className="mt-6 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-yellow-400/60 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ===== 签到成功 ===== */}
          {step === "success" && checkinResult && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="mb-6">
                <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-yellow-400/60 mx-auto"
                  style={{ boxShadow: "0 0 30px rgba(255,215,0,0.4)" }}>
                  {checkinResult.avatarUrl ? (
                    <img src={checkinResult.avatarUrl} alt="签到照片" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-red-800/50 to-yellow-600/30 flex items-center justify-center text-5xl font-bold text-yellow-400">
                      {checkinResult.userName?.[0] || "✦"}
                    </div>
                  )}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-center">
                <div className="text-4xl mb-3">🎉</div>
                <h2 className="text-2xl font-bold text-gold-gradient mb-2">签到成功！</h2>
                <p className="text-white/60 text-sm mb-2">{checkinResult.userName}，欢迎参加2026开工盛典</p>
                <p className="text-white/40 text-xs">您的照片已实时同步到大屏展示</p>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 w-full space-y-3">
                <button onClick={() => navigate("/schedule")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                  查看今日活动日程
                </button>
                <button onClick={() => navigate("/quiz")} className="w-full py-3 rounded-xl border border-yellow-400/30 text-yellow-400/80 text-sm hover:bg-yellow-400/5 transition-all">
                  参与AI知识问答
                </button>
                <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl text-white/40 text-sm hover:text-white/60 transition-all">
                  返回首页
                </button>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
