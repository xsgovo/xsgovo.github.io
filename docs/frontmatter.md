# 文章 Frontmatter 用法指南

> 基于 2026-09-03 的 frontmatter 契约（`src/content.config.ts`，9 个作者字段）与全仓消费链路梳理编写。
> 字段在生产者/消费者关系中的位置见 [architecture.md](./architecture.md) §6.1，生成脚本见 [scripts.md](./scripts.md)。

---

## 1. 快速开始

```bash
pnpm new-post <文件名>          # 或 npm run new-post -- <文件名>
```

脚本会在 `src/content/posts/` 下生成携带**全部字段的模板**（`scripts/new-post.js`），标题取自文件名（去扩展名）。生成后改值即可：

```yaml
---
title: Windows 配置 Python 环境——从安装到项目管理
published: 2026-04-09
updated: 2026-04-09
pinned: false
draft: false
description: "在 Windows 上从零开始配置 Python 开发环境。"
image: ''
tags: [Python, Windows, 开发环境]
category: "Backend"
---
```

也可以不经过脚本，直接在 `src/content/posts/` 手写 `.md` 文件——除 `title` 与 `published` 外所有字段都有默认值，最小合法 frontmatter 只有两行：

```yaml
---
title: 最小示例
published: 2026-09-03
---
```

---

## 2. 字段总览

契约定义在 `src/content.config.ts`（zod schema，构建期校验，不合法直接构建失败）：

| 字段 | 类型 | 必填 | 默认值 | 作用 |
|---|---|---|---|---|
| `title` | `string` | ✅ | — | 文章标题，全站展示与 SEO 主字段 |
| `published` | `date` | ✅ | — | 发布日期，排序与各处时间展示的基准 |
| `updated` | `date` | ❌ | — | 最后更新日期，影响"最近更新"提示与 dateModified |
| `pinned` | `boolean` | ❌ | `false` | 置顶：排序第一优先级 + 卡片徽标 |
| `draft` | `boolean` | ❌ | `false` | 草稿：生产构建整体排除，dev 下可见 |
| `description` | `string` | ❌ | `""` | 摘要：SEO meta、卡片摘要、RSS、llms.txt |
| `image` | `string` | ❌ | `""` | 封面图：文章头图与卡片封面 |
| `tags` | `string[]` | ❌ | `[]` | 标签：标签页、归档筛选、相关文章推荐 |
| `category` | `string` | ❌ | `""` | 单分类：分类页与导航高亮（留空 = 未分类） |

> 除以上 9 个字段外，`remark-reading-time` 插件会在构建期向 `remarkPluginFrontmatter` 注入 `words`（字数）与 `minutes`（阅读分钟数）——它们**不是 frontmatter 字段、不可手写**，由正文自动计算，用于文章页字数/时长展示与站点统计（`src/plugins/remark-reading-time.mjs`）。

---

## 3. 字段详解与消费链路

### `title`

唯一必填的展示字段。消费方：文章页 `<title>` 与 Banner、上/下篇导航的标题、卡片标题、归档面板、Feed 引导页、RSS/Atom、llms.txt、侧栏日历、JSON-LD `headline`。

### `published`

排序的二级键：`pinned` 优先，其后按 `published` **新文章在前**（`src/utils/content-utils.ts`）。消费方：

- 文章页 Banner 日期、License 署名日期
- JSON-LD `datePublished`
- RSS/Atom `pubDate`
- 侧栏日历按日聚合、归档面板按年分组
- 站点统计的「开博天数」（最早发布日）与「最近动态」

### `updated`

可选。未填时各消费点回退 `published`（如 [...slug].astro 的 `effectiveUpdatedDate`）。消费方：

- 文章页「最近更新」提示条（`LastUpdatedNotice`，受 `articleConfig` 中最小天数门槛控制——低于门槛的更新不提示）
- JSON-LD `dateModified`
- 卡片上的更新日期（与发布日期并列展示）
- RSS/Atom `updated`
- 站点统计「最近动态」

> 语义约定：仅内容实质变更时手动推进该字段；`pnpm new-post` 生成的模板将其初始化为发布当日。

### `pinned`

`true` 的文章在所有列表（首页、归档等）中排在最前，卡片标题旁显示「置顶」徽标（i18n key `pinned`）。多个置顶文章之间仍按 `published` 倒序。

### `draft`

过滤发生在数据中枢层（`getSortedPosts` / `getTagList` / `getCategoryList`，`import.meta.env.PROD` 时排除 `draft: true`），因此**所有下游一并生效**：页面路由、RSS、llms.txt、日历、统计、归档——草稿在生产构建中不留任何痕迹。`pnpm dev` 下草稿正常可见，便于预览。

### `description`

一句话摘要，同时服务 SEO 与列表展示：

- `<meta name="description">`、`og:description`、`twitter:description`（为空时回退页面标题）
- JSON-LD `description`（为空时回退标题）
- 卡片摘要（**为空时卡片不显示摘要行**——2026-09-03 起不再有正文首段兜底）
- RSS/Atom `description`、llms.txt 列表条目

### `image`

封面图，支持三种路径形态（解析逻辑见 `src/utils/asset-utils.ts`）：

| 形态 | 示例 | 解析方式 |
|---|---|---|
| 相对路径 | `cover.webp` | 相对**文章文件所在目录**解析（文章同目录放图即可），经 `import.meta.glob` 静态收集，自动获得宽高并生成 webp/avif srcset |
| 公开/远程 | `/images/x.webp`、`https://…`、`data:` | 原样使用（public 目录或外链） |
| 留空 | `''` | 文章页无头图，卡片无封面 |

消费方：文章页头图（`ImageWrapper`，同时作为灯箱封面选择器 `#post-cover img` 的锚点）、卡片封面（`src/components/organisms/PostCard.astro`）。文件缺失时回退原始路径字符串（不会构建失败，但图裂）。

### `tags`

数组。消费方：标签页与标签云（`getTagList` 统计）、归档面板筛选、卡片/文章元信息中的标签链接、JSON-LD `keywords`、RSS、相关文章推荐（每个共享标签按稀有度加权计分，标签越稀有得分越高，`src/utils/article-discovery.ts`）、llms.txt 的 `excludeTags` 隐私黑名单（`src/config` → llmsConfig）。

### `category`

**单值**（本站无多分类）。留空 `''` 或不写即「未分类」（i18n key `uncategorized`，分类列表中单独计数）。消费方：分类页与分类导航条 `CategoryBar` 的当前文弱高亮、归档面板筛选、卡片/文章元信息的分类链接、RSS `category`、相关文章推荐（同分类加权）、llms.txt 的 `excludeCategories` 黑名单。

---

## 4. 输出口可见性矩阵

| 字段 | 文章页 | 卡片/列表 | RSS·Atom | llms.txt | JSON-LD | 归档·日历·统计 |
|---|---|---|---|---|---|---|
| `title` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `published` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `updated` | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| `pinned` | — | ✅ | — | — | — | — |
| `draft` | 🚫 过滤 | 🚫 过滤 | 🚫 过滤 | 🚫 过滤 | — | 🚫 过滤 |
| `description` | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `image` | ✅ | ✅ | — | — | — | — |
| `tags` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `category` | ✅ | ✅ | ✅ | ✅ | — | ✅ |

> 草稿过滤在数据层完成（见 §3 `draft`），矩阵中标记 🚫 的输出口自动继承。

---

## 5. 注意事项（避坑）

1. **日期不要加引号**：schema 是 `z.date()`，YAML 的 `published: 2026-04-09`（裸值）会被解析为 Date 对象；写成 `"2026-04-09"` 是字符串，构建期校验直接报错。
2. **`category` 不要写 `null`**：nullable 已移除，留空请用 `''` 或干脆省略该行。
3. **`tags` 用 YAML 行内数组**：`tags: [a, b, c]`；含逗号/特殊字符的标签给单个值加引号。
4. **文件名即 URL**：文章支持子目录（glob `**/*.md`），`id`（去扩展名路径）直接决定 `/posts/<id>/` 路由，文件名避免随意改动（外链会失效）。
5. **未知字段会被静默丢弃**：schema 之外的键不参与渲染（历史上 `lang` 等已移除，勿再手写）。
6. **`spec/` 集合无 frontmatter 契约**：`content.spec`（about 页）schema 为空对象，`src/content/spec/about.md` 全文即正文。

---

## 6. 历史变更

- **2026-09-03**：移除 `lang` 字段及其 `<html lang>`/JSON-LD 覆盖链路、`prev/next` 四个运行时内部字段（上/下篇改为页面内直接查询）、excerpt 正文首段兜底插件；`category` 去掉 nullable。详见提交 `34096bc3`、`534476b9`、`00cd4e02`。
