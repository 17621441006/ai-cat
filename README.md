# AI 进阶研习所 · AI 小脏

面向 AI 学习与供应链业务实践的交互式网站。这个仓库保存当前完整项目源码，以及页面使用的图片、猫咪动画、视频和下载课件。

## 项目内容

- **AI 小脏研习助手**：中文问答、站内知识检索、页面跳转、Markdown 表格、ECharts 交互图表、本地与云端模型。
- **互动课堂**：提示词工程、上下文工程、AI 项目管理、Dify、检索与分支、部署、评测与产品设计。
- **AI 办公工具体验**：写作、表格、演示、图片、视频与搜索的引导式练习。
- **智能体工坊**：可视化流程、多智能体、Skills、插件、MCP 与 ERP / MES / TMS 的模拟连接及综合练习。
- **供应链实践与 3D 实验**：业务对象关系、工厂与物流场景、交互图表和产品演示。
- **学习工作台**：多页面标签、学习进度与讨论功能。

其中教学 DEMO 和模拟数据按页面说明使用；涉及真实模型、数据库或外部系统的能力需要相应运行环境。

## 本地启动

需要 **Node.js 22.13.0 或更高版本**，以及 **pnpm 11.25.0**。依赖版本由 `pnpm-lock.yaml` 固定。

```sh
git clone https://github.com/17621441006/ai-cat.git
cd ai-cat
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm dev
```

打开命令行显示的地址，默认是 `http://localhost:5173`。干净的 GitHub 克隆会自动使用 portable 运行模式。

```sh
# TypeScript 检查
pnpm exec tsc --noEmit

# 生成 Cloudflare Worker 构建产物
pnpm build

# 在本机预览构建产物
pnpm start
```

## AI 模型与数据库

- 云端问答需要服务端环境变量 `OPENROUTER_API_KEY`；`.env.example` 只列出变量名，没有密钥。使用 Cloudflare 本地运行时可将值配置到未提交的 `.dev.vars`，生产环境使用托管平台的 Secret 设置。
- 浏览器本地模型需要支持 WebGPU 的环境，首次使用需要下载模型文件。模型权重不属于本仓库的静态素材。
- 讨论与部分进度功能使用 Cloudflare D1，绑定名为 `DB`；表结构和迁移文件已包含在 `db/`、`drizzle/`。
- 首次使用本地数据库时，先执行 `pnpm build`，再按顺序应用迁移：

```sh
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tricky_firedrake.sql
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_great_wong.sql
```

原站的登录身份由 Sites 托管平台提供。独立部署时需要配置自己的身份认证和数据库。仓库不包含线上数据库记录、用户对话记录或运行时密钥。

## 目录

| 目录 / 文件 | 内容 |
| --- | --- |
| `app/` | 页面、API 路由与样式 |
| `components/` | 助手、课堂、工作坊和 3D 等界面组件 |
| `lib/` | 业务逻辑、图表解析、站内导航及教学数据 |
| `public/` | 完整图片、动画、视频、PDF / Word 课件 |
| `db/`、`drizzle/` | 数据库模型与 SQL 迁移 |
| `tests/` | 现有功能测试 |
| `scripts/`、`build/` | 安装、开发、构建与运行支持 |
| `docs/` | 可视化方案与原始框架说明 |
| `.openai/hosting.json` | 原 Sites 项目标识及数据库绑定声明，无凭据 |

## 技术栈

React · TypeScript · Vinext / Vite · Cloudflare Workers / D1 · ECharts · Three.js · React Flow · WebLLM · Drizzle。

## 版本来源

- 导出日期：2026-10-05
- 对应已保存的 Sites 第 **34** 版
- 原项目源码提交：`75f29f5189f82c2ed2984e2f5ea196a67e1d134d`
- 原站地址：<https://ai-cat.jackchen911006.chatgpt.site>（访问权限由原站单独管理）

该仓库为当前版本完整快照。生成缓存、依赖安装目录和运行时秘密不入库；依赖可通过锁文件重新安装。除本说明、保留的框架说明及忽略规则外，应用源码和素材保持原版本内容。

第三方依赖与素材保留各自的授权和署名信息；公开仓库本身不等同于为全部内容授予新的使用许可。

2026-10-06：完整研习所保留，仅压缩六张大图，详见 [图片优化记录](docs/V36-IMAGES.md)。
