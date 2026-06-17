# 旅游小助手 ✈️

> 一站式多人旅行协作平台：AA 记账 · 在线桌游 · 旅行相册 · 行程共享 · AI 行程生成
> 《大模型驱动的软件开发》课程项目 

---

## 项目简介

**旅游小助手**是一个面向多人旅行场景的 Web 应用，把旅行中分散在 N 个 App 里的协作工具（记账 / 行程 / 相册）和娱乐功能（在线桌游）整合进一个 PWA，开箱即用、扫码即玩。

## 功能一览

### 🛠 协作工具
- **旅游小分队**：邀请码快速组队，成员管理（移除/退出/解散/队长转交）
- **AA 记账**：费用记录（描述/金额/付款人/分摊人/分类）+ 自动最优还款方案 + 标记已还
- **旅行相册**：上传 / Lightbox 浏览 / 按小分队隔离
- **行程共享**：时间线视图 + 6 种类型分类图标

### 🎲 在线桌游
- **🎭 谁是卧底**：36 词对，信息隔离（防前端扒接口偷看），3–12 人
- **🕵️ 行动代号 Codenames**：5×5 词板，红蓝两队，队长/队员角色分工
- **💎 璀璨宝石 Splendor**：3 级发展卡 + 贵族板 + 5 色宝石筹码，完整规则

### 🪄 AI 智能
- **AI 行程生成**：填目的地 / 日期 / 人数 / 偏好 → DeepSeek 大模型生成结构化行程，自动入库
- 服务端白名单清洗，保证写入数据合法

### 📱 PWA
- 可"安装到主屏幕"，像原生 App 一样全屏运行
- Service Worker 离线缓存（HTML/JS/CSS network-first，图片 cache-first）
- 深色 / 亮色主题切换

---

## 技术栈

| 层 | 选型 |
|---|---|
| **后端** | Node.js 20 + Express 4.21 |
| **存储** | JSON 文件（无数据库，按模块拆 `data/*.json`） |
| **鉴权** | Cookie + UUID Session（HttpOnly，30 天） |
| **前端** | 原生 HTML/JS + Tailwind CSS CDN（SPA，无构建） |
| **AI** | DeepSeek（OpenAI 兼容协议），`services/llm.js` 单点封装 |
| **PWA** | manifest.json + Service Worker |
| **部署** | Render（Node 服务） |

---

## 快速开始

### 环境要求
- Node.js ≥ 18
- npm ≥ 9

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/Spriving7/se.git
cd se

# 2. 安装依赖
npm install

# 3. 配置环境变量（可选，不配置只是关闭 AI 行程功能）
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY

# 4. 启动
npm start
# 默认运行在 http://localhost:3000
```

打开浏览器访问 `http://localhost:3000`，输入昵称 + 选择头像即可登录。

### 配置 AI（可选）

`AI 行程生成`功能需要 DeepSeek API Key，在 [.env](.env.example) 中配置：

```bash
DEEPSEEK_API_KEY=sk-your-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1/chat/completions
DEEPSEEK_MODEL=deepseek-chat
```

获取 Key：https://platform.deepseek.com/api_keys

> 不配置也能正常运行，仅 AI 行程生成按钮会返回"AI 服务未配置"。

---

## 项目结构

```
se/
├── server.js              # Express 入口，挂载所有路由
├── config.js              # 端口 / DeepSeek 配置（dotenv）
├── package.json
├── .env.example           # 环境变量模板
│
├── middleware/
│   └── session.js         # requireAuth 中间件（Cookie → Session → req.user）
│
├── data/                  # 数据层（每模块一个 .js + .json 文件）
│   ├── users.js           # 用户 + Session
│   ├── teams.js           # 小分队
│   ├── expenses.js        # 费用 + 结算
│   ├── games.js           # 谁是卧底
│   ├── codenames.js       # 行动代号
│   ├── splendor.js        # 璀璨宝石
│   ├── photos.js          # 相册
│   ├── itinerary.js       # 行程
│   └── *.json             # 对应数据快照
│
├── routes/                # 路由层（薄，只做校验 + 调 data 层）
│   ├── auth.js            # /auth/*
│   ├── teams.js           # /teams/*
│   ├── expenses.js        # /expenses/*
│   ├── games.js           # /games/* (谁是卧底)
│   ├── codenames.js       # /codenames/*
│   ├── splendor.js        # /splendor/*
│   ├── photos.js          # /photos/*
│   ├── itinerary.js       # /itinerary/*
│   └── ai.js              # /ai/itinerary (AI 行程生成)
│
├── services/
│   └── llm.js             # LLM 调用单点封装（OpenAI 兼容协议）
│
├── prompts/
│   └── itinerary.js       # 行程 Prompt 模板 + Schema 约束
│
└── public/                # 前端 SPA
    ├── index.html         # 页面骨架
    ├── app.js             # 路由、状态、fetch、渲染、轮询、SW 注册
    ├── style.css          # Tailwind 增强（毛玻璃 / 渐变 / 卡片 / 暗色）
    ├── manifest.json      # PWA manifest
    ├── sw.js              # Service Worker
    └── icons/             # PWA 图标（192/512 PNG）
```

---

## API 一览

所有 `/teams`、`/expenses`、`/games`、`/codenames`、`/splendor`、`/photos`、`/itinerary`、`/ai` 接口均需登录（Cookie Session）。

| 模块 | 端点 | 说明 |
|---|---|---|
| 鉴权 | `POST /auth/login` | 昵称 + 头像登录（同昵称 = 同账号） |
|  | `GET /auth/me` | 获取当前用户 |
|  | `POST /auth/logout` | 退出 |
| 小分队 | `POST /teams` | 创建（自动生成 6 位邀请码） |
|  | `POST /teams/join` | 通过邀请码加入 |
|  | `GET /teams` / `GET /teams/:id` | 列表 / 详情 |
|  | `POST /teams/:id/remove-member` | 队长移除成员 |
|  | `POST /teams/:id/leave` | 退出 |
|  | `POST /teams/:id/disband` | 队长解散 |
| AA 记账 | `GET /expenses/:teamId` | 费用 + 结算列表 |
|  | `POST /expenses/:teamId` | 添加费用 |
|  | `PUT /expenses/:teamId/:expenseId` | 编辑 |
|  | `DELETE /expenses/:teamId/:expenseId` | 删除 |
|  | `GET /expenses/:teamId/settlement` | **贪心算法最优还款方案** |
|  | `POST /expenses/:teamId/settle` | 标记一笔已还 |
|  | `DELETE /expenses/:teamId/settle/:id` | 撤销已还 |
| 桌游 | `POST /games` / `POST /codenames` / `POST /splendor` | 创建房间 |
|  | `POST /games/:id/join` | 加入 |
|  | `POST /games/:id/start` / `submit-description` / `submit-vote` | 谁是卧底流程 |
| 相册 | `GET /photos/:teamId` / `POST /photos` / `DELETE /photos/:id` | 增删查 |
| 行程 | `GET /itinerary/:teamId` / `POST /itinerary` / `PUT /itinerary/:id` / `DELETE /itinerary/:id` |
| AI | `POST /ai/itinerary` | **AI 生成行程**（目的地 + 日期 + 人数 + 偏好） |

---

## 核心实现亮点

### 1. AA 最优还款算法

`routes/expenses.js` 的 `computeSettlement()` 实现两步贪心：

1. **算净余额**：付款人 +，分摊人 −，得到每人 `balances[uid]`
2. **双指针贪心匹配**：creditors 和 debtors 各按金额降序，每次让最大债务方还钱给最大债权方 → **转账笔数 ≤ N−1**，理论最优

分摊额 `computeSplits()` 用"先取整后补差"策略，规避浮点误差。

### 2. 谁是卧底的信息隔离

`data/games.js` 的 `getGameView()` 在返回给客户端时：
- 删除 `spyId` 和 `wordPair`
- 只给当前玩家**自己的词** `myWord`
- 投票阶段只返回已投票人数，不暴露具体投了谁

杜绝前端扒接口偷看。

### 3. AI 行程生成的工程化

`routes/ai.js` + `prompts/itinerary.js` + `services/llm.js` 三层协作：

- Prompt 用枚举 + 长度 + 格式正则做**硬性约束**
- LLM 输出用 `parseJsonLoose()` 容错（处理 ```json``` 包裹和首尾噪声），解析失败重试一次
- **服务端二次过滤**：即使 LLM 返回越界日期或非法枚举，写入数据库前会按 `ALLOWED_TYPES` 白名单清洗

### 4. PWA 缓存策略

`public/sw.js` 采用：
- **HTML/JS/CSS → Network-first**（`cache: 'no-store'`，离线才回退缓存）：保证用户拿到最新代码
- **图片/图标 → Cache-first**：节省流量
- 缓存版本号 `travel-v5`，激活时清旧版本

---

## 部署

### Render（推荐）

1. Fork 本仓库到自己的 GitHub
2. 在 [Render](https://render.com) 新建 Web Service，连接仓库
3. 配置：
   - Build Command: `npm install`
   - Start Command: `npm start`
   - 环境变量：`DEEPSEEK_API_KEY`（可选）
4. 部署完成

### 其他平台

任何能跑 Node.js 的平台都可以（Railway / Fly.io / Vercel Function 等）。本项目无数据库依赖，零额外配置。

---

## 安装为手机 App（PWA）

### Android Chrome
1. 打开网页 → 浏览器菜单 → **"添加到主屏幕"**
2. 桌面出现图标，点击全屏启动

### iOS Safari
1. 打开网页 → 分享按钮 → **"添加到主屏幕"**

### 桌面 Chrome / Edge
- 地址栏右侧会出现安装图标，点击即可

---

## 开发说明

### 数据持久化
- 所有数据落在 `data/*.json`，可直接查看 / 备份 / 编辑
- 上传的图片落在 `data/photos/<id>.jpg`
- Session 是内存存储，**服务重启会丢失登录态**（30 天 Cookie 仍在但 session token 失效）

### 实时性
桌游房间目前前端 `setInterval` 轮询 `/games/:id`（2 秒一次）。如需低延迟，可升级为 SSE / WebSocket。

### 切换 LLM

`services/llm.js` 用 OpenAI 兼容协议，可无缝切换：
- **DeepSeek**：`https://api.deepseek.com/v1/chat/completions` + `deepseek-chat`
- **智谱 GLM**：`https://open.bigmodel.cn/api/paas/v4/chat/completions` + `glm-4-flash`
- **OpenAI**：`https://api.openai.com/v1/chat/completions` + `gpt-4o-mini`

只需改 `.env` 三个变量即可。