# Shirone 项目全景架构文档

> 基于 2026-08-29 对全仓库（`src/` 286 个文件、`scripts/`、`tests/`、根配置）的逐文件阅读与全量 import 扫描（843 条 import 边）编写。
> 2026-08-30 增量修订：移除 Stylus 双轨表述（f6ffe155 已全量迁移原生嵌套 CSS）、修正已删除文件的历史引用（scrollbar.css / disclosures.css / breakpoints.styl / generic.styl / PasswordGate / Expressive Code / KaTeX）、i18n 186 → 169 key、删除 layout-mode-change 死事件链路，详见 §9 第 15 条。
> 配套专题文档：[dependencies.md](./dependencies.md)（外部依赖引用树与清理历程）、[scripts.md](./scripts.md)（构建脚本逐行解析）、[frontmatter.md](./frontmatter.md)（文章 frontmatter 用法与消费链路）。
> 本文回答四个问题：**每个文件是干什么的；每个文件的数据从哪来（生产者）；被谁消费；系统如何整体运转。**

---

## 目录

1. [项目概览](#1-项目概览)
2. [根目录与工程配置](#2-根目录与工程配置)
3. [总体分层架构](#3-总体分层架构)
4. [站点路由全景](#4-站点路由全景)
5. [src/ 逐目录详解](#5-src-逐目录详解)
6. [全链路关系（生产消费关系）](#6-全链路关系生产消费关系)
7. [构建脚本与测试](#7-构建脚本与测试)
8. [外部依赖映射](#8-外部依赖映射)
9. [死代码与遗留问题清单](#9-死代码与遗留问题清单)
10. [维护守则（新文件落位规则）](#10-维护守则新文件落位规则)

---

## 1. 项目概览

### 1.1 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Astro 7.2.6（SSG 全静态）+ Svelte 5（交互岛，Runes）+ TypeScript（strict） |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`）+ 原生嵌套 CSS（Stylus 已于 f6ffe155 全量移除，见 §5.8）+ Material 3 Expressive 设计体系 |
| 设计系统 | 自建 M3E 组件库（`src/components/atoms`，从 Compose Material3 / M3E 官方 Kotlin 实现移植，token 对齐 v0.192）+ `@material/material-color-utilities` 动态取色（HCT） |
| Markdown | Astro 默认管线（GFM）+ 内置 Shiki 代码块（github-light/github-dark 双主题）；自定义 remark 插件仅 1 个（阅读时长）。MDX 已于 2026-08-29 移除（全站纯 .md） |
| 页面转场 | Swup（`@swup/astro`，持久壳 + `main`/`#toc` 容器替换） |
| 搜索 | Pagefind（构建后索引 `dist/`） |
| 包管理 | pnpm（`preinstall` 强制 `only-allow pnpm`；`pnpm-workspace.yaml` 仅用于 `allowBuilds` 构建脚本审批，**不是** monorepo） |

### 1.2 工程命令（package.json scripts）

| 命令 | 实际执行 |
|---|---|
| `dev` / `start` | `scripts/icons/generate-local-icons.mjs` → `astro dev` |
| `build` | 图标生成 → `astro build` → `npx pagefind --site dist` |
| `preview` | `astro preview` |
| `check` | `astro check`（引擎为 devDep `@astrojs/check` + `typescript`） |
| `type-check` | `tsc --noEmit`（未启用 `--isolatedDeclarations`：`content.config.ts` 的推断类型不可发射且不可注解，见 `src/content.config.ts` 头注） |
| `icons:generate` | 单独重跑图标生成 |
| `anime:sync` | `scripts/anime/sync.mjs`（拉取 Bangumi/Bilibili 追番数据落快照） |
| `preinstall` | `npx only-allow pnpm` |

### 1.3 规模统计

| 目录 | 文件数 | 说明 |
|---|---|---|
| `src/components/atoms` | 33 | action 5 / blog 10 / display 7 / feedback 3 / input 1 / navigation 1 / overlay 3 / selection 3（2026-08-29 清理后仅保留有真实消费链的组件） |
| `src/components/molecules` | 25 | 页面级积木 |
| `src/components/organisms` | 23 | 页面区块与结构组件 |
| `src/components/content` + `system` | 2 | Markdown 容器 + 配置载体 |
| `src/pages` | 19 | 路由页面与静态端点（含 404） |
| `src/layouts` | 2 | Layout / MainGridLayout |
| `src/config` | 17 | 站点配置（含 1 个 HTML 片段） |
| `src/types` | 14 | 配置契约类型 |
| `src/constants` | 2 | 运行时常量 |
| `src/utils` | 36 | 34 顶层 + `anime/` 子目录 2 个 |
| `src/i18n` | 4 | key 枚举 + 机制 + 中/英 2 语言（169 key） |
| `src/data` | 7 | 5 个数据模块 + anime 快照 2 个 |
| `src/styles` | 12 | 全局样式（11 css + markdown/ 1 个） |
| `src/plugins` | 1 | remark 插件（阅读时长） |
| `src/content` | 5 | 4 篇 posts + 1 篇 spec |
| `src/assets` / `generated` | 8 | 图片 7 + 生成图标集 1 |
| `scripts` | 5 | 图标生成 1 + anime 同步 4 |
| `tests` | 1 | `feature-data.test.mjs`（node:test） |
| **合计** | **226**（src） | |

---

## 2. 根目录与工程配置

| 文件 | 作用 |
|---|---|
| `package.json` | 依赖清单（生产 26 + 开发 8）与脚本；`preinstall` 锁定 pnpm |
| `astro.config.mjs` | **全站构建枢纽**：集成 swup / icon / svelte / sitemap；`markdown.processor` 注入自定义 remark 插件 + 内置 Shiki 双主题（`markdown.shikiConfig`）；vite 三条 alias（图标体系，见 §6.4）；tailwindcss vite 插件；build 期 esbuild 丢弃 `console.log/debug` 与 `debugger`。`isBuildCommand`/`isDevCommand` 由 `process.argv` 判定 |
| `tsconfig.json` | `astro/tsconfigs/strict` + 路径别名：`@/*` `@components/*` `@utils/*` `@layouts/*` `@i18n/*` `@constants/*` `@assets/*` `@shirone/iconify-offline*`；`allowJs: false`、`declaration: true` |
| `svelte.config.js` | 仅 `vitePreprocess({ script: true })` |
| `pagefind.yml` | 搜索索引排除选择器（`[data-pagefind-ignore]`、搜索面板自身） |
| `.env.example` | `BILI_SESSDATA`（B 站私有追番列表同步用，唯一环境变量） |
| `.npmrc` | `manage-package-manager-versions`（跟随 package.json 的 `packageManager` 字段） |
| `pnpm-workspace.yaml` | 仅 `allowBuilds`：允许 esbuild/swup 的 postinstall 构建脚本、禁止 `@parcel/watcher` |
| `.gitignore` | 忽略 `dist/`、`.astro/`、`.env*`、`src/data/anime-snapshots/*.json`、`public/assets/anime/covers/*`、IDE 与本地工具目录（`.zcode/`、`Shirone-main/`、`research/` 等） |
| `.gitattributes` / `LICENSE` / `README（无）` | 换行策略 / MIT |

---

## 3. 总体分层架构

### 3.1 组件装配链（渲染层级）

```
pages/*.astro（20 个路由）
  └─ MainGridLayout.astro ──── 页面骨架：TopAppBar / BannerStage / SideBar(×1~2)
      │                        / CategoryBar / #swup-container + Footer / FloatingControls
      │                        / RouteProgress / SiteNavigationDrawer
      └─ Layout.astro ──────── 文档壳：<head>（meta/OG/favicon/feed alternate）
                               / 防闪烁主题脚本 / ConfigCarrier / Snackbar / 纹理画布
                               / 全局样式装载 / swup hooks 注册

organisms（29）── 页面区块、结构组件、Svelte 交互岛
   └─ molecules（27）── 取数 + i18n + props 映射 + widget 骨架
        └─ atoms（66）── M3E 原子组件库 + 博客业务原子（blog/ 子目录）
```

分工口诀：**pages 管路由与取数，MainGridLayout 管骨架，Layout 管文档与全局运行时；organisms 管装配与区块交互，molecules 管数据整形，atoms 管视觉原语。**

### 3.2 构建期数据流总图

```
内容与数据生产者                          消费者
─────────────────                      ─────────────────────────────────────
src/content/posts/*.md ──┐
                         ├→ content.config.ts(zod 校验) → utils/content-utils.ts
                         │      （全站文章数据中枢：排序/tag/category）
                         │         ├→ 首页/文章/归档/分类/标签页
                         │         ├→ utils/feed.ts → rss.xml / atom.xml
                         │         ├→ utils/llms-utils.ts → llms.txt / llms-full.txt
                         │         ├→ utils/calendar-data.ts → 侧栏日历
                         │         └─ utils/site-stats.ts → 侧栏统计
src/content/spec/about.md ────→ pages/about.astro（spec 集合唯一消费点）
src/data/*.ts ──────────────→ 各功能页（compass/friends 直连；
                               devices/timeline 经 utils/feature-data.ts 与 config 合流；
                               anime 经 utils/anime-data.ts 三源分发）
src/data/anime-snapshots/*.json ←─ scripts/anime/sync.mjs（唯一生成方，gitignore）
src/config/*.ts ────────────→ astro.config.mjs / 全部组件与页面
                               （客户端默认值经 ConfigCarrier.astro 落入 DOM）
scripts/icons/generate-local-icons.mjs ──→ src/generated/local-icon-collections.ts
                                           （唯一消费方：Icon.svelte）
src/assets/images/* ────────→ profileConfig / siteConfig（banner、头像）
public/favicon、public/images/device ──→ Layout（favicon）/ data/devices.ts（设备图）
```

### 3.3 运行时（浏览器）形态

- 全站是 **Swup 持久壳**：TopAppBar / SideBar / CategoryBar / BannerStage 渲染在 `#swup-container` 之外，各自监听 swup 钩子按 `#swup-container` 的 `data-current-page` 等属性重新同步状态；容器内内容跨导航整体替换。
- Svelte 交互岛水合指令：页面区块统一 `client:visible`（惰性）、全局件 `client:load`（RouteProgress、SiteNavigationDrawer、FAB）、仅交互件 `client:only="svelte"`（Search、LightDarkSwitch、DisplaySettings、Snackbar）。
- 原生灯箱 `utils/lightbox.ts`（独立 chunk 约 12KB + 样式并入共享 CSS，随首屏脚本加载，替代原按需动态加载的 @fancyapps/ui）；Pagefind 仍为按需（PROD 首次点搜索时 `window.__loadPagefind`）。

---

## 4. 站点路由全景

| 路由 | 页面文件 | 数据源 | 主要组件 |
|---|---|---|---|
| `/`、`/2/`… | `pages/[...page].astro` | posts → `getSortedPosts()` + `paginate(postListConfig.pageSize)` | PostPage、Pagination |
| `/posts/<slug>/` | `pages/posts/[...slug].astro` | posts 集合 + `article-discovery` 相关/随机推荐 + `remarkPluginFrontmatter` 字数 | Markdown、License、ArticleShare、ArticleDiscovery、LastUpdatedNotice |
| `/about/` | `pages/about.astro` | **spec 集合**（`getEntry("spec","about")`） | Card、Markdown |
| `/archive/` | `pages/archive.astro` | `getSortedPostsList()`；兼收 `?tag=`/`?category=`/`?uncategorized` | ArchivePanel |
| `/categories/` | `pages/categories.astro` | `getCategoryList()` | MetaIcon、PageHeader(atoms)、Card |
| `/tags/` | `pages/tags.astro` | `getTagList()` | Chip(atoms)、PageHeader(atoms)、Card |
| `/anime/` | `pages/anime.astro` | `utils/anime-data`（local/snapshot/dev 三源） | AnimeSection |
| `/compass/` | `pages/compass.astro` | `data/compass.ts` 直连 | CompassSection |
| `/devices/` | `pages/devices.astro` | `data/devices.ts` × `devicesConfig`（feature-data 合流；enable=false → /404/） | DeviceSection |
| `/timeline/` | `pages/timeline.astro` | `data/timeline.ts` × `timelineConfig`（同上） | TimelineSection |
| `/friends/` | `pages/friends.astro` | `data/friends.ts`（`getFriendsList()`） | FriendSection |
| `/rss/`、`/atom/` | `pages/rss.astro`、`atom.astro` | —（引导页） | FeedGuide |
| `/rss.xml` | `pages/rss.xml.ts` | posts → `utils/feed`（@astrojs/rss，RSS 2.0 全文） | — |
| `/atom.xml` | `pages/atom.xml.ts` | posts → `utils/feed`（手写 `buildAtomXml`，Atom 1.0） | — |
| `/llms.txt`、`/llms-full.txt` | `pages/llms*.txt.ts` | posts（草稿/黑名单过滤后）→ `utils/llms-utils` | — |
| `/robots.txt` | `pages/robots.txt.ts` | 无（`import.meta.env.SITE` 模板，Disallow `/_astro/` + sitemap） | — |
| `/404/` | `pages/404.astro` | 无 | Card、Button（SSR） |
| `/sitemap-index.xml` | `@astrojs/sitemap` 集成自动生成 | — | — |

注意：devices/timeline 在功能关闭时的 `Astro.redirect("/404/")` 在静态构建下生成 meta-refresh 页；`404.astro` 经 Astro 特例直接产出根级 `dist/404.html`，供静态托管兜底。搜索索引由构建末尾的 Pagefind 扫描 `dist/` 生成（入口标记：`Markdown.astro` 的 `data-pagefind-body`）。

---

## 5. src/ 逐目录详解

### 5.1 layouts/（2 个）

| 文件 | 作用 | 关键依赖 |
|---|---|---|
| `Layout.astro` | 全站唯一文档壳：`<head>` 全套（标题拼接、OG/Twitter、favicon、rss/atom alternate、`<slot name="head">` 透传）；`is:inline` 防闪烁脚本（localStorage 恢复 theme/hue/wallpaper/texture 并设 `data-theme`、`--hue`）；挂 `ConfigCarrier`、纹理画布、`Snackbar`（client:only）；装载全部全局样式（见 §5.8）；注册 swup hooks 与主题初始化、lightbox-runtime、layout-mode、last-updated-notice。swup 本体由 `@swup/astro` 集成注入 | constants、config(barrel)、setting-utils、lightbox-runtime、layout-mode、responsive-utils、url-utils |
| `MainGridLayout.astro` | 所有内容页的骨架：sticky `TopAppBar` → `BannerStage`（接收 page/title/description/date）→ `#main-grid`（`SideBar` 主/副栏 + `CategoryBar`（Swup 容器外）+ `main#swup-container` + Footer 桌面/移动两份）+ `FloatingControls`、`RouteProgress`（client:load）、`SiteNavigationDrawer`（client:load）。栅格类名由 `responsive-utils` 数据驱动生成 | organisms 9 件、responsive-utils、Layout |

### 5.2 pages/（21 个）

见 §4 路由表。共性约定：

- 全部包 `MainGridLayout`（端点 `.ts` 除外）；`page` prop 传入驱动 banner 形态、侧栏 widget 过滤、FAB 页面过滤（`SidebarPage` 类型，13 个页面标识）。
- 文章详情页是依赖最重的一页：`articleConfig` 的三个 resolve 函数 + `discoverArticles()` 预计算推荐 + head 注入 JSON-LD（经 `<slot slot="head">` 穿透 MainGridLayout 进 Layout）。

### 5.3 components/

#### organisms/（27 个，全部有消费方）

| 组件 | 作用 | 消费方 |
|---|---|---|
| `TopAppBar.astro` | 顶栏：抽屉按钮 + 标题 + navBarConfig 导航（含子菜单下拉）+ 三个 client:only 岛（Search/LightDarkSwitch/DisplaySettings）；PROD 注入 Pagefind 懒加载器 `window.__loadPagefind`；导航高亮按 `nav-utils.resolvePageKey` 随 swup 同步 | MainGridLayout |
| `SideBar.astro` | 数据驱动侧栏编排器：`componentMap` 注册 7 种 widget（profile/announcement/categories/tags/stats/calendar/toc），按 `sidebarConfig` 的 column/slot 渲染；SSR 全量 + `data-sidebar-pages` 标记，swup 后按 `data-current-page` 重新过滤（motion FLIP） | MainGridLayout（主/副栏两实例） |
| `BannerStage.astro` | 全站横幅舞台（目录内最大）：构建期 `getImage` 生成 desktop/mobile 双组 AVIF/WebP srcset；运行时 `banner-state.resolveBannerState` 决策显隐/素材组/布局，`banner-animation` 播 Ken Burns 轮播，打字机副标题，写 `body.dataset.banner*` 供全站 CSS 联动 | MainGridLayout |
| `CategoryBar.astro` | 全站分类导航条（Home/Archive/各分类 Chip + 计数），SSR 初始高亮 + swup 后按 URL 与 `data-current-post-category` 重同步；渲染于 Swup 容器外跨导航保活 | MainGridLayout |
| `Footer.astro` | 页脚薄编排：RSS/Atom/Sitemap/Powered-by 链接 + profileConfig；`node:fs` 构建期读取可选 `src/config/FooterConfig.html` 注入自定义页脚（enable=false 时零读取） | MainGridLayout |
| `PostPage.astro` | 首页文章列表：list/grid 容器（container query 回退）；`is:inline` 防闪脚本直读 localStorage `post-list-mode`；模块脚本挂 `masonry` 瀑布流 | `[...page].astro` |
| `PostCard.astro` | 文章卡薄取数层：CollectionEntry → 封面 srcset/日期/分类标签 URL | PostPage |
| `Profile.astro` | 侧栏作者卡（头像 srcset、社交链接 IconButton+Tooltip / Button） | SideBar componentMap |
| `ArticleDiscovery.astro` | 文章页底部相关/随机推荐（SSR 双泳道） | posts/[...slug] |
| `ArticleShare.svelte` | 分享区块（client:visible）：Dialog + `share-poster` 生成海报（二维码/头像/主题配色）、复制链接、下载 PNG；MutationObserver 跟随明暗重算配色 | posts/[...slug] |
| `AnimeSection.svelte` | 番剧页主体（状态 Chips + grid/list 双布局，布局偏好 localStorage `shirone:anime-layout-mode`，FLIP 切换 + 分页加载） | anime.astro |
| `ArchivePanel.svelte` | 归档面板（按年/分类/标签 SegmentedButton 切换 + ArchiveList 折叠时间轴；query 定向浏览视图；折叠状态持久化 `shirone:archive-collapsed`） | archive.astro |
| `CompassSection.svelte` | 罗盘页主体（搜索 + 分组 Chips + CompassTile 磁贴） | compass.astro |
| `DeviceSection.svelte` | 设备页主体（搜索 + 分类 Chips + DeviceCard 瀑布流，复用 `masonry`） | devices.astro |
| `FriendSection.svelte` | 友链页主体（搜索 + 标签 Chips + FriendCard 双列） | friends.astro |
| `TimelineSection.svelte` | 时间线页主体（分类 Chips + TimelineCard 纵向流） | timeline.astro |
| `FeedGuide.astro` | RSS/Atom 订阅引导页主体（feed 地址卡 + 阅读器推荐 + 最新 6 篇） | rss.astro、atom.astro |
| `FloatingControls.astro` | 右下角 FAB 组：按 `fabConfig` 装配 FloatingTOCPanel/FloatingActionButton（目录/回首页/回顶），`fab-controller` 全局单例驱动 | MainGridLayout |
| `LightDarkSwitch.svelte` | 明暗三态切换（桌面弹 Menu 选择，移动直接切），写 `setting-utils.setTheme` | TopAppBar |
| `DisplaySettings.svelte` | 显示设置面板：色相 Slider + 9 种 MC 风格 + Color Spec + 壁纸/列表布局/纹理/减少动效；写 setting-utils/theme-utils/layout-mode | TopAppBar |
| `RouteProgress.svelte` | Swup 切页进度条（事件驱动，样式由 `siteConfig.progressIndicator` 控制） | MainGridLayout |
| `Search.svelte` | 顶栏搜索：桌面 SearchBar 分子 / 移动 SearchPanel 原子；PROD 走 Pagefind（`pagefindready` 事件初始化），DEV 假数据 | TopAppBar |
| `SiteNavigationDrawer.svelte` | 全站导航抽屉：监听 `site-drawer:toggle` 事件开合，navBarConfig 一级导航 + 折叠分组 + 高亮同步 | MainGridLayout |

#### molecules/（27 个）

| 组件 | 作用 | 消费方 |
|---|---|---|
| `WidgetLayout.astro` | 侧栏 widget 通用骨架（Card + AccentBar 标题 + 折叠容器 + footer slot），`<widget-layout>` 自定义标签 | 同层 6 个 widget |
| `Announcement.astro` | 公告 widget（announcementConfig + 可关闭 + localStorage 记忆） | SideBar |
| `Categories.astro` / `Tags.astro` | 分类/标签 widget（getCategoryList/getTagList 取数 + collapseAfter 截断 + 「查看全部」） | SideBar |
| `Calendar.astro` | 日历 widget 外壳（`calendar-data` SSR 取数 → CalendarView 岛） | SideBar |
| `CalendarView.svelte` | 日历交互岛（切月/展开当日文章，`Intl` 本地化） | Calendar.astro |
| `SidebarTOC.astro` | 侧栏目录 widget + 内联 `<table-of-contents>` 自定义元素（滚动高亮 + Swup 兼容） | SideBar |
| `SiteStats.astro` | 站点统计 widget（`site-stats` 备忘化取数） | SideBar |
| `PostMeta.astro` | 文章页元信息行外壳（date-utils/url-utils 整形 → atoms/blog/PostMeta） | posts/[...slug] |
| `License.astro` | 文章页版权块（profileConfig/licenseConfig） | posts/[...slug] |
| `ImageWrapper.astro` | 文章图片统一包装（`asset-utils` 解析 + astro:assets Picture/Image + image-bloom 辉光内联变量） | posts/[...slug] |
| `LastUpdatedNotice.astro` | 久未更新提示条（SSR 骨架 + 客户端 `last-updated-notice` 判定） | posts/[...slug] |
| `Pagination.astro` | 分页器外壳（Astro Page → PagePagination 原子） | [...page].astro |
| `FloatingActionButton.astro` | FAB 分子项（SSR 注入设备类 `fab-responsive` + 页面过滤属性 `sidebar-page`） | FloatingControls |
| `FloatingTOCPanel.astro` | 悬浮目录面板（TocList 原子 + siteConfig.toc.depth） | FloatingControls |
| `PageHeader.svelte` | 页面级大标题（h1 + 图标 + 副标题）——注意与 `atoms/display/PageHeader.astro`（SSR 静态版）是两个组件 | 6 个 *Section |
| `SectionTitle.svelte` | 区块级小标题（h2） | CompassSection |
| `AnimeCard` / `CompassTile` / `DeviceCard` / `FriendCard` / `TimelineCard` | 五大功能页的卡片单元（纯展示 + motion reveal 入场；AnimeCard 组合 ProgressIndicator） | 对应 *Section |
| `ArticleDiscoveryItem.astro` | 推荐列表项（AccentBar + 元信息） | ArticleDiscovery |
| `BannerWaves.astro` | Banner 底部多层海浪装饰（SVG defs/use + 视差） | BannerStage |
| `SearchBar.svelte` | 顶栏折叠胶囊搜索条 | Search |

#### atoms/（33 个，M3E 组件库 + 博客业务原子）

各文件头注释均标注「官方 xxx.kt 移植，token 对齐 v0.192」。2026-08-29 死代码清理后，保留的全部组件均有真实消费链：

| 子目录 | 组件（消费方） |
|---|---|
| action/（5） | `Button`（5 变体×5 尺寸；CategoryList/ArticleShare/AnimeSection/Profile）、`Chip.astro`（TagList/CategoryBar/tags 页）、`Chips`（6 个 Section 的筛选芯片）、`FAB`（FloatingActionButton）、`IconButton`（7 处，atoms 中最广） |
| blog/（10，全部存活） | `ArchiveList`（ArchivePanel）、`CategoryList.astro`（molecules/Categories）、`FooterBar.astro`（Footer）、`PagePagination.astro`（Pagination）、`PostCard.astro`（organisms/PostCard）、`PostMeta.astro`（PostCard + molecules/PostMeta）、`SearchPanel`（Search）、`TagBadge.astro`（PostCard）、`TagList.astro`（molecules/Tags）、`TocList.astro`（SidebarTOC + FloatingTOCPanel） |
| display/（7） | `AccentBar`（6 处）、`Avatar`（FriendCard/Profile）、`Card`（17 处，atoms 最广）、`Icon`（**全站图标枢纽**，见 §6.4）、`MetaIcon.astro`（PostMeta/SiteStats/categories 页）、`PageHeader.astro`（3 个静态页）、`PanelStack`（DisplaySettings） |
| feedback/（3） | `LoadingIndicator`（5 个 Section）+ `loadingShapes.ts`（仅 LoadingIndicator 消费的 73KB 形状数据）、`ProgressIndicator`（AnimeCard/ArticleShare/RouteProgress，波浪进度几何来自 `utils/wavy-progress`） |
| input/（1） | `TextField`（5 处：5 个 Section 搜索框） |
| navigation/（1） | `Menu`（LightDarkSwitch 的下拉菜单） |
| overlay/（3） | `Dialog`（ArticleShare）、`Snackbar`（Layout 全局挂载，事件驱动）、`Tooltip`（Profile） |
| selection/（3） | `SegmentedButton`（ArchivePanel/DisplaySettings）、`Slider`（DisplaySettings 色相滑块，专用组件）、`Switch`（DisplaySettings） |

被清理的 34 个组件（action/display/input/navigation/overlay/selection 中无消费方的 M3 通用件）与 `FloatingToolbar`、`MermaidDiagramViewer` 见 §9 清理记录；如需复用可从 git 历史找回。

#### content/ 与 system/（各 1 个）

| 文件 | 作用 |
|---|---|
| `content/Markdown.astro` | Markdown 渲染容器（about 页 + 文章正文）：`data-pagefind-body` 搜索索引入口 + `prose custom-md` 样式钩子（样式由 `styles/markdown.css` 承接）。纯 SSR，无客户端脚本 |
| `system/ConfigCarrier.astro` | 构建期配置 → 客户端的桥：渲染 `<div id="config-carrier" data-hue data-wallpaper-mode data-texture-preset data-texture-opacity>`。读取方：`setting-utils`（默认 hue/壁纸/纹理）。设计意图：客户端 JS 不打包 siteConfig，改从 DOM 读 |

### 5.4 config/ + types/ + constants/

**config/（18 个）**：全部为「值 + 少量 resolve 校验函数」。与 types/ 一一对应（4 个基础配置共用 `types/config.ts`）：

| config | 消费的 type | 关键导出 | 主要消费方 |
|---|---|---|---|
| `siteConfig.ts` | config.ts + textureConfig.ts | site/base/lang/主题色/横幅/纹理/显示设置 + `resolveTextureOptions` 等函数 | 全仓最广（astro.config + 约 22 文件） |
| `profileConfig.ts` | config.ts | 头像/名称/简介/社交 | Profile/Footer/License/feed/llms |
| `licenseConfig.ts` | config.ts | CC BY-NC-SA 4.0 | License、posts 页 |
| `navBarConfig.ts` | navBarConfig.ts | 内部 `LinkPresets` 预设表 + 导航结构（按 animeConfig/devicesConfig.enable 动态裁剪子菜单） | TopAppBar、SiteNavigationDrawer（直连） |
| `postListConfig.ts` | postListConfig.ts | pageSize/布局/卡片宽度 + `POST_CARD_MIN_WIDTH` | [...page]、PostPage、layout-mode |
| `sidebarConfig.ts` | sidebarConfig.ts | single/dual 双栏 + 7 种 widget 编排 | SideBar、responsive-utils（直连） |
| `footerConfig.ts` | footerConfig.ts | 自定义 HTML 开关（当前 false） | Footer |
| `FooterConfig.html` | —（非模块） | 页脚 HTML 片段模板（当前为空注释） | Footer.astro 用 `node:fs` 构建期读取（不走 import） |
| `announcementConfig.ts` | announcementConfig.ts | 公告内容 | Announcement |
| `animeConfig.ts` | animeConfig.ts | 数据源模式（local/snapshot）/providers/快照目录 + `resolveAnimeOptions` | **scripts/anime/sync.mjs**、anime-data、navBarConfig |
| `articleConfig.ts` | articleConfig.ts | lastUpdated/discovery/share + 4 个 resolve 函数 | posts 页、ArticleShare（类型） |
| `devicesConfig.ts` | devicesConfig.ts | enable/分类/禁用项 | devices 页、navBarConfig |
| `fabConfig.ts` | fabConfig.ts | FAB 开关/对齐/items（判别联合） | FloatingControls、fab-responsive |
| `imageBloomConfig.ts` | imageBloomConfig.ts | 辉光占位参数 | ImageWrapper、image-bloom |
| `llmsConfig.ts` | llmsConfig.ts | enable/generateFull/exclude 黑名单/corePages | llms 两端点、llms-utils（类型） |
| `timelineConfig.ts` | timelineConfig.ts | enable/分类/禁用项 | timeline 页 |
| `index.ts` | — | **barrel**：re-export 8 个域配置（刻意排除 navBar/sidebar/anime/devices/timeline/announcement/postList——消费方直连，防循环依赖） | 20 个文件 `from "@/config"` |

**types/（15 个）**：契约层，无运行时逻辑。`SidebarPage`（13 个页面标识 + `"404"`）是跨域复用最广的类型（15 个文件）。

**constants/（2 个）**：`constants.ts`（明暗模式常量、纹理 localStorage key 与事件名、`TEXTURE_PRESETS`、Banner 高度组、页宽）被 Layout/setting-utils/responsive-utils/BannerStage 等 7 处消费；`icon.ts`（`defaultFavicons` 明暗各 4 尺寸兜底清单）仅 Layout 消费。

### 5.5 data/（7 个）

「配置管行为、数据管内容」原则中的**数据侧**（纯内容数组，零行为逻辑；行为开关在 config/）：

| 文件 | 内容 | 合流方式 | 最终消费页面 |
|---|---|---|---|
| `anime.ts` | 五态 AnimeItem 类型 + **空数组**（local 兜底占位） | `anime-data.getAnimeList()` 三源分发 | anime |
| `compass.ts` | 4 组 11 条站点罗盘 | 直连 import | compass |
| `devices.ts` | 4 台设备（图片引用 `public/images/device/*.jpg`） | `feature-data.resolveDevicesData(devicesConfig)` | devices |
| `friends.ts` | 空友链数组 + `getFriendsList()` 访问器 | 直连 import | friends |
| `timeline.ts` | 5 条时间线事件 | `feature-data.resolveTimelineData(timelineConfig)` | timeline |
| `anime-snapshots/bangumi.json` | 同步脚本产物（Envelope v1：schemaVersion/fetchedAt/accountRef/items），**gitignore，本地存在** | `anime-data` snapshot 模式读取 | anime |
| `anime-snapshots/.gitkeep` | 目录占位 | — | — |

### 5.6 utils/（45 个，按域分组）

**A. 构建期数据层（Node fs / astro:content）**

| 文件 | 作用 | 消费方 |
|---|---|---|
| `content-utils.ts` | **全站文章数据中枢**：`getSortedPosts`（draft 过滤/置顶/日期倒序）、`getSortedPostsList`、`getTagList`、`getCategoryList` | 8 个页面 + 5 个组件 + 4 个 utils |
| `anime-data.ts` | anime 三源分发（local 手写 / snapshot 快照校验 / dev 动态 import providers 实时拉取回写），异常回退保证不白屏 | anime 页 |
| `anime/normalize.ts` | 同构清洗/排序/快照解析/URL 消毒（**同一套代码跑在同步脚本与构建期**） | anime-data、scripts/anime/sync.mjs |
| `anime/status.ts` | 五态呈现元数据表（i18n key/图标/语义色） | AnimeCard、AnimeSection |
| `feature-data.ts` | config 规则 × data 内容的合流器（enable/order/disabledKeys） | devices/timeline 页 + tests |
| `calendar-data.ts` | 发布日聚合（模块级 memo） | Calendar widget |
| `site-stats.ts` | 站点统计（总字数需 render 全部文章，memo 化） | SiteStats widget |
| `article-discovery.ts` | 相关推荐（tag IDF 加权）+ 确定性随机（FNV-1a，构建产物稳定） | posts 页 |
| `asset-utils.ts` | `import.meta.glob` 构建期图片索引 + 相对路径解析 | ImageWrapper/PostCard/Profile/BannerStage/posts 页 |
| `feed.ts` | RSS/Atom 正文：`markdownToPlainText` 剥离 Markdown 语法为纯文本 → 非法 XML 字符剥离 | rss.xml、atom.xml |
| `llms-utils.ts` | LLM 友好文本：多趟正则清洗（保留代码块、展开 `<llm-only>`、剔除 `<llm-exclude>` 与 `:::encrypt`）+ 目录/全文生成 | llms 两端点 |
| `image-bloom.ts` | 辉光占位内联 CSS 变量 | ImageWrapper |
| `fab-responsive.ts` | FAB 设备类 → Tailwind 类名（SSR 内联防闪烁） | FloatingControls、FloatingActionButton |
| `responsive-utils.ts` | 侧栏 arrangement 求解 + 栅格类名 + `--page-width` 决策 | Layout、MainGridLayout |
| `toc-utils.ts` | 标题 → TOC 条目整形 | SidebarTOC、FloatingTOCPanel |
| `markdown-processor.mjs` | Astro 7 专属注入点：`unified({remarkPlugins:[reading-time]})` 交给 `markdown.processor` | **astro.config.mjs** |

**B. 同构核心（构建期 + 浏览器共用）**

| 文件 | 作用 | 消费方 |
|---|---|---|
| `date-utils.ts` | UTC 日期纯函数 + 更新提示状态 | 10+ 组件 |
| `url-utils.ts` | `url()`（BASE_URL 拼接）/`pathsEqual`/tag/category URL（归档页 query 方案） | **全仓最广 util**（20+ 文件） |
| `nav-utils.ts` | URL → 导航高亮 pageKey | TopAppBar、SiteNavigationDrawer |
| `sidebar-page.ts` | widget 页面白名单判定 + `data-sidebar-pages` 属性编解码（SSR 与客户端同一套，防逻辑漂移） | SideBar、FloatingControls、FloatingActionButton |
| `motion.ts` | M3E 动效基础设施：`prefersReducedMotion`（系统 ∥ 手动开关）、collapse/reveal Svelte action、FLIP 原语、缓动常量 | **横向最广**（15+ 组件/工具） |
| `banner-state.ts` | Banner 显隐/形态纯决策函数（SSR 与客户端同一口径） | BannerStage |

**C. 客户端运行时门面（Swup 生命周期模式）**

| 文件 | 作用 | 消费方 |
|---|---|---|
| `lightbox-runtime.ts` | 灯箱生命周期门面（委托绑定 + swup visit:start 关闭开着的灯箱；委托对换页内容天然生效，无需重绑循环） | **Layout.astro** |
| `lightbox.ts` | **原生图片灯箱**（替代 @fancyapps/ui）：无限轮播/计数/caption、滚轮·双击·捏合缩放 1–3x、平移、旋转/翻转/重置、缩略图条、全屏、自动播放、拖拽关闭/滑动翻页、键盘、焦点圈定；document 级点击委托（Swup/解密内容免重绑）+ `openLightbox()` 编程式打开 | Layout（经 runtime 门面） |
| `fab-controller.ts` | FAB 全局单例（滚动显隐、悬浮 TOC 克隆与焦点管理、FLIP、swup 钩子） | FloatingControls |
| `last-updated-notice.ts` | 更新时效客户端判定（SSR 骨架延迟激活） | Layout |
| `layout-mode.ts` | 列表/网格布局偏好（localStorage `post-list-mode`）+ FLIP 切换 | Layout、DisplaySettings（PostPage 防闪脚本按约定直读同键） |

**D. 横向基础设施（事件总线类）**

| 文件 | 作用 | 消费方 |
|---|---|---|
| `menu-bus.ts` | 菜单单开互斥总线（document 事件 `m3-menu-exclusive-open`） | Menu |
| `snackbar.ts` | 全局提示事件总线（window 事件 `m3e:snackbar`） | Snackbar 监听；ArticleShare/FeedGuide/posts 页触发 |
| `masonry.ts` | CSS grid 瀑布流打包（最短列优先 span 赋值 + ResizeObserver） | PostPage、DeviceSection、layout-mode |

**E. 外观与主题运行时（详见 §6.6）**：`setting-utils.ts`（localStorage 读写 + document 应用）、`theme-utils.ts`（M3 动态配色 `--mc-*` 写入）、`mc-utils.ts`（material-color-utilities 薄封装，9 风格 × 2 规范）。

**F. 其他客户端单点**：`share-poster.ts`（Canvas 分享海报，二维码已改为海报内嵌文章 URL 文本）、`wavy-progress.ts`（Compose 官方波浪进度几何移植）、`banner-animation.ts`（WAAPI Ken Burns 预设）。

### 5.7 i18n/（12 个）

- `i18nKey.ts`：唯一 key 源，enum 共 **169 个成员**（导航/anime/compass/devices/日历/主题设置/纹理/分页/分享/灯箱等分组）。
- `translation.ts`：`Translation` mapped type 强制 2 个语言文件各实现全部 169 key（缺 key 编译期报错）；按小写语言码查 map（含 en_us/zh 等别名），查不到回落 en；`i18n(key)` 取 `siteConfig.lang`（**当前 `zh_CN`，单语言静态站点，无运行时切换**）。
- `languages/`：**中/英 2 份翻译**（zh_CN/en；其余 8 语言已于 2026-08-29 精简移除），构建期静态求值进产物。
- 消费面约 60+ 文件。**注意**：navBarConfig、announcementConfig 也消费 i18n，因此它们被刻意排除出 `@/config` barrel（防循环依赖，见 §10）。

### 5.8 styles/（12 个）

**装载顺序（全部自 Layout.astro 发起）**：

```
Layout.astro
├─ import main.css ──────── Tailwind 入口（@import "tailwindcss" + typography + @theme 字体映射）
│    ├─ layer(components)  transition.css（Swup 过渡 + onload stagger）
│    ├─ layer(components)  markdown.css（.custom-md 正文）
│    │    └─ markdown/astro-code.css（Shiki 代码块站点化，暗色经 --shiki-dark 变量切换）
│    ├─ layer(utilities)   markdown-typography.css（与 Typography 插件的层界桥）
│    ├─ layer(components)  toc.css（目录树）
│    └─ layer(components)  image-bloom.css（图片辉光占位）
├─ import font-faces.css ── 系统字体栈令牌（零 webfont）
├─ textures.css?raw ─────── 读取后 <style is:inline> 内联（受 siteConfig.texture.enable 控制）
└─ Layout 全局 <style> @import variables.css ── 全站设计令牌（明暗双值 CSS 变量、
     --mc-* 动态取色优先 + oklch(--hue) 回退、形状/密度/动效/elevation/type 阶梯）
```

组件级增量装载：断点常量已内联为各组件媒体查询的字面像素（对齐 Tailwind 默认断点）；`widget-index-link.css` 被 molecules/Categories、Tags 引用；`lightbox.css` 由灯箱委托首次绑定时动态 import（随 12KB 灯箱 chunk 按需加载）。

### 5.9 plugins/（1 个）

| 文件 | 类型 | 作用 | 挂载点 |
|---|---|---|---|
| `remark-reading-time.mjs` | remark 插件 | 字数/阅读时长 → `remarkPluginFrontmatter` | markdown-processor.mjs |

### 5.10 content/ + assets/ + generated/ + 类型声明

- `content/posts/`（4 篇 md）：frontmatter 契约见 `content.config.ts`（title/published/updated/pinned/draft/description/image/tags/category），字段用法与消费链路详见 [frontmatter.md](./frontmatter.md)。唯一消费入口是 content-utils。
- `content/spec/about.md`：about 页内容，含 `::github{repo=...}` 指令。
- `assets/images/`：`MyAvatar.webp`（profileConfig 头像）、`banner/desktop|mobile/` 各 3 张（siteConfig 轮播壁纸）。
- `src/icons/`：astro-icon 本地图标目录约定（当前空置 + `.gitkeep` 占位——存在该目录可避免 astro-icon 启动警告）。
- `generated/local-icon-collections.ts`：图标生成脚本产物（61.9KB，勿手改），唯一消费方 Icon.svelte。
- `env.d.ts`：anime providers 两个 `.mjs` 的通配模块类型。
- `global.d.ts`：`Window` 增强（`swup`、防重绑定标志、`pagefind.search()` 与 SearchResult 结构）。

---

## 6. 全链路关系（生产消费关系）

### 6.1 数据生产者 → 消费者总表

| 生产者 | 产物 | 消费者 |
|---|---|---|
| `scripts/icons/generate-local-icons.mjs` | `src/generated/local-icon-collections.ts` | Icon.svelte（→ 全部 Svelte 组件的图标） |
| `scripts/anime/sync.mjs`（+providers、load-env） | `src/data/anime-snapshots/<provider>.json` | anime-data.ts snapshot 模式 |
| `scripts/anime/providers/*`（dev 实时拉取） | 内存数据 + 快照回写 | anime-data.ts fetchOnDev 模式 |
| `src/content/posts/` | posts 集合 | content-utils（唯一入口） |
| `src/content/spec/` | spec 集合 | about.astro |
| `src/config/` | 行为配置 | astro.config、全站组件/页面、scripts/anime |
| `src/config/` → ConfigCarrier.astro | DOM data-* | setting-utils |
| `src/data/` | 内容数据 | feature-data / anime-data / 直连页面 |
| `src/assets/images/` | 头像/壁纸 | profileConfig、siteConfig |
| `public/favicon`、`public/images/device` | favicon、设备图 | Layout（siteConfig.favicon 兜底）、data/devices.ts |
| `src/config/FooterConfig.html` | 页脚片段 | Footer.astro（fs 读取，enable=false 时休眠） |
| remark 插件（构建期） | `remarkPluginFrontmatter`（字数/时长） | posts 页（字数展示）、feed/llms |

### 6.2 Markdown 管线（构建期主线）

```
astro.config.mjs
  markdown.processor = utils/markdown-processor.mjs
      = unified({ remarkPlugins: [remark-reading-time] })   ← @astrojs/markdown-remark
  markdown.shikiConfig（内置 Shiki 双主题：github-light/github-dark，wrap: true；代码块产出 .astro-code + --shiki-dark 变量）
       ↓
content collections 前数据（正文 HTML + remarkPluginFrontmatter）
       ↓
Markdown.astro 渲染（.custom-md + prose）；代码块视觉由 styles/markdown/astro-code.css 站点化（含暗色 token 切换）
```

纯静态渲染，Markdown 链路无客户端脚本。

### 6.3 内容分发链（同一数据源的四种出口）

`getSortedPosts()` 为源头的四个分支，草稿与黑名单内容在源头过滤：

1. **RSS 2.0**：`feed.getFeedPosts` → `rss.xml.ts`（@astrojs/rss，description + 纯文本正文）；
2. **Atom 1.0**：同源 → `atom.xml.ts`（手写 `buildAtomXml`，`content type="text"`）；
3. **llms.txt / llms-full.txt**：`llms-utils` 正则清洗（排除草稿/excludeTags/Categories）→ 两个 text/markdown 端点；
4. **搜索索引**：Markdown.astro `data-pagefind-body` → 构建后 `pagefind --site dist` → 运行时 `Search.svelte`（`window.__loadPagefind` 懒加载器由 TopAppBar 注入，`pagefind.yml` 排除搜索面板自身）。

### 6.4 图标体系（三层 alias，最易误解的关系）

```
SSR 静态路径：  .astro 组件 → astro-icon（构建期内联 SVG，消费 @iconify-json/*）
客户端路径：    Svelte 组件 import "@iconify/svelte"
                  │ astro.config vite alias ①: /^@iconify\/svelte$/ → src/components/atoms/display/Icon.svelte
                  ↓
              Icon.svelte（13 行薄壳：addCollection 注册 generated/local-icon-collections）
                  │ alias ②③: "@shirone/iconify-offline(-functions)" → node_modules/@iconify/svelte/dist/{OfflineIcon.svelte, offline-functions.js}
                  ↓
              离线渲染（运行时零网络、零 iconify API）
```

结论：Icon.svelte 在 import 边表中**零直接引用**却是全站引用量最大的组件（判断死活不能看路径引用）。⚠️ 新增图标引用后必须重跑 `pnpm icons:generate`（dev/build 会自动执行），否则生成集合缺图标渲染不出。

### 6.5 外观与主题运行时

**设置链**：`DisplaySettings` / `LightDarkSwitch`（UI）→ `setting-utils` / `theme-utils` / `layout-mode`（持久化与应用）→ `mc-utils.resolveScheme`（HCT 动态取色）→ 写约 50 个 `--mc-*` CSS 变量 → `variables.styl` 定义的组件令牌消费。默认值来自 `#config-carrier`。

**localStorage / sessionStorage 键表**：

| 键 | 读写方 | 含义 |
|---|---|---|
| `theme` | setting-utils | light / dark / auto |
| `hue` | setting-utils | 色相 0–360（写 `--hue`） |
| `mc-style` | theme-utils | M3 调色板风格（9 种） |
| `mc-spec` | theme-utils | 设计规范 2021/2025 |
| `mc-motion` | setting-utils | 减少动效（写 `html.motion-reduced`） |
| `texture-preset` / `texture-opacity` | setting-utils | 纹理预设/浓度（写 `--texture-opacity`） |
| `wallpaper-mode` | setting-utils | banner / none |
| `post-list-mode` | layout-mode（PostPage 防闪脚本直读同键） | 文章列表 list/grid |
| `shirone:anime-layout-mode` | AnimeSection | 番剧页布局 |
| `shirone:archive-collapsed` | ArchivePanel | 归档组折叠状态 |
| Announcement 关闭记忆 | Announcement.astro | 公告关闭时长 |

**自定义事件表**：

| 事件 | 载体 | 生产者 → 消费者 |
|---|---|---|
| `m3-menu-exclusive-open` | document | menu-bus：多菜单实例单开互斥（现役 Menu，FABMenu 已随清理移除） |
| `m3e:snackbar` | window | snackbar.ts 触发方（ArticleShare/FeedGuide/posts 页）→ Snackbar.svelte |
| `texture:change` / `wallpaper-mode:change` | window | setting-utils → BannerStage / 纹理画布 |
| `site-drawer:toggle` | window | TopAppBar 抽屉按钮 → SiteNavigationDrawer |
| `pagefindready` / `pagefindloaderror` | window | TopAppBar 注入的懒加载器 → Search.svelte |
| swup 钩子（`visit:start`、`content:replace`、`page:view`…） | swup 实例 | Layout 注册全局钩子；SideBar/CategoryBar/BannerStage/FAB/last-updated 等各自重同步（灯箱走委托无需重同步） |

### 6.6 客户端生命周期统一模式（贯穿约定）

残存的「探测命中才加载 + swup 换页重初始化」模式目前仅剩 last-updated-notice 一处；灯箱已改为 document 级委托（对换页内容天然生效，无重绑循环），markdown 运行时随 EC 移除。新写交互增强时优先考虑委托（一次绑定全站生效），确需容器级初始化时再沿用 dataset 防重绑约定。

### 6.7 侧栏与页面过滤体系

`sidebarConfig`（widget 编排 + 页面白名单）→ `SideBar.astro` SSR 渲染时经 `sidebar-page.pagesToAttribute` 写 `data-sidebar-pages` → swup 导航后客户端脚本读 `#swup-container` 的 `data-current-page`，用同一份 `isWidgetVisibleOnPage` 判定显隐（motion FLIP 过渡）。FAB 体系（`fabConfig` + `FloatingControls`/`FloatingActionButton`）复用同一判定，保证 widget 与 FAB 在同一页面集合上显隐一致。

### 6.8 Banner 体系

`siteConfig.banner`（desktop/mobile 图组）→ `BannerStage` 构建期生成响应式图源 → 运行时 `banner-state.resolveBannerState()`（输入：壁纸模式/页面类型/视口/图数/轮播开关/reduced-motion → 输出：visible/assetGroup/rotate/transparentTopAppBar/contentLayout）→ `banner-animation` 播 Ken Burns 轮播 + 打字机副标题 → 写 `body.dataset.banner*` 供全站 CSS（顶栏透明态、内容上移量）联动。壁纸模式变更经 `wallpaper-mode:change` 事件实时响应。

---

## 7. 构建脚本与测试

详见 [scripts.md](./scripts.md)（逐行解析）。要点：

- `scripts/icons/generate-local-icons.mjs`：dev/start/build 前置；扫描 src 内 5 个白名单前缀的图标名，从 `@iconify-json/*` 抽取 SVG 内联到 `src/generated/`；原子写入。**唯一的 `@iconify-json/*` 消费方**。
- `scripts/anime/sync.mjs`（+ `load-env.mjs`、`providers/bangumi.mjs`、`providers/bilibili.mjs`）：`pnpm anime:sync`；provider 决策顺序 CLI > animeConfig.source.kind > 遍历 providers；经 `src/utils/anime/normalize.ts`（与构建期共用）清洗 → 敏感凭据正则扫描（命中拒落盘）→ 原子写入快照。脚本群零外部依赖。
- `tests/feature-data.test.mjs`：node:test 单测（无外部依赖），覆盖 `feature-data.ts` 的 config×data 合流逻辑；`node --test tests/feature-data.test.mjs` 手动运行。

## 8. 外部依赖映射

完整引用树与五轮清理历程见 [dependencies.md](./dependencies.md)。核心映射：

| 依赖 | 唯一/主要消费方 |
|---|---|
| `astro` + `@astrojs/{svelte,sitemap,rss,markdown-remark,check}` | astro.config / 各组件 / feed.ts / check 工具链 |
| `tailwindcss` + `@tailwindcss/vite` + `@tailwindcss/typography` | astro.config / main.css |
| `astro-icon` | 全部 .astro 组件 |
| `@swup/astro` | astro.config |
| `@material/material-color-utilities` | mc-utils |
| `@iconify/svelte` | 被 alias 重定向（见 §6.4） |
| `mdast-util-to-string` + `reading-time` | remark 插件 |
| `sharp` | astro:assets 默认图像服务（无直接 import） |
| `pagefind` / `typescript` | build 尾段 / check 与 tsc（dev） |

## 9. 死代码清理与遗留问题修复记录（2026-08-29）

全部条目均经「import 边表 + 全仓 grep」双通道确认后处理，处理后 `pnpm build`（18 页 + Pagefind）、`pnpm check`（0 错误）、`pnpm type-check`（0 错误）、`node --test`（3 通过）全绿。

### 9.1 已删除的死文件（36 个）

| 域 | 文件 | 原因 |
|---|---|---|
| atoms/action（5） | `ButtonGroup`、`SplitButton`、`FABMenu`、`ToggleButton`、`FloatingToolbar` | 整套从 Compose 移植后未接入业务；ToggleButton/FloatingToolbar 为传递性死代码（唯一消费方 ButtonGroup / MermaidDiagramViewer 自身已死） |
| atoms/display（7） | `Badge`、`BadgedBox`、`Carousel`、`DataTable`、`Divider`、`ListItem`、`Skeleton` | 无消费方（全仓命中的 "Badge/Carousel" 字样均为 TagBadge / Fancybox 配置项等无关项） |
| atoms/feedback（1） | `PullToRefresh` | 无消费方 |
| atoms/input（9/10） | `Autocomplete`、`DateInput`、`DatePicker`、`DateRangePicker`、`ExposedDropdownMenu`、`SearchBar`、`SearchView`、`Select`、`TimePicker` | 仅 `TextField` 存活 |
| atoms/navigation（5/6） | `AppBar`、`NavigationBar`、`NavigationDrawer`、`NavigationRail`、`Tabs` | 仅 `Menu` 存活（站点实际顶栏/抽屉是 organisms 的 TopAppBar/SiteNavigationDrawer） |
| atoms/overlay（4/7） | `AlertDialog`、`Banner`、`BottomSheet`、`SheetSide` | Dialog/Snackbar/Tooltip 存活 |
| atoms/selection（2/5） | `Checkbox`、`RadioButton` | — |
| molecules（1） | `MermaidDiagramViewer` | Mermaid 依赖已随 c89f584d 移除，此 UI 壳漏删 |
| styles（1） | `markdown-extend.styl` | 零引用孤儿 |
| assets（1） | `demo-avatar.webp` | 主题模板遗留示例头像 |

规律：死代码几乎全部集中在「纯 M3 通用件」——整套移植的组件库业务只接了一部分；`blog/` 业务原子 10 个全部在用。如需复用，从 git 历史找回。

### 9.2 已修复的遗留问题

1. `.env.example`：移除字体系统删除后失效的 `FONT_MAX_*` 变量。
2. `navBarConfig.ts`：`LinkPresets` 去除无效导出（改内部常量）。
3. `anime-data.ts`：注释中的旧脚本路径 `scripts/anime-sync.mjs` → `scripts/anime/sync.mjs`。
4. `astro.config.mjs`：`custom-copy-button` 的导入后缀 `.js` → `.ts`。
5. `Search.svelte`：迁移至 Svelte 5 Runes（`$state`/`$derived`/`$effect`），目录内不再有 legacy `$:` 语法。
6. 新增 `src/pages/404.astro`（i18n 201 key × 10 语言 + `SidebarPage` 扩充 `"404"`），产出根级 `dist/404.html`。
7. astro-icon 启动警告：新建 `src/icons/` 占位目录（`.gitkeep`），`Failed to load icons from "src/icons"` 不再出现。
8. 断点双轨：移除 `variables.styl` 中零消费的 `--m3e-bp-*` CSS 变量，`styles/breakpoints.styl` 成为断点唯一来源。
9. MDX 集成移除（全站纯 .md）：astro.config 集成、`@astrojs/mdx` 依赖（33 个依赖总量 34 → 33）、`content.config.ts` 的 `.mdx` glob、`feed.ts` 的 MDX 预清洗分支同步删除。
10. `pnpm type-check` 修复至全绿：修复 6 个文件中 11 处存量 `--isolatedDeclarations` 错误（constants/content-utils/motion/setting-utils/url-utils/两个 EC 插件补类型注解）；`content.config.ts` 的推断类型不可发射且不可注解（注解会令 astro 的 `CollectionEntry` data 类型退化为 unknown），故 type-check 脚本不再启用 `--isolatedDeclarations` 标志（见 `src/content.config.ts` 头注）。
11. **Expressive Code 整体移除，改用 Astro 内置 Shiki**：删除 `astro-expressive-code` + `@expressive-code/*`（4 依赖）、`src/plugins/expressive-code/`（复制按钮/语言徽标插件）、`config/expressiveCodeConfig.ts` + `types/config.ts` 的 EC 类型、`markdown-runtime/code-collapse/code-copy`（代码块折叠与复制运行时）、`styles/markdown/expressive-code.css`；`astro.config.mjs` 改配 `markdown.shikiConfig`（github-light/github-dark 双主题），代码块视觉由新建 `styles/markdown/astro-code.css` 承接（站点令牌 + 暗色变量切换）。功能变化：代码块折叠、复制按钮、语言徽标、行号随 EC 移除。
12. **qrcode / markdown-it / sanitize-html 移除**（6 项中的后 3 个依赖，共 18 个生产依赖）：分享海报的二维码改为海报内嵌文章 URL 文本（`share-poster.ts` 页脚重排）；RSS/Atom 正文由 markdown-it HTML 渲染改为 `markdownToPlainText` 纯文本（Atom `<content type="text">`）；`types/vendor.d.ts` 随之删除；失效 i18n key（`codeBlockExpand/codeBlockCollapse/scanToRead`）同步移除（201 → 198 key）。
12. **文章加密功能整体移除**（相册密码保护当时保留）：删除 EncryptedContent/ProtectedPost 组件与 post-encryption/post-decryption 工具；content schema 移除 encrypted/password/passwordHint/hideHomeContent 四字段；posts 页/双 PostCard/feed/llms 端点/fab-controller（`shirone:toc-synced` 监听）随之简化；PasswordGate 收敛为相册专用（post: 分支与 9 个 postPassword* key 移除）；i18n 213 → 201 key。
13. **相册功能与 i18n 精简（仅留中/英）**：相册两页（索引/详情）、AlbumSection/AlbumGallery/AlbumCard、PasswordGate/ProtectedAlbum、album-scanner/password-protection/protected-session、types/album 与 types/protectedContent 整体移除（含导航入口与 `SidebarPage` `albums` 标识）；i18n 仅保留中文与英语（8 个语言文件删除，translation map 收敛，15 个相册 key 移除，201 → 186 key）。
14. **@fancyapps/ui 替换为原生灯箱**：分析确认 Fancybox 仅用于图片查看，且 `.image-grid`/`data-fancybox` 选择器已无 markup 生产者（活路径仅文章图片轮播 + 相册单图打开）。新增 `utils/lightbox.ts`（约 12KB chunk）+ `lightbox-runtime.ts` + `styles/lightbox.css`，以 document 级点击委托实现无限轮播/缩放捏合/旋转翻转/缩略图/全屏/自动播放/拖拽关闭/键盘等全量能力；删除 fancybox 三文件与 `fancybox-custom.css`，`post-decryption` 简化（委托免重绑）；i18n 新增 15 个灯箱控件 key（198 → 213）。
15. **2026-08-30 死代码清尾**（本日复核「import 边表 + 全库 grep + dist 产物验证」三通道后处理，处理后 `pnpm build`（17 页 + Pagefind）、`pnpm check`、`pnpm type-check`、`node --test` 全绿）：
    - 整文件删除 `styles/scrollbar.css`（overlayscrollbars 已随 c89f584d 移除，`.os-scrollbar*` 类无生产者）与 `styles/markdown/disclosures.css`（`.m3-disclosure*` 类无生产者）；
    - `markdown.css` 删除无生产者的 `.anchor`/`.anchor-icon`（标题锚点随旧 Markdown 系统移除）、`.markdown-table-scroll` 两个规则块（滚动包装容器由已删的 Markdown 运行时 JS 生成）与 `a:not(.no-styling)` 的 `.no-styling` 限定（选择器简化为 `a`）；连带删除 variables.css 的 `--scrollbar-bg` 变量族（9 个）；
    - variables.css 删除零消费令牌：`--admonitions-color-*`（5，提示块语法已移除）、`--display-light-icon`/`--display-dark-icon`、`--deep-text`、`--title-active`、`--line-color`、`--meta-divider`、`--link-active`、`--enter-btn-bg-active`、`--toc-width`、`--m3e-easing-emphasized`、`--m3e-elevation-5`、`--font-body`/`--font-cjk`（font-faces.css，字体系统遗留）与 8 个 M3 调色板兜底令牌（`--inverse-primary`/`--surface-bright`/`--surface-variant`/`--on-error`/`--on-error-container`/`--primary-fixed`/`--on-primary-fixed`/`--surface-tint`）；`main.css` 删除 `.toc-hide`/`.toc-not-ready`、`.text-30`/`.text-25` 工具类与 Expressive Code 残留注释；
    - 同步瘦身 mc-utils/theme-utils：运行时 `--mc-*` 写入由 51 个角色收敛为样式表实际消费的 29 个（Fixed/*Dim/surfaceVariant/surfaceBright/surfaceTint/inversePrimary/onError 等写入端全部移除）；
    - i18n 删除 17 个死 key（186 → 169）：anime 数据源状态 7 个、旧相册/旧灯箱 5 个（openImage/previousImage/nextImage/backToGrid/viewOriginal）、recentPosts/untitled/formulaScrollable（KaTeX 残留）/resetConfirmTitle/resetConfirmMessage；
    - `date-utils.ts` 删除 `formatDateToYYYYMMDDHHmm`（「社交式短内容」功能遗留）；删除 `LAYOUT_MODE_CHANGE_EVENT` 死事件链路（layout-mode.ts 常量 + DisplaySettings 派发，全站无监听方）；`pagefind.yml` 移除 katex 遗留排除选择器。

## 10. 维护守则（新文件落位规则）

1. **新增站点配置**：`src/types/<domain>Config.ts`（契约）+ `src/config/<domain>Config.ts`（值 + resolve 函数）；仅当无循环依赖风险时才加入 `config/index.ts` barrel——凡消费 i18n 或反向依赖组件的配置（如 navBar/announcement）必须直连。
2. **新增页面数据**：纯内容进 `src/data/`，行为开关进 `src/config/`，用 `utils/feature-data.ts` 模式合流；页面读合流结果，enable=false 时重定向 /404/。
3. **新增组件**：视觉原语 → atoms（优先复用现有 M3E 件，勿再造）；取数+i18n+props 整形 → molecules；区块装配 → organisms；落位后跑一次消费链检查（避免再造死代码）。
4. **新增 UI 文案**：先在 `i18nKey.ts` 加 enum 成员，再同步中/英两个语言文件（缺一处 `astro check` 会报错）。
5. **新增客户端重初始化逻辑**：跨组件通信用 window/document 自定义事件（见 §6.5 事件表），勿直接互引。
6. **新增图标**：Svelte 组件写 `import Icon from "@iconify/svelte"`；.astro 写 astro-icon；用完重跑 `pnpm icons:generate`（dev/build 自动）。
7. **新增文章**：放 `src/content/posts/`，仅支持 `.md`（MDX 已移除）；frontmatter 契约见 `content.config.ts` 与 [frontmatter.md](./frontmatter.md)（文章加密已移除，如需私密内容用 draft 或 llms exclude 黑名单）。
8. **改断点**：各组件媒体查询以内联字面像素维护（对齐 Tailwind 默认断点：sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536）；断点常量文件已随 Stylus 移除，如需集中管理可新建 TS 常量。
9. **`content.config.ts` 勿加类型注解**：astro 由其推断类型派生 `CollectionEntry` 的 data 类型，注解会使 `post.data` 退化为 unknown（详见文件头注）。
10. **删除文件前**：先查它是否是 §6.4 图标 alias、ConfigCarrier、`data-sidebar-pages` 这类「隐形单向依赖」的一端；import 边表（`grep -rE "from" src`）+ 全仓组件名字符串双查。
12. **代码块**：语法高亮为 Astro 内置 Shiki（`astro.config.mjs` 的 `markdown.shikiConfig`，github 双主题），站点视觉统一在 `styles/markdown/astro-code.css`（暗色经 `--shiki-dark` 变量切换）；无复制/折叠/行号/语言徽标功能（随 Expressive Code 移除）。
