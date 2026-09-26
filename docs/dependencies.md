# 依赖引用关系树（package.json）

> 基于对 `src/`、`scripts/`、`tests/`、`astro.config.mjs`、`svelte.config.js`、`tsconfig.json` 的全量 import 扫描。
>
> **清理历程**
> - 2026-08-29 第一次清理：移除 6 个未使用依赖，8 个构建期依赖移入 devDependencies（69 → 63）。
> - 2026-08-29 第二次清理：**删除自定义 Markdown 解析链路（改用 Astro 默认解析）**、**删除自定义字体系统（改用系统默认字体）**（63 → 42）。
> - 2026-08-29 修复 Astro 7 弃用警告：改用 `unified({...})` 传入插件，`@astrojs/markdown-remark` 重新成为直接依赖（42 → 43）。
> - 2026-08-29 第三次清理：移除测试/lint/lighthouse 工具链（@playwright/test、@axe-core/playwright、@biomejs/biome、@lhci/cli、@astrojs/ts-plugin、@types/{hast,markdown-it,qrcode,sanitize-html}）（43 → 34）。
> - 2026-08-29 第四次清理：**移除 @astrojs/mdx**（全站纯 .md；`content.config.ts` glob、`feed.ts` 的 MDX 预清洗分支同步删除）+ **删除 34 个死组件、孤儿样式与遗留资源（36 文件）**、新增 404 页（详见 `architecture.md` §9）（34 → 33）。
> - 2026-08-29 第五次清理：**移除 Expressive Code 全家桶**（astro-expressive-code + @expressive-code/core + 两个官方插件，改用 Astro 内置 Shiki 双主题）与 **markdown-it + sanitize-html（RSS 改纯文本）+ qrcode（分享海报二维码改为 URL 文本）**，共删 7 个依赖（33 → 26）。
> - 2026-08-29 第六次清理：**移除 @fancyapps/ui**，以原生 TS 灯箱（`utils/lightbox.ts`，约 12KB chunk，替代全量 Fancybox 约 100KB+ JS + 32KB CSS）承接图片查看（详见 `architecture.md` §9.2）（26 → 25）。

## 概览

- **当前：生产依赖 17 个，开发依赖 8 个，共 25 个。**
- Markdown：Astro 默认管线（GFM + 内置 Shiki 代码块双主题，经 `markdown.shikiConfig` 配置）。Astro 7 不再支持 `markdown.remarkPlugins` 配置项，插件经 `src/utils/markdown-processor.mjs` 的 `unified({...})`（来自 `@astrojs/markdown-remark`）传入 `markdown.processor`，仅挂载 `remark-reading-time`（字数/阅读时长）标准插件。
- 字体：纯系统字体栈，CSS 变量在 `src/styles/font-faces.css` 中静态定义。
- 已移除的 Markdown 能力：`:::` 容器（admonitions/steps/collapse-panels/option-groups/file-tree/code-tree）、数学公式（KaTeX）、Mermaid、GitHub 卡片、缩写、标注、剧透、标记、图片网格、include 引入、语法清单（manifest）与按需 CSS 注入。

---

## 1. 引用关系树（按功能域）

### 1.1 框架核心

| 依赖 | 引用方 | 说明 |
|---|---|---|
| `astro` | `astro.config.mjs`、`tsconfig.json`、`src/content.config.ts`、`src/env.d.ts`、组件与页面（`astro:assets`/`astro:content`） | 框架本体 |
| `svelte` + `@astrojs/svelte` | `astro.config.mjs`、`svelte.config.js`、Svelte 组件 | Svelte 5 |
| `@astrojs/rss` | `src/pages/rss.xml.ts` | RSS 输出 |
| `@astrojs/sitemap` | `astro.config.mjs` | 站点地图 |
| `@astrojs/check` *(dev)* | `astro check`（`pnpm check`）的运行引擎 | 类型检查必需 |
| `typescript` *(dev)* | 无直接 import；`astro check` 与 `pnpm type-check` 必需 | ⚠️ 代码中的 `"typescript"` 字符串是语言名映射，非包引用 |

### 1.2 样式系统

| 依赖 | 引用方 | 说明 |
|---|---|---|
| `tailwindcss` | `src/styles/main.css`、`markdown.css`、`transition.css` | 样式主轨 |
| `@tailwindcss/vite` | `astro.config.mjs` | Tailwind v4 接入 |
| `@tailwindcss/typography` | `src/styles/main.css` | 文章排版 |

### 1.3 Markdown / 代码渲染

| 依赖 | 引用方 | 说明 |
|---|---|---|
| `@astrojs/markdown-remark` | `src/utils/markdown-processor.mjs`（`unified({...})` 工厂，挂载下方插件后交给 `markdown.processor`） | Astro 默认管线的引擎（与 astro 版本强耦合） |
| `astro-icon` | `.astro` 组件 + `astro.config.mjs` | 静态图标 |
| `mdast-util-to-string` + `reading-time` | `src/plugins/remark-reading-time.mjs` | 字数/时长（经 unified processor 挂载） |
| `@swup/astro` | `astro.config.mjs` | 页面转场（scroll-plugin 为其自身依赖） |

### 1.4 客户端交互库

| 依赖 | 引用方 | 说明 |
|---|---|---|
| `@material/material-color-utilities` | `src/utils/mc-utils.ts` | M3 动态色板 |
| `@iconify/svelte` | 48 个 Svelte 组件 import 被 alias 到本地 `Icon.svelte`；真实使用 node_modules 内的 `OfflineIcon.svelte` + `offline-functions.js` | 图标运行时 |
| `sharp` | 无直接 import；`astro:assets` 默认图像服务 | 构建时图像处理 |

### 1.5 图标数据（构建时内联，运行时零依赖）

```
src 内的 icon 名 + @iconify-json/*/icons.json
  └─ scripts/icons/generate-local-icons.mjs → src/generated/local-icon-collections.ts
```

全部 5 个 `@iconify-json/*` 包均在 devDependencies。

### 1.6 搜索 / 工具链（dev）

`pagefind`（build 脚本索引）、`@astrojs/check` + `typescript`（`astro check` / `tsc`）。

已于 2026-08-29 移除的工具链：`@playwright/test` + `tests/site/`（站点测试）、`@axe-core/playwright`（a11y 测试）、`@biomejs/biome` + `biome.json`（lint/format，`format`/`lint` 脚本一并删除）、`@lhci/cli` + `lighthouserc.cjs` + `scripts/lighthouse/`、`scripts/perf/`、`@astrojs/ts-plugin`（tsconfig 已去引用）。`markdown-it`/`sanitize-html`/`qrcode` 与 `src/types/vendor.d.ts`（其 any 类型兜底文件）已于第五次清理随依赖一并移除；`@types/hast` 的消费方（EC 插件）随 EC 删除。

---

## 2. 字体现状（自定义系统已删除）

- 已删除：`src/config/fontConfig.ts`、`src/types/fontConfig.ts`、`src/utils/font-options.ts`、`scripts/fonts/**`、`src/assets/fonts/**`（Yozai TTF）、`@fontsource/*` 与 `subset-font` 包、`fonts:check`/`fonts:subset` 脚本。
- `src/styles/font-faces.css` 静态定义 `--font-body`、`--font-cjk`、`--m3e-font-sans`、`--font-sans`、`--m3e-font-mono-family`、`--font-mono` 为系统字体栈，`main.css` 的 Tailwind `@theme` 与全部组件继续经这些变量消费，无需改动。
- Layout.astro 不再使用 `<Font>` 组件与 `createFontRoleStyle`。

## 3. Markdown 运行时现状（第五次清理后）

- Expressive Code 已整体移除：代码块由 Astro 内置 Shiki 渲染（`astro.config.mjs` 的 `markdown.shikiConfig`，github-light/github-dark 双主题，暗色经 `styles/markdown/astro-code.css` 的 `--shiki-dark` 变量切换，背景用站点令牌 `--codeblock-bg`）。
- `markdown-runtime.ts`/`code-collapse.ts`/`code-copy.ts`（代码块折叠与复制运行时）已删除；`Markdown.astro` 为纯 SSR，`post-decryption.ts` 仅保留灯箱/TOC 重建/锚点滚动。
- 代码块折叠、复制按钮、语言徽标、行号功能随 EC 移除。
- RSS/Atom 正文改为纯文本（`feed.ts` 的 `markdownToPlainText`），`markdown-it`/`sanitize-html` 已删除；分享海报二维码由 `qrcode` 生成改为海报内嵌文章 URL 文本。
- 标题锚点 ID 由 Astro 默认管线生成，TOC（`toc-utils.ts`）不受影响。

## 4. 后续可继续简化的方向

1. **Stylus → 现代 CSS（已完成）**：全部 67 个组件的 `<style lang="stylus">` 已迁移为原生嵌套 CSS；设计令牌层为 `styles/variables.css`（明值 :root / 暗色差异 :root.dark），BEM 连接选择器按编译语义扁平化，stylus mixin/模板函数在调用点内联，断点常量内联为字面像素。
2. **图标三层间接**：`@iconify/svelte` 经 alias → 本地 `Icon.svelte` → node_modules 内部文件，升级易碎；可收敛为单一图标方案。


## 5. 已知遗留（非本次引入）

- `astro-icon` 启动警告 `Failed to load icons from "src/icons"` 为存量现象（本地图标走 `src/generated`，不使用 `src/icons` 目录）。
- `tests/feature-data.test.mjs`（node:test，无外部依赖）保留，可经 `node --test tests/feature-data.test.mjs` 手动运行；站点级 Playwright 用例已随工具链整体移除。
