# mini-home

`mini-home` 的目标是做一个“双人共享线上小家”的网页原型。当前仓库已经落了一版首屏客厅，并推进到单设备本地可用：可以渲染场景、切换电视 / 单杠 / 信件板互动、保存短便签与长信，并支持桌面小物拖拽和基础布局校验。

## 快速开始

在项目目录执行：

```powershell
cd D:\workspace\mini-home
npm install
npm run dev
```

启动后打开终端输出的本地地址，通常是 [http://localhost:5173](http://localhost:5173)。

常用命令：

```powershell
npm run dev
npm run build
npm run preview
npm run verify:scene
```

- `npm run dev`：开发模式。
- `npm run build`：构建产物到 `dist/`。
- `npm run preview`：本地预览构建结果。
- `npm run verify:scene`：构建并自动回归首版场景主链路。

构建后会自动把根目录 `assets/` 复制到 `dist/assets/`，保证预览态和部署态也能读取场景资源。

## 架构概览

当前实现不是游戏引擎项目，而是一个 `React + react-konva + manifest` 驱动的前端原型。

- `React` 负责页面结构、侧边说明、信件浮层、状态切换和调试开关。
- `react-konva` 负责客厅场景画布，把背景、家具、道具、角色渲染到同一张 Stage 上。
- `assets/scene-manifest-v1.json` 负责描述场景输入，包括画布尺寸、物件坐标、层级、交互类型、拖拽区域和角色状态图。
- `src/homeData.js` 和本地持久化 hook 负责保存便签、长信和道具位置。
- `assets/` 目录负责提供运行时图片资源。
- `scripts/verify-scene.mjs` 负责自动冒烟验证，会实际打开预览页面并回归核心互动。

一句话理解当前运行方式：

`App.jsx` 先读取 manifest，再加载图片资源，然后按层级把场景对象挂到 Konva Stage 上，最后用 React state 驱动电视、信件板、单杠和拖拽状态变化。

更完整的工程说明见：

- [首版前端架构说明.md](/D:/workspace/mini-home/docs/首版前端架构说明.md)
- [项目现状.md](/D:/workspace/mini-home/docs/项目现状.md)

## 目录结构

```text
mini-home/
├── assets/
├── docs/
├── scripts/
├── src/
├── AI工作记录/
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── AGENTS.md
```

主要目录职责：

- `src/`：前端实现代码，当前已拆成页面入口、组件、hook 和场景逻辑模块。
- `assets/`：运行时图片资源和 `scene-manifest-v1.json`。
- `scripts/`：自动验证脚本。
- `docs/`：架构、验证、美术规范等文档。
- `docs/项目现状.md`：当前阶段、已验证内容、已知问题和接手建议。
- `AI工作记录/`：项目内 AI 工作摘要记录。

当前关键文件：

- [src/main.jsx](/D:/workspace/mini-home/src/main.jsx)：React 入口。
- [src/App.jsx](/D:/workspace/mini-home/src/App.jsx)：页面状态编排和首版客厅主入口。
- [src/styles.css](/D:/workspace/mini-home/src/styles.css)：页面和场景样式。
- [src/components/SceneStage.jsx](/D:/workspace/mini-home/src/components/SceneStage.jsx)：Konva 场景舞台组合组件。
- [src/components/SidePanel.jsx](/D:/workspace/mini-home/src/components/SidePanel.jsx)：右侧互动说明、控制区和校验区。
- [src/hooks/useAssetImages.js](/D:/workspace/mini-home/src/hooks/useAssetImages.js)：运行时图片资源预加载。
- [src/hooks/usePersistentHomeData.js](/D:/workspace/mini-home/src/hooks/usePersistentHomeData.js)：本地可用版数据持久化。
- [src/homeData.js](/D:/workspace/mini-home/src/homeData.js)：默认数据、短便签/长信模型和本地存储辅助逻辑。
- [src/scene/validation.js](/D:/workspace/mini-home/src/scene/validation.js)：页面内场景校验逻辑。
- [assets/scene-manifest-v1.json](/D:/workspace/mini-home/assets/scene-manifest-v1.json)：场景布局和资源挂载清单。
- [scripts/verify-scene.mjs](/D:/workspace/mini-home/scripts/verify-scene.mjs)：自动场景冒烟验证。

## 当前已实现

- 基于 `react-konva` 的客厅场景渲染
- 背景、家具、道具、角色状态图加载
- 电视互动与开关屏切换
- 单杠互动与引体两帧循环
- 信件板互动与信件展开层
- 电视 / 单杠短便签编辑与删除
- 信件板长信编辑、切换和删除
- 本地持久化保存便签、长信和道具位置
- 零食和水杯的轻网格吸附拖拽
- 页面内置场景校验卡片与调试模式
- `npm run verify:scene` 自动回归默认场景、电视、信件板、单杠、道具拖拽，以及内容保存/刷新恢复

## 当前限制

- 当前还是前端原型，虽然已经具备本地持久化，但尚未接入账号、云端同步和持久化后端。
- 场景布局目前完全由 `scene-manifest-v1.json` 驱动，暂时没有可视化编辑器。
- AI 生成图片仍有透明留白偏大的问题，布局校验能防回归，但不能完全替代人工构图判断。

## 场景验证

- 页面右侧内置“场景校验”卡片，会自动检查关键物件可见性和布局关系。
- 点击“显示校验”可以进入调试模式，显示网格、边框和资源 `id`。
- `npm run verify:scene` 会自动启动预览、检查校验卡片，并回归电视 / 信件板 / 单杠 / 道具拖拽主链路，以及便签/长信保存与刷新恢复。

详细规则见：

- [首版场景验证方案.md](/D:/workspace/mini-home/docs/首版场景验证方案.md)
- [首版前端架构说明.md](/D:/workspace/mini-home/docs/首版前端架构说明.md)
- [项目现状.md](/D:/workspace/mini-home/docs/项目现状.md)
