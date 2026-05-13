# mini-home 项目协作说明

## 项目概况

- 项目名称：`mini-home`
- 当前目标：实现一个“双人共享线上小家”的网页初版。
- 当前阶段：已切入 React + react-konva 原型，并补上本地留言/长信持久化、布局编辑、页面内校验与自动场景冒烟验证。

## 当前目录结构

```text
mini-home/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── vite.config.js
├── index.html
├── scripts/
├── src/
├── AI工作记录/
│   └── records/
│       └── 2026/05/
├── assets/
│   ├── avatars/
│   ├── backgrounds/
│   ├── furniture/
│   ├── props/
│   ├── states/
│   └── scene-manifest-v1.json
└── docs/
    ├── 首版美术素材清单与要求.md
    ├── 首版场景验证方案.md
    ├── 首版前端架构说明.md
    └── 项目现状.md
```

## 目录职责说明

### `AI工作记录/`

- 存放当前项目的 AI 工作记录。
- 每个线程默认维护一条摘要记录。
- 不要把其他项目的记录放进这个目录。

### `assets/`

- 存放项目运行时使用的图片资产和场景清单。
- 当前子目录分工如下：
  - `assets/backgrounds/`：房间背景。
  - `assets/furniture/`：沙发、电视、单杠、茶几、信件板等核心家具。
  - `assets/props/`：零食、水杯等小道具。
  - `assets/states/`：电视开关屏、信件开合等状态资源。
  - `assets/avatars/`：角色默认态、看电视态、引体态、读信态等角色资源。
  - `assets/scene-manifest-v1.json`：首版场景资产清单，供程序挂载资源时使用。

### `docs/`

- 存放项目说明文档、素材说明、后续设计和实现文档。
- 当前已有文档：
  - `docs/首版美术素材清单与要求.md`
  - `docs/首版场景验证方案.md`
  - `docs/首版前端架构说明.md`
  - `docs/项目现状.md`

### `package.json` / `package-lock.json`

- 管理当前前端原型依赖。
- 当前关键依赖包括 `react`、`vite`、`konva`、`react-konva`。

### `vite.config.js`

- 当前前端开发与构建配置入口。
- 负责在构建后把根目录 `assets/` 同步复制到 `dist/assets/`，保证预览和部署环境也能读取场景资源。

### `src/`

- 当前 React 场景原型代码目录。
- 当前约定：
  - `src/main.jsx`：React 入口。
  - `src/App.jsx`：页面状态编排和首版客厅主入口。
  - `src/styles.css`：React 原型样式。
  - `src/components/`：场景舞台、信件浮层、右侧面板等页面组件。
  - `src/hooks/`：资源加载、本地持久化等复用 hook。
  - `src/scene/`：场景尺寸计算、拖拽落点和页面内校验逻辑。
  - `src/homeData.js`：本地可用版数据模型、默认数据和本地存储辅助函数。
  - `src/noteCopy.js`：首版互动说明文案。

### `scripts/`

- 存放仓库内的辅助验证脚本。
- 当前约定：
  - `scripts/verify-scene.mjs`：自动启动本地预览并跑首版客厅场景冒烟校验。

### `index.html`

- 当前 Vite 页面入口。
- 挂载 React 根节点。

### `README.md`

- 用于项目的对外或总体说明。
- 如果后续项目启动方式、技术方案、运行方式明确，应同步更新这里。

## 协作规则

### 目录结构变更同步规则

- 任何新增、删除、重命名一级目录或 `assets/` 下的二级目录时，必须同步更新本文件中的“当前目录结构”和“目录职责说明”。
- 如果目录变更会影响素材生产、资源引用或开发流程，必须同步更新相关文档。
- 当前至少需要检查是否同步更新：
  - `AGENTS.md`
  - `docs/首版美术素材清单与要求.md`
  - `assets/scene-manifest-v1.json`
  - `README.md`（当变更影响项目使用方式时）

### 资产管理规则

- 新生成的项目可用图片资产必须保存到项目目录内，不要只留在外部生成目录。
- 资源命名保持稳定、可读、可版本化，默认使用 `*-v1`、`*-v2` 这类命名。
- 同类资源放入对应子目录，不要混放。
- 新增可运行时使用的素材后，如需要被场景直接引用，应同步更新 `assets/scene-manifest-v1.json`。

### 文档维护规则

- 当项目阶段变化明显时，更新 `AGENTS.md` 中的“项目概况”。
- 当素材规范、交付要求、目录职责发生变化时，同步更新 `docs/首版美术素材清单与要求.md`。
- 当新增新的核心实现文档时，放入 `docs/`，并在本文件中补充说明。

### Git 规则

- Git 命令串行执行。
- 提交前先看 `git status`。
- 完成修改后更新 Git 状态，使用中文提交信息提交，并推送到远端。

## 当前开发基线

- 当前首版关键素材已经落入 `assets/`。
- 当前可直接作为首版场景输入的资源清单在：
  - `assets/scene-manifest-v1.json`
- 当前首版 React 原型入口在：
  - `index.html`
  - `src/main.jsx`
  - `src/App.jsx`
  - `src/styles.css`
- 当前首版 React 原型拆分结构还包括：
  - `src/components/`
  - `src/hooks/`
  - `src/scene/`
  - `src/homeData.js`
  - `src/noteCopy.js`
- 当前统一场景冒烟验证入口在：
  - `npm run verify:scene`
- 当前本地可用能力包括：
  - 电视 / 单杠短便签
  - 信件板长信编辑与历史列表
  - 点击物件查看对应留言
  - 家具与人物布局编辑
  - 本地持久化保存
  - 道具位置跨刷新保留
- 当前首版美术要求文档在：
  - `docs/首版美术素材清单与要求.md`
