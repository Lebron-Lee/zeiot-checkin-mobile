# 中易开工盛典互动系统 — 前后端部署手册 v4.0

> **系统名称：** 中易物联集团 2026 开工盛典互动系统  
> **版本：** v4.0 | **更新时间：** 2026-02-25  
> **技术栈：** React 19 + Tailwind CSS 4 + Express 4 + tRPC 11 + Drizzle ORM + MySQL 8 + WebSocket  
> **架构说明：** 单一 Node.js 应用，手机端（`/`）与大屏端（`/bigscreen`）通过路由区分，WebSocket 实现双端实时互动。

---

## 目录

1. [系统架构概览](#1-系统架构概览)
2. [服务器环境要求](#2-服务器环境要求)
3. [依赖软件安装](#3-依赖软件安装)
4. [代码获取与准备](#4-代码获取与准备)
5. [数据库初始化](#5-数据库初始化)
6. [环境变量配置](#6-环境变量配置)
7. [构建与启动](#7-构建与启动)
8. [PM2 进程管理](#8-pm2-进程管理)
9. [Nginx 反向代理配置](#9-nginx-反向代理配置)
10. [SSL 证书配置](#10-ssl-证书配置)
11. [Docker Compose 方案（可选）](#11-docker-compose-方案可选)
12. [管理员账号设置](#12-管理员账号设置)
13. [调试模式使用说明](#13-调试模式使用说明)
14. [上线前检查清单](#14-上线前检查清单)
15. [活动当天操作节点](#15-活动当天操作节点)
16. [常见问题排查](#16-常见问题排查)
17. [系统功能说明](#17-系统功能说明)

---

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                      用户访问层                           │
│  手机端 (/)  ←→  大屏端 (/bigscreen)  ←→  管理后台 (/admin) │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + WebSocket
┌────────────────────────▼────────────────────────────────┐
│               Nginx 反向代理 (443/80)                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│          Node.js Express 服务器 (端口 3000)               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  tRPC API    │  │  WebSocket   │  │   静态文件     │  │
│  │  /api/trpc   │  │  /ws         │  │   React SPA   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                MySQL / TiDB 数据库                        │
│  users | registrations | checkins | wish_cards           │
│  quiz_questions | quiz_answers | awards | lottery        │
│  event_config | team_groups                              │
└─────────────────────────────────────────────────────────┘
```

**访问路由说明：**

| 路径 | 说明 | 适用设备 |
|------|------|---------|
| `/` | 手机端首页（活动预热倒计时） | 手机 |
| `/register` | 活动报名注册 | 手机 |
| `/checkin` | AI刷脸签到 | 手机 |
| `/schedule` | 活动日程 | 手机 |
| `/awards` | 荣誉殿堂 | 手机 |
| `/quiz` | AI知识问答 | 手机 |
| `/wishcard` | 心愿卡 | 手机 |
| `/profile` | 个人中心 | 手机 |
| `/bigscreen` | 大屏展示系统 | 大屏投影 |
| `/admin` | 管理员后台 | 管理员 |

---

## 2. 服务器环境要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 磁盘 | 20 GB SSD | 40 GB SSD |
| 操作系统 | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| 网络 | 公网 IP + 域名 | 公网 IP + 域名 |
| 数据库 | MySQL 8.0 | MySQL 8.0 / TiDB |

> **重要：** 签到刷脸功能调用摄像头 API，浏览器要求必须在 **HTTPS** 安全上下文下运行（localhost 除外）。生产环境必须配置 SSL 证书。

---

## 3. 依赖软件安装

### 3.1 安装 Node.js 22.x

```bash
# 使用 NodeSource 官方源
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本
node --version   # 应显示 v22.x.x
npm --version
```

### 3.2 安装 pnpm

```bash
npm install -g pnpm@10.4.1
pnpm --version   # 应显示 10.4.1
```

### 3.3 安装 PM2

```bash
npm install -g pm2
pm2 --version
```

### 3.4 安装 Nginx

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.5 安装 MySQL 8.0

```bash
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# 安全初始化（设置 root 密码，移除匿名用户等）
sudo mysql_secure_installation
```

---

## 4. 代码获取与准备

### 方式一：从 GitHub 克隆

```bash
# 创建应用目录
sudo mkdir -p /var/www/zeiot-checkin
sudo chown $USER:$USER /var/www/zeiot-checkin

# 克隆代码（替换为实际仓库地址）
git clone https://github.com/your-org/zeiot-checkin-mobile.git /var/www/zeiot-checkin
cd /var/www/zeiot-checkin
```

### 方式二：从 Manus 平台导出

在 Manus 管理界面 → **Code** 面板 → 点击「Download all files」下载压缩包，上传至服务器后解压：

```bash
sudo mkdir -p /var/www/zeiot-checkin
sudo chown $USER:$USER /var/www/zeiot-checkin
unzip zeiot-checkin-mobile.zip -d /var/www/zeiot-checkin
cd /var/www/zeiot-checkin
```

---

## 5. 数据库初始化

### 5.1 创建数据库和用户

```sql
-- 以 root 登录 MySQL
sudo mysql -u root -p

-- 创建数据库
CREATE DATABASE zeiot_checkin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（替换 your_password 为强密码）
CREATE USER 'zeiot_app'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON zeiot_checkin.* TO 'zeiot_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5.2 执行数据库迁移（创建表结构）

```bash
cd /var/www/zeiot-checkin

# 设置数据库连接
export DATABASE_URL="mysql://zeiot_app:your_password@localhost:3306/zeiot_checkin"

# 执行迁移
pnpm drizzle-kit migrate

# 验证表结构
mysql -u zeiot_app -p zeiot_checkin -e "SHOW TABLES;"
```

应看到以下表：`users`、`registrations`、`checkins`、`wish_cards`、`awards`、`award_winners`、`quiz_questions`、`quiz_answers`、`lottery_events`、`lottery_results`、`event_config`、`team_groups`。

### 5.3 插入初始数据

将以下 SQL 保存为 `init_data.sql` 并执行：

```sql
-- 活动配置
INSERT INTO event_config (configKey, configValue) VALUES
('event_name', '2026开工盛典 · AI智启同心聚力焕新出发'),
('event_date', '2026-03-01'),
('event_location', '中易物联集团总部'),
('event_theme', 'AI智启·同心聚力·焕新出发'),
('checkin_open_time', '2026-03-01T09:00:00+08:00'),
('debug_mode', 'false')
ON DUPLICATE KEY UPDATE configValue = VALUES(configValue);

-- 奖项数据
INSERT INTO awards (name, description, icon, `order`) VALUES
('AI效率革命奖', '年度AI工具应用最佳实践，引领团队效率提升的先锋', '🤖', 1),
('年度优秀员工奖', '综合表现突出，为公司发展做出卓越贡献的员工', '⭐', 2),
('最佳团队协作奖', '跨部门协作典范，推动项目高效落地的团队', '🤝', 3),
('创新突破奖', '勇于创新，推动业务模式或技术方案重大突破', '💡', 4),
('客户之星奖', '客户服务和满意度方面表现卓越的员工', '🌟', 5),
('年度成长之星', '个人成长进步最显著，潜力无限的新星员工', '🚀', 6)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 抽奖活动
INSERT INTO lottery_events (name, description, prizePool, maxWinners) VALUES
('现金盲盒大作战', '随机抽取幸运员工，赢取神秘现金盲盒', 500, 5),
('AI幸运大抽奖', '年度压轴大奖，最高奖金', 2000, 1),
('团队贡献奖', '最佳团队现金奖励，每人800元', 800, 3)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- AI知识题库（20题）
INSERT INTO quiz_questions (question, optionA, optionB, optionC, optionD, correctAnswer, explanation, reward, isActive) VALUES
('大语言模型（LLM）的核心架构是什么？', 'CNN卷积神经网络', 'Transformer注意力机制', 'RNN循环神经网络', 'GAN生成对抗网络', 'B', 'LLM的核心是Transformer架构，通过自注意力机制处理长距离依赖关系，GPT、BERT等主流模型均基于此架构。', 10, true),
('ChatGPT背后的公司是哪家？', 'Google DeepMind', 'Meta AI', 'OpenAI', 'Anthropic', 'C', 'ChatGPT由OpenAI开发，于2022年11月发布，是目前全球用户量最大的AI对话产品之一。', 10, true),
('AI中的"幻觉"（Hallucination）指的是什么？', 'AI产生视觉错误', 'AI生成不准确或虚假信息', 'AI运行速度过慢', 'AI无法理解图片', 'B', 'AI幻觉是指大语言模型生成看似合理但实际上不准确或完全虚假的信息，是当前LLM的主要局限之一。', 10, true),
('RAG技术的全称是什么？', 'Rapid AI Generation', 'Retrieval-Augmented Generation', 'Real-time AI Guidance', 'Recursive Algorithm Graph', 'B', 'RAG（检索增强生成）通过在生成前检索相关文档来增强LLM的准确性，有效减少幻觉问题，是企业AI落地的重要技术路径。', 10, true),
('以下哪个是向量数据库，常用于AI应用？', 'MySQL', 'MongoDB', 'Pinecone', 'Redis', 'C', 'Pinecone是专为AI应用设计的向量数据库，用于存储和检索高维向量嵌入，是RAG架构的核心组件。', 10, true),
('GPT-4相比GPT-3.5最显著的提升是什么？', '速度提升10倍', '多模态能力（支持图像输入）', '参数量增加100倍', '支持实时联网', 'B', 'GPT-4最重要的升级是引入多模态能力，可以理解和分析图像内容，而GPT-3.5仅支持文本输入。', 10, true),
('Prompt Engineering（提示词工程）的核心目标是什么？', '减少AI的计算成本', '通过优化输入提示来获得更好的AI输出', '训练新的AI模型', '提高AI的运行速度', 'B', '提示词工程是通过精心设计输入提示来引导AI模型产生更准确、相关和有用的输出，是使用AI工具的核心技能。', 10, true),
('"AI Agent"（AI智能体）与普通AI聊天机器人的最大区别是什么？', '响应速度更快', '能够自主规划和执行多步骤任务', '支持更多语言', '界面更美观', 'B', 'AI Agent能够自主分解目标、规划步骤、调用工具并执行多步骤任务，而普通聊天机器人只能进行单轮对话响应。', 10, true),
('以下哪个AI工具主要用于代码生成？', 'Midjourney', 'GitHub Copilot', 'Stable Diffusion', 'ElevenLabs', 'B', 'GitHub Copilot是微软和OpenAI联合开发的AI代码助手，能够根据注释和上下文自动生成代码，大幅提升开发效率。', 10, true),
('物联网（IoT）与AI结合后，最典型的应用场景是什么？', '社交媒体推荐', '预测性维护与智能运维', '在线购物推荐', '视频内容生成', 'B', 'IoT+AI的核心价值在于通过传感器数据实现设备故障预测、智能运维和自动化控制，这也是中易物联的核心业务方向。', 10, true),
('AIGC的全称是什么？', 'AI Generated Content（AI生成内容）', 'AI Global Computing（AI全球计算）', 'AI Guided Control（AI引导控制）', 'AI Growth Cycle（AI增长周期）', 'A', 'AIGC（AI Generated Content）指利用AI技术自动生成文本、图像、音频、视频等内容，是当前最热门的AI应用方向之一。', 10, true),
('以下哪个是开源的大语言模型？', 'GPT-4', 'Claude', 'LLaMA', 'Gemini Ultra', 'C', 'Meta发布的LLaMA系列是目前最重要的开源大语言模型，允许企业和研究者在本地部署和微调，推动了AI民主化进程。', 10, true),
('AI"微调"（Fine-tuning）技术的主要目的是什么？', '减少模型参数量', '让通用模型适应特定领域任务', '提高模型推理速度', '降低模型内存占用', 'B', '微调是在预训练模型基础上，使用特定领域数据进行进一步训练，使模型更好地适应特定业务场景，是企业AI落地的重要方式。', 10, true),
('以下哪个概念描述了AI模型在训练数据之外的泛化能力？', '过拟合', '欠拟合', '迁移学习', '零样本学习', 'D', '零样本学习（Zero-shot Learning）是指AI模型无需特定任务的训练数据，直接利用预训练知识处理新任务的能力，GPT系列模型展现了强大的零样本能力。', 10, true),
('"数字孪生"最准确的定义是什么？', '数字化的双胞胎员工', '物理实体的虚拟数字副本', '两个AI系统的组合', '数字化的镜像网站', 'B', '数字孪生是物理实体（设备、建筑、城市等）的实时虚拟数字副本，通过IoT数据持续同步，用于监控、模拟和优化，是工业AI的核心技术。', 10, true),
('Stable Diffusion和Midjourney主要用于什么？', '文本翻译', 'AI图像生成', '语音识别', '代码审查', 'B', '两者都是AI图像生成工具，通过文本描述（Prompt）生成高质量图像，代表了生成式AI在视觉创作领域的重大突破。', 10, true),
('在AI伦理中，"算法偏见"主要来源于什么？', 'AI运算速度不足', '训练数据中存在的偏见和不平衡', 'AI硬件质量问题', '编程语言的限制', 'B', '算法偏见主要源于训练数据中存在的历史偏见、数据不平衡或采样偏差，导致AI系统对特定群体产生不公平的结果。', 10, true),
('Transformer的上下文窗口（Context Window）决定了什么？', 'AI的训练速度', 'AI能处理的最大文本长度', 'AI的图像分辨率', 'AI的多语言能力', 'B', 'Transformer架构的上下文窗口决定了模型能处理的最大文本长度，GPT-4支持128K tokens的超长上下文，使其能处理复杂长文档。', 10, true),
('中国百度发布的大语言模型产品叫什么？', '通义千问', '文心一言', '混元大模型', '讯飞星火', 'B', '文心一言（ERNIE Bot）是百度发布的大语言模型，通义千问是阿里巴巴的产品，混元是腾讯的，讯飞星火是科大讯飞的。', 10, true),
('AI在物联网设备管理中，"边缘计算"的主要优势是什么？', '降低设备成本', '减少数据传输延迟，保护数据隐私', '提高云服务器性能', '增加网络带宽', 'B', '边缘计算将AI推理部署在靠近数据源的设备端，减少数据上传云端的延迟，同时避免敏感数据外传，是工业IoT的关键技术。', 10, true);
```

```bash
mysql -u zeiot_app -p zeiot_checkin < init_data.sql
```

---

## 6. 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
cat > /var/www/zeiot-checkin/.env << 'EOF'
# 运行环境
NODE_ENV=production
PORT=3000

# 数据库连接
DATABASE_URL=mysql://zeiot_app:your_password@localhost:3306/zeiot_checkin

# JWT 密钥（使用 openssl rand -base64 32 生成）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Manus OAuth（如使用Manus平台部署，这些由平台自动注入）
VITE_APP_ID=your_manus_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=your_owner_open_id
OWNER_NAME=管理员姓名

# Manus 内置 AI API（AI功能所需）
BUILT_IN_FORGE_API_URL=https://api.manus.im/forge
BUILT_IN_FORGE_API_KEY=your_server_forge_api_key
VITE_FRONTEND_FORGE_API_KEY=your_frontend_forge_api_key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im/forge

# S3 文件存储（用于存储签到照片）
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=your-bucket-name
EOF

# 保护环境变量文件
chmod 600 /var/www/zeiot-checkin/.env
```

**环境变量说明：**

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | ✅ | MySQL 连接字符串 |
| `JWT_SECRET` | ✅ | Session 签名密钥，32 位以上随机字符串 |
| `VITE_APP_ID` | ✅ | Manus OAuth 应用 ID |
| `OAUTH_SERVER_URL` | ✅ | Manus OAuth 后端地址 |
| `VITE_OAUTH_PORTAL_URL` | ✅ | Manus 登录门户地址 |
| `OWNER_OPEN_ID` | ✅ | 管理员的 Manus OpenID |
| `BUILT_IN_FORGE_API_KEY` | ✅ | Manus AI API 密钥（服务端，严格保密） |
| `VITE_FRONTEND_FORGE_API_KEY` | ✅ | Manus AI API 密钥（前端） |
| `PORT` | ❌ | 服务端口，默认 3000 |

---

## 7. 构建与启动

### 7.1 安装依赖

```bash
cd /var/www/zeiot-checkin
pnpm install --frozen-lockfile
```

### 7.2 构建生产版本

```bash
pnpm build

# 验证构建产物
ls dist/          # 应包含 index.js（后端）和 public/（前端静态文件）
```

### 7.3 测试启动（验证无错误）

```bash
NODE_ENV=production node dist/index.js
# 看到以下输出表示成功：
# Server running on http://localhost:3000/
```

按 `Ctrl+C` 停止，改用 PM2 管理。

---

## 8. PM2 进程管理

### 8.1 创建 PM2 配置文件

```bash
cat > /var/www/zeiot-checkin/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'zeiot-checkin',
    script: './dist/index.js',
    cwd: '/var/www/zeiot-checkin',
    instances: 1,
    exec_mode: 'fork',
    env_file: '.env',
    env: { NODE_ENV: 'production', PORT: 3000 },
    out_file: '/var/log/zeiot-checkin/out.log',
    error_file: '/var/log/zeiot-checkin/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '512M',
    restart_delay: 3000,
    watch: false,
  }]
};
EOF

sudo mkdir -p /var/log/zeiot-checkin
sudo chown $USER:$USER /var/log/zeiot-checkin
```

### 8.2 启动与开机自启

```bash
pm2 start /var/www/zeiot-checkin/ecosystem.config.cjs
pm2 save
pm2 startup   # 按提示执行输出的 sudo 命令
```

### 8.3 常用命令

```bash
pm2 status                          # 查看进程状态
pm2 logs zeiot-checkin              # 查看实时日志
pm2 logs zeiot-checkin --lines 100  # 查看最近 100 行
pm2 restart zeiot-checkin           # 重启
pm2 reload zeiot-checkin            # 零停机重载（更新代码后使用）
pm2 stop zeiot-checkin              # 停止
pm2 monit                           # 实时监控面板
```

---

## 9. Nginx 反向代理配置

```bash
sudo tee /etc/nginx/sites-available/zeiot-checkin << 'EOF'
# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 主配置
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    # 安全响应头
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;

    # 上传大小限制（签到照片）
    client_max_body_size 10M;

    # WebSocket 支持（双端实时互动核心）
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # API 请求
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # 前端 SPA（所有其他请求）
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 启用配置
sudo ln -sf /etc/nginx/sites-available/zeiot-checkin /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 10. SSL 证书配置

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 申请证书（替换为实际域名）
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 验证自动续期
sudo certbot renew --dry-run

# 设置自动续期定时任务
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

---

## 11. Docker Compose 方案（可选）

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: mysql://zeiot_app:password@db:3306/zeiot_checkin
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: zeiot_checkin
      MYSQL_USER: zeiot_app
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  mysql_data:
```

```bash
docker-compose up -d
docker-compose logs -f app
```

---

## 12. 管理员账号设置

系统支持**本地注册体系**（手机号+姓名注册）和 **Manus OAuth** 两种登录方式。

### 12.1 设置本地注册用户为管理员

```sql
-- 本地注册用户的 openId 格式为 local_手机号
-- 例如手机号 13311582244 的用户：
UPDATE users SET role = 'admin' WHERE openId = 'local_13311582244';

-- 验证
SELECT id, name, openId, role FROM users WHERE role = 'admin';
```

### 12.2 设置 Manus OAuth 用户为管理员

```sql
-- 通过邮箱查找用户
SELECT id, name, email, openId FROM users WHERE email = 'user@example.com';

-- 提升为管理员
UPDATE users SET role = 'admin' WHERE id = [用户ID];
```

### 12.3 管理后台功能

管理员登录后访问 `/admin`，包含五个功能 Tab：

| Tab | 功能 |
|-----|------|
| 概览 | 实时数据统计、调试模式开关、一键初始化 |
| 签到 | 签到记录查看、报名名单管理 |
| 颁奖 | AI颁奖词生成（输入姓名和奖项，AI自动生成） |
| 抽奖 | 现金盲盒/幸运大抽奖，结果广播到大屏 |
| 心愿 | 查看所有员工心愿卡内容 |

---

## 13. 调试模式使用说明

调试模式允许在活动正式开始时间（2026-03-01 09:00）前进行签到测试，方便活动前验证系统功能。

### 开启方式

1. 管理员登录后进入 `/admin`
2. 在「概览」Tab 找到「调试模式」开关
3. 点击开关即可开启/关闭（状态实时保存到数据库）

### 状态说明

| 状态 | 签到时间限制 | 适用场景 |
|------|------------|---------|
| 调试模式**关闭**（默认） | 仅 2026-03-01 09:00 后可签到 | 活动正式进行 |
| 调试模式**开启** | 随时可签到，无时间限制 | 活动前测试验证 |

> **重要提醒：** 活动正式开始前，务必关闭调试模式并执行「一键初始化」清空所有测试数据。

---

## 14. 上线前检查清单

### 环境验证

```bash
# 检查 Node.js 版本
node --version   # 应 >= 22.x

# 检查数据库连接
mysql -u zeiot_app -p zeiot_checkin -e "SHOW TABLES;"

# 检查应用进程
pm2 status   # zeiot-checkin 应为 online

# 检查端口监听
ss -tlnp | grep 3000

# 检查 Nginx
sudo nginx -t && sudo systemctl status nginx

# 检查 HTTPS
curl -I https://your-domain.com   # 应返回 200

# 检查 WebSocket（访问 /bigscreen，浏览器控制台无 WebSocket 错误）
```

### 功能验证清单

- [ ] 手机端首页倒计时正常显示（目标日期：2026-03-01）
- [ ] 注册页面可正常提交（手机号+姓名+部门）
- [ ] 开启调试模式后可正常签到
- [ ] 签到刷脸摄像头可正常调用（需 HTTPS）
- [ ] 签到照片可上传并显示在签到墙
- [ ] 大屏端 `/bigscreen` 正常显示（Logo放大、标题横排）
- [ ] 手机签到后大屏实时更新（WebSocket 正常）
- [ ] AI 问答可正常答题（答对跳下题/答错显示解析/最终总结）
- [ ] 心愿卡提交后显示在大屏心愿墙
- [ ] 管理后台 AI 颁奖词生成正常
- [ ] 管理后台抽奖功能正常（结果广播到大屏）
- [ ] 管理后台分组功能正常（雷总/刘总/王总分入不同组）
- [ ] 一键初始化功能正常（清空测试数据）

### 数据准备清单

- [ ] 数据库中活动日期已设为 `2026-03-01`
- [ ] 奖项数据已录入（6个奖项）
- [ ] AI 问答题库已录入（20题）
- [ ] 抽奖活动已配置
- [ ] 获奖人员名单已提前录入（可选，颁奖词更精准）
- [ ] 调试模式已**关闭**
- [ ] 测试数据已清空（执行一键初始化）

---

## 15. 活动当天操作节点

| 时间 | 操作 | 负责人 |
|------|------|-------|
| 活动前一天 | 录入获奖人员名单到数据库 | 技术负责人 |
| 活动前一天 | 全功能测试，确认正常 | 技术负责人 |
| 当天 08:00 | 开启调试模式，最终验证 | 技术负责人 |
| 当天 08:30 | 关闭调试模式，执行一键初始化 | 技术负责人 |
| 当天 08:45 | 大屏端 `/bigscreen` 投屏就绪 | 现场技术 |
| 当天 08:50 | 向员工发送手机端访问链接/二维码 | 活动主持 |
| **09:00** | **签到正式开始，员工刷脸签到** | 全员 |
| 09:00-09:30 | 签到环节，大屏实时展示签到墙 | 现场技术 |
| 09:30 | 签到结束，大屏切换到活动主流程 | 现场技术 |
| 颁奖环节 | 管理后台生成 AI 颁奖词，投屏展示 | 主持人+技术 |
| 抽奖环节 | 管理后台执行抽奖，大屏展示结果 | 主持人+技术 |
| 心愿卡环节 | 员工提交心愿卡，大屏实时展示心愿墙 | 全员 |
| 活动结束后 | 导出签到记录、心愿卡数据备份 | 技术负责人 |

---

## 16. 常见问题排查

### Q1：摄像头无法调用（签到刷脸功能不可用）

**原因：** 浏览器要求 HTTPS 才能访问摄像头 API。

**解决：** 确保域名已配置 SSL 证书，通过 `https://` 访问系统。本地测试可使用 `localhost`（浏览器视为安全上下文）。

### Q2：WebSocket 连接失败，大屏不实时更新

**原因：** Nginx 未正确配置 WebSocket 升级头。

**解决：** 检查 Nginx 配置中 `/ws` 路由是否包含 `Upgrade` 和 `Connection` 头，重载 Nginx：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Q3：签到照片上传失败

**原因：** S3 配置错误或存储服务不可用。

**解决：** 检查 `.env` 中的 AWS 配置，确认 S3 Bucket 权限允许写入，或检查 Manus 内置存储服务是否正常。

### Q4：AI 颁奖词生成失败

**原因：** `BUILT_IN_FORGE_API_KEY` 未配置或已过期。

**解决：** 检查 API Key 是否有效，在 Manus 平台重新获取并更新 `.env`。

### Q5：数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 测试连接
mysql -u zeiot_app -p -h localhost zeiot_checkin

# 查看错误日志
sudo tail -f /var/log/mysql/error.log
```

### Q6：PM2 进程崩溃重启

```bash
# 查看错误日志
pm2 logs zeiot-checkin --err --lines 50
```

### Q7：签到时间限制问题（活动前无法签到）

**解决：** 在管理后台 `/admin` → 概览 Tab → 开启「调试模式」开关，即可跳过时间限制进行测试。

---

## 17. 系统功能说明

### 手机端功能

| 功能 | 路径 | 说明 |
|------|------|------|
| 活动预热倒计时 | `/` | 展示活动主题、倒计时、导航入口 |
| 活动报名注册 | `/register` | 手机号+姓名+部门注册，支持正式员工/特邀嘉宾/合作伙伴 |
| AI刷脸签到 | `/checkin` | 摄像头拍照，AI科技感扫描动画，照片同步大屏签到墙 |
| 活动日程 | `/schedule` | 完整行程表（上午场09:00-12:00，下午场13:30-17:30） |
| 荣誉殿堂 | `/awards` | 奖项展示，获奖人员名单 |
| AI知识问答 | `/quiz` | 20道AI主题题目，答对跳下题，答错显示解析，最终总结 |
| 心愿卡 | `/wishcard` | 填写心愿卡，实时显示在大屏心愿墙 |
| 个人中心 | `/profile` | 查看个人签到状态和答题记录 |

### 大屏端功能

| 功能 | 说明 |
|------|------|
| 实时签到墙 | 员工签到后照片实时出现在签到墙（网格布局） |
| 心愿墙 | 员工心愿卡实时滚动展示 |
| 分组结果 | 显示AI分组结果（雷总/刘总/王总固定分入不同组） |
| 颁奖词弹窗 | 管理员触发后全屏展示AI生成颁奖词 |
| 抽奖结果弹窗 | 抽奖结果全屏展示并广播 |

### 管理后台功能

| Tab | 功能 |
|-----|------|
| 概览 | 实时数据统计、调试模式开关（跳过时间限制）、一键初始化（清空测试数据） |
| 签到 | 查看签到记录和报名名单 |
| 颁奖 | 输入获奖人姓名和奖项，AI自动生成颁奖词并广播到大屏 |
| 抽奖 | 现金盲盒/幸运大抽奖/分组系统，结果实时广播到大屏 |
| 心愿 | 查看所有员工心愿卡内容 |

---

*文档版本：v4.0 | 维护：中易物联集团技术团队 | 更新日期：2026-02-25*
