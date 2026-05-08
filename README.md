# mini-home

首版目标是做一个“双人共享线上小家”的网页小客厅。当前仓库已经包含首版场景素材、场景清单，以及一版基于 React + react-konva 的最小场景原型。

## 当前文件

- `index.html`：Vite 页面入口。
- `src/main.jsx`：React 入口。
- `src/App.jsx`：react-konva 场景原型。
- `src/styles.css`：原型样式。
- `scripts/verify-scene.mjs`：自动场景冒烟校验脚本。
- `assets/scene-manifest-v1.json`：首版场景资源清单和初始布局数据。

构建后会自动把根目录 `assets/` 复制到 `dist/assets/`，保证预览态也能加载运行时场景资源。

## 运行方式

先安装依赖：

在项目目录执行：

```powershell
npm install
```

开发模式运行：

```powershell
npm run dev
```

构建验证：

```powershell
npm run build
```

自动场景冒烟验证：

```powershell
npm run verify:scene
```

## 当前已实现

- 基于 `react-konva` 的客厅场景渲染
- 背景、家具、道具、角色状态图加载
- 电视互动与开关屏切换
- 单杠互动与引体两帧循环
- 信件板互动与信件展开层
- 零食和水杯的轻网格吸附拖拽
- 页面内置场景校验卡片与调试模式

## 场景验证

- 页面右侧已经内置“场景校验”卡片，会自动检查关键物件可见性和布局关系。
- 点击“显示校验”可以进入调试模式，显示网格、边框和资源 `id`。
- `npm run verify:scene` 会自动启动预览、检查校验卡片，并回归电视 / 信件板 / 单杠 / 道具拖拽这几条主链路。
- 详细规则见：
  - `docs/首版场景验证方案.md`
