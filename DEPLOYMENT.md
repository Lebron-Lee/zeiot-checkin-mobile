# 中易开工盛典双端互动系统 — 部署手册

> 版本：v2.0 | 更新时间：2026-02-25 | 作者：Manus AI

---

## 目录

1. [系统架构概览](#1-系统架构概览)
2. [环境要求](#2-环境要求)
3. [本地开发环境搭建](#3-本地开发环境搭建)
4. [生产环境部署](#4-生产环境部署)
5. [数据库配置与迁移](#5-数据库配置与迁移)
6. [环境变量说明](#6-环境变量说明)
7. [功能模块说明](#7-功能模块说明)
8. [大屏端使用指南](#8-大屏端使用指南)
9. [管理员操作指南](#9-管理员操作指南)
10. [常见问题排查](#10-常见问题排查)

---

## 1. 系统架构概览

本系统为**单一代码库双端应用**，手机端与大屏端共用同一套后端服务，通过路由区分前端展示：

```
zeiot-checkin-mobile/
├── client/                 # 前端（React 19 + Tailwind 4 + Vite）
│   └── src/
│       ├── pages/
│       │   ├── Home.tsx         # 手机端首页（活动预热倒计时）
│       │   ├── Register.tsx     # 活动报名
│       │   ├── Checkin.tsx      # AI签到
│       │   ├── Schedule.tsx     # 活动日程
│       │   ├── Awards.tsx       # 荣誉殿堂
│       │   ├── Quiz.tsx         # AI知识问答
│       │   ├── WishCard.tsx     # 心愿卡
│       │   ├── Profile.tsx      # 个人中心
│       │   ├── BigScreen.tsx    # 大屏端展示
│       │   └── Admin.tsx        # 管理员后台
│       └── hooks/
│           └── useWebSocket.ts  # WebSocket实时连接
├── server/                 # 后端（Express 4 + tRPC 11）
│   ├── routers.ts          # API路由定义
│   ├── db.ts               # 数据库查询函数
│   └── _core/
│       └── index.ts        # WebSocket服务器
├── drizzle/
│   └── schema.ts           # 数据库Schema定义
└── shared/                 # 前后端共享类型
```

**技术栈：**

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 样式 | Tailwind CSS 4 + 自定义CSS变量 |
| 构建工具 | Vite 7 |
| 后端框架 | Express 4 + tRPC 11 |
| 数据库 ORM | Drizzle ORM |
| 数据库 | MySQL 8 / TiDB |
| 实时通信 | WebSocket (ws) |
| AI集成 | Manus Built-in Forge API（LLM + 图像生成） |
| 认证 | Manus OAuth 2.0 |

---

## 2. 环境要求

### 服务器要求

| 项目 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 2核 | 4核 |
| 内存 | 2GB | 4GB |
| 磁盘 | 20GB | 50GB |
| 操作系统 | Ubuntu 20.04+ / CentOS 7+ | Ubuntu 22.04 LTS |
| Node.js | 18.x | 22.x |
| MySQL | 8.0+ | 8.0.x |

### 必要软件

```bash
# 检查 Node.js 版本（需要 >= 18）
node --version

# 检查 pnpm（推荐）
pnpm --version

# 如果没有 pnpm，安装它
npm install -g pnpm

# 检查 MySQL
mysql --version
```

---

## 3. 本地开发环境搭建

### 步骤 1：克隆代码

```bash
git clone <your-repo-url> zeiot-checkin-mobile
cd zeiot-checkin-mobile
```

### 步骤 2：安装依赖

```bash
pnpm install
```

### 步骤 3：配置环境变量

在项目根目录创建 `.env` 文件：

```env
# 数据库连接（MySQL）
DATABASE_URL=mysql://root:password@localhost:3306/zeiot_checkin

# JWT密钥（随机字符串，建议32位以上）
JWT_SECRET=your-super-secret-jwt-key-here-at-least-32-chars

# Manus OAuth配置（从Manus控制台获取）
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# Manus AI API（从Manus控制台获取）
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-server-side-api-key
VITE_FRONTEND_FORGE_API_KEY=your-frontend-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im

# 项目所有者信息（用于管理员权限）
OWNER_OPEN_ID=your-manus-open-id
OWNER_NAME=管理员姓名
```

### 步骤 4：初始化数据库

```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE zeiot_checkin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 生成并执行迁移
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### 步骤 5：插入初始数据

```sql
-- 连接数据库后执行
USE zeiot_checkin;

-- 插入奖项数据
INSERT INTO awards (name, description, icon, category) VALUES
('AI效率革命奖', '在工作中积极探索和应用AI工具，显著提升工作效率的员工', '🤖', 'innovation'),
('年度优秀员工奖', '全年工作表现突出，为公司发展做出重要贡献的员工', '⭐', 'excellence'),
('最佳团队协作奖', '在团队合作中发挥关键作用，促进团队协同的员工', '🤝', 'teamwork'),
('创新突破奖', '在产品或技术上实现重大创新突破的员工', '💡', 'innovation'),
('客户之星奖', '在客户服务和满意度方面表现卓越的员工', '🌟', 'service');

-- 插入抽奖活动
INSERT INTO lottery_events (name, description, rewardAmount, maxWinners, isActive) VALUES
('现金盲盒', '神秘现金奖励，金额随机', 500, 3, 1),
('幸运大奖', '年度最大奖项，惊喜等你', 2000, 1, 1),
('团建基金', '团队活动专项基金', 300, 5, 1);

-- 插入活动配置
INSERT INTO activity_config (configKey, configValue) VALUES
('event_name', '2026 中易物联集团开工盛典'),
('event_date', '2026-03-02'),
('event_location', '公司总部多功能厅'),
('checkin_start_time', '2026-03-01 08:00:00'),
('theme', 'AI智启·同心聚力·焕新出发');
```

### 步骤 6：启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000` 查看手机端，访问 `http://localhost:3000/bigscreen` 查看大屏端。

---

## 4. 生产环境部署

### 方案一：直接部署（推荐）

#### 4.1 构建生产版本

```bash
# 安装依赖
pnpm install --frozen-lockfile

# 构建
pnpm build

# 构建产物在 dist/ 目录
ls dist/
```

#### 4.2 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件
cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'zeiot-checkin',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.cjs

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs zeiot-checkin
```

#### 4.3 Nginx 反向代理配置

```nginx
# /etc/nginx/sites-available/zeiot-checkin
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书（使用 Let's Encrypt 或自签名证书）
    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 静态文件缓存
    location /assets/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # WebSocket 支持（实时互动必须）
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }

    # API 请求
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端路由（SPA）
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/zeiot-checkin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 方案二：Docker 部署

#### 4.4 创建 Dockerfile

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

#### 4.5 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://zeiot:password@db:3306/zeiot_checkin
      - JWT_SECRET=${JWT_SECRET}
      - VITE_APP_ID=${VITE_APP_ID}
      - OAUTH_SERVER_URL=${OAUTH_SERVER_URL}
      - VITE_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}
      - BUILT_IN_FORGE_API_URL=${BUILT_IN_FORGE_API_URL}
      - BUILT_IN_FORGE_API_KEY=${BUILT_IN_FORGE_API_KEY}
      - VITE_FRONTEND_FORGE_API_KEY=${VITE_FRONTEND_FORGE_API_KEY}
      - VITE_FRONTEND_FORGE_API_URL=${VITE_FRONTEND_FORGE_API_URL}
      - OWNER_OPEN_ID=${OWNER_OPEN_ID}
      - OWNER_NAME=${OWNER_NAME}
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: zeiot_checkin
      MYSQL_USER: zeiot
      MYSQL_PASSWORD: password
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10
    restart: unless-stopped

volumes:
  mysql_data:
```

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止
docker-compose down
```

---

## 5. 数据库配置与迁移

### 数据库表结构

| 表名 | 用途 |
|------|------|
| `users` | 用户账户（OAuth登录） |
| `registrations` | 活动报名信息 |
| `checkins` | 签到记录 |
| `wish_cards` | 心愿卡内容 |
| `awards` | 奖项定义 |
| `award_winners` | 获奖记录 |
| `quiz_questions` | AI知识问答题库 |
| `quiz_answers` | 答题记录 |
| `lottery_events` | 抽奖活动 |
| `lottery_results` | 抽奖结果 |
| `activity_config` | 活动配置 |

### 执行迁移

```bash
# 生成迁移文件（修改 schema.ts 后执行）
pnpm drizzle-kit generate

# 查看待执行的迁移
pnpm drizzle-kit status

# 执行迁移
pnpm drizzle-kit migrate

# 或者直接推送（开发环境）
pnpm drizzle-kit push
```

### 数据备份

```bash
# 备份数据库
mysqldump -u root -p zeiot_checkin > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
mysql -u root -p zeiot_checkin < backup_20260302_080000.sql
```

---

## 6. 环境变量说明

| 变量名 | 必填 | 说明 | 示例值 |
|--------|------|------|--------|
| `DATABASE_URL` | ✅ | MySQL连接字符串 | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | ✅ | Session签名密钥（32位以上随机字符串） | `abc123...xyz` |
| `VITE_APP_ID` | ✅ | Manus OAuth应用ID | `app_xxxxx` |
| `OAUTH_SERVER_URL` | ✅ | Manus OAuth后端地址 | `https://api.manus.im` |
| `VITE_OAUTH_PORTAL_URL` | ✅ | Manus登录门户地址 | `https://manus.im` |
| `BUILT_IN_FORGE_API_URL` | ✅ | Manus AI API地址（服务端） | `https://api.manus.im` |
| `BUILT_IN_FORGE_API_KEY` | ✅ | Manus AI API密钥（服务端，保密） | `sk-xxxxx` |
| `VITE_FRONTEND_FORGE_API_KEY` | ✅ | Manus AI API密钥（前端） | `fk-xxxxx` |
| `VITE_FRONTEND_FORGE_API_URL` | ✅ | Manus AI API地址（前端） | `https://api.manus.im` |
| `OWNER_OPEN_ID` | ✅ | 管理员的Manus OpenID | `user_xxxxx` |
| `OWNER_NAME` | ✅ | 管理员姓名 | `张三` |
| `PORT` | ❌ | 服务端口（默认3000） | `3000` |

> **安全提示：** 生产环境中，`BUILT_IN_FORGE_API_KEY` 和 `JWT_SECRET` 必须保密，不得提交到代码仓库。建议使用服务器环境变量或密钥管理服务（如 AWS Secrets Manager、HashiCorp Vault）管理敏感配置。

---

## 7. 功能模块说明

### 手机端页面路由

| 路径 | 页面 | 功能说明 |
|------|------|---------|
| `/` | 首页 | 活动预热倒计时、导航入口 |
| `/register` | 活动报名 | 填写姓名、部门、饮食需求等信息 |
| `/checkin` | AI签到 | 扫码/点击签到，生成AI风格头像 |
| `/schedule` | 活动日程 | 完整活动流程时间表 |
| `/awards` | 荣誉殿堂 | 奖项展示与获奖名单 |
| `/quiz` | AI知识问答 | 20道AI知识题，含详细解析 |
| `/wish` | 心愿卡 | 填写并提交心愿，实时显示在大屏 |
| `/profile` | 个人中心 | 个人签到状态、答题记录 |
| `/bigscreen` | 大屏展示 | 科技感AI大屏（投屏专用） |
| `/admin` | 管理后台 | 签到管理、颁奖词生成、抽奖、分组 |

### 签到时间锁

签到按钮在 **2026年3月1日 08:00:00** 之前显示为倒计时状态，到时间后自动解锁。如需修改时间，编辑 `client/src/pages/Checkin.tsx` 中的：

```typescript
const CHECKIN_OPEN_TIME = new Date("2026-03-01T08:00:00+08:00");
```

### AI功能说明

| 功能 | 实现方式 | 调用位置 |
|------|---------|---------|
| AI头像生成 | Manus Image Generation API | `server/routers.ts` → `checkin.generateAvatar` |
| AI颁奖词生成 | Manus LLM API | `server/routers.ts` → `award.generateSpeech` |
| AI随机分组 | Manus LLM API | `server/routers.ts` → `lottery.generateGroups` |
| AI知识问答 | 静态题库（20题） | 数据库 `quiz_questions` 表 |

---

## 8. 大屏端使用指南

### 投屏设置

1. 在活动现场电脑浏览器中打开：`https://your-domain.com/bigscreen`
2. 使用浏览器全屏模式（F11）或将窗口最大化
3. 推荐分辨率：1920×1080 或更高
4. 推荐浏览器：Chrome 最新版

### 大屏功能区域

大屏分为三个主要展示区域，可通过顶部标签切换：

**实时签到区**：显示签到人员头像网格，新签到时头像动态出现并拼接成公司LOGO形状。

**心愿墙区**：实时滚动展示员工提交的心愿卡内容，带有浮动动画效果。

**分组结果区**：展示管理员通过后台生成的随机分组结果，颜色区分各组。

### 颁奖词弹窗

当管理员在后台生成颁奖词后，大屏会自动弹出全屏颁奖词展示界面，配合颁奖仪式使用。

### 抽奖结果弹窗

管理员触发抽奖后，大屏自动弹出中奖名单，带有动画效果。

---

## 9. 管理员操作指南

### 获取管理员权限

系统通过 `OWNER_OPEN_ID` 环境变量识别管理员。登录后，系统会自动将该用户的角色设置为 `admin`。

如需手动设置管理员，在数据库中执行：

```sql
UPDATE users SET role = 'admin' WHERE openId = 'your-open-id';
```

### 活动当天操作流程

**活动前（3月1日）：**
1. 登录系统，访问 `/admin` 管理后台
2. 在"概览"标签确认报名人数
3. 点击"打开大屏"，在投屏电脑上打开大屏页面

**活动中（3月2日）：**
1. 员工扫码/访问链接进行签到
2. 在"签到"标签实时查看签到人数
3. 颁奖环节：在"颁奖"标签选择奖项和获奖人，点击"AI生成颁奖词"，大屏自动弹出展示
4. 抽奖环节：在"抽奖"标签设置抽取人数，点击"开始抽奖"，大屏自动弹出中奖名单
5. 团建分组：在"抽奖"标签设置分组数量，点击"AI随机分组"，大屏切换到分组结果展示

---

## 10. 常见问题排查

### 问题：WebSocket连接失败，实时互动不工作

**排查步骤：**

```bash
# 检查服务器是否正常运行
pm2 status

# 检查端口是否开放
netstat -tlnp | grep 3000

# 检查 Nginx WebSocket 配置
grep -A 5 "location /ws" /etc/nginx/sites-available/zeiot-checkin

# 查看应用日志
pm2 logs zeiot-checkin --lines 50
```

**常见原因：** Nginx 未配置 WebSocket 升级头，参考第4.3节配置。

### 问题：AI功能（颁奖词/头像生成）不工作

**排查步骤：**

```bash
# 检查环境变量是否正确设置
echo $BUILT_IN_FORGE_API_KEY
echo $BUILT_IN_FORGE_API_URL

# 测试 API 连通性
curl -H "Authorization: Bearer $BUILT_IN_FORGE_API_KEY" $BUILT_IN_FORGE_API_URL/health
```

**常见原因：** API密钥未设置或已过期，需要在Manus控制台重新获取。

### 问题：OAuth登录失败

**排查步骤：**

```bash
# 确认回调URL配置正确
# 在 Manus 控制台中，OAuth应用的回调URL应设置为：
# https://your-domain.com/api/oauth/callback

# 检查 VITE_APP_ID 是否正确
echo $VITE_APP_ID
```

**常见原因：** OAuth回调URL与Manus控制台配置不匹配。

### 问题：数据库连接失败

**排查步骤：**

```bash
# 测试数据库连接
mysql -u your_user -p -h your_host your_database -e "SELECT 1;"

# 检查 DATABASE_URL 格式
# 正确格式：mysql://user:password@host:port/database
echo $DATABASE_URL
```

### 问题：签到按钮一直显示倒计时

**原因：** 当前时间早于 `2026-03-01 08:00:00 CST`，这是正常行为。

**如需测试签到功能，** 临时修改 `client/src/pages/Checkin.tsx` 中的时间为过去时间，重新构建后测试。

### 问题：大屏端在某些浏览器上显示异常

**推荐配置：**
- 浏览器：Chrome 120+ 或 Edge 120+
- 分辨率：1920×1080
- 缩放比例：100%（不要使用浏览器缩放）
- 关闭广告拦截器

---

## 附录：快速命令参考

```bash
# 开发
pnpm dev                    # 启动开发服务器
pnpm test                   # 运行测试
pnpm check                  # TypeScript类型检查

# 数据库
pnpm drizzle-kit generate   # 生成迁移文件
pnpm drizzle-kit migrate    # 执行迁移
pnpm drizzle-kit studio     # 打开数据库可视化界面

# 生产
pnpm build                  # 构建生产版本
pnpm start                  # 启动生产服务器

# PM2
pm2 start ecosystem.config.cjs   # 启动应用
pm2 restart zeiot-checkin        # 重启应用
pm2 stop zeiot-checkin           # 停止应用
pm2 logs zeiot-checkin           # 查看日志
pm2 monit                        # 实时监控
```

---

*如有部署问题，请联系技术支持或查阅项目 README.md 文件。*
