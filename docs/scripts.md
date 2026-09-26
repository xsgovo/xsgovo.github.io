# scripts/ 目录说明

> 基于 2026-08-29 对 `scripts/` 全部文件的逐行阅读。
> 每个脚本均为独立 Node 程序，除 Node 内置模块外**零外部依赖**。

## 调用关系总览

```
package.json scripts
├─ dev / start / build ──→ scripts/icons/generate-local-icons.mjs（构建前置，自动执行）
├─ icons:generate ────────→ scripts/icons/generate-local-icons.mjs
└─ anime:sync ────────────→ scripts/anime/sync.mjs（内部引用 providers/ 与 load-env.mjs）
```

---

## 1. `icons/generate-local-icons.mjs` — 图标离线化生成器

- **触发**：`pnpm icons:generate`；且 `dev` / `start` / `build` 的第一步都会自动执行。
- **输入**：全量扫描 `src/` 下的 `.astro` `.md` `.mdx` `.svelte` `.ts` `.tsx` 文件，提取形如 `prefix:name` 的图标引用（仅识别 5 个白名单前缀：`fa6-brands`、`fa6-regular`、`fa6-solid`、`material-symbols`、`simple-icons`；忽略 `xxx` 占位符）。
- **输出**：`src/generated/local-icon-collections.ts` — 把用到的图标数据（含 alias 链解析，带循环检测与未知图标报错）从 `node_modules/@iconify-json/<prefix>/icons.json` 抽出内联。
- **设计意图**：图标数据在构建期定稿并内联，运行时零 iconify 依赖、零网络请求。写文件采用临时文件 + rename 的原子写入。
- ⚠️ 新增图标引用后必须重跑（否则生成的集合缺图标，`Icon.svelte` 渲染不出）；`@iconify-json/*` 包仅此脚本消费。

## 2. `anime/` — 追番数据同步管道

### `anime/sync.mjs`（入口，196 行）

- **触发**：`pnpm anime:sync`，可选 `--provider bangumi|bilibili|all`。
- **provider 决策顺序**：CLI 参数 > `animeConfig.source.kind === "snapshot"` 指定的 provider > 遍历 `animeConfig.providers` 中已启用且填了有效 userId/vmid 的（全部无效则打印用法退出）。
- **流程**：拉取原始数据 → `src/utils/anime/normalize.ts` 清洗归一 → 排序 → 包成版本化快照（schemaVersion/fetchedAt/accountRef/items）→ **敏感凭据扫描**（正则匹配 SESSDATA/cookie/authorization/token/csrf，命中即抛错拒绝落盘）→ 临时文件 + rename 原子写入 `src/data/anime-snapshots/<provider>.json`。
- **产出消费方**：anime 页面走「快照模式」读取该 JSON（`src/utils/anime-data.ts`），构建期零外部 API 依赖；单个 provider 失败不影响其余，最终汇总退出码。

### `anime/load-env.mjs`（42 行）

手写的极简 `.env` 加载器（同步脚本无 dotenv 依赖）：忽略注释/无 `=` 行、去首尾引号、不覆盖已存在的环境变量。B 站私有追番列表的 `SESSDATA` 由此注入。

### `anime/providers/bangumi.mjs`

Bangumi（`api.bgm.tv`）收藏采集：覆盖 watching/completed/planned/onHold/dropped 五种状态，从条目 infobox 提取制作公司（兼容中繁英字段与数组值），带延时限速。

### `anime/providers/bilibili.mjs`

B 站追番采集：按 follow_status 分页拉取（每页 10–50、上限可配），可选 `SESSDATA` Cookie（隐私/鉴权错误 53013/-400/-401 时给出提示）；封面图下载到 `public/assets/anime/covers/bili_<id>.webp|png`（带 Referer 与 10s 超时，失败降级为不落封面），快照里存本地路径。

---

## 备注

- `src/utils/anime-data.ts` 注释中写的 `scripts/anime-sync.mjs` 是旧路径，实际入口为 `scripts/anime/sync.mjs`。
- 组件清单校验（`check-manifest.mjs`）、设计规范 lint（`check-design.mjs`）已于 2026-08-29 删除；`src/components/atoms/manifest.json` 与各级 `AGENTS.md` 约束文档一并清除。新建文章脚本 `new-post.js` 已于 2026-09-03 重建（`pnpm new-post`，生成完整 frontmatter 模板，用法见 [frontmatter.md](./frontmatter.md)）。
- 曾经存在的 `fonts/`（字体子集化）、`lighthouse/`、`perf/`、`check-markdown-manifest.mjs`、`check-skills.mjs`、`package-skills.mjs` 已随对应系统移除（见 `docs/dependencies.md` 清理历程）。
