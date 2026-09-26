import { unified } from "@astrojs/markdown-remark";
import { remarkReadingTime } from "../plugins/remark-reading-time.mjs";

/**
 * Astro 7 要求自定义插件经 `unified({...})` 传入 `markdown.processor`，
 * 不再支持 `markdown.remarkPlugins` 配置项。
 * 仅保留字数/阅读时长标准插件，其余走 Astro 默认管线。
 */
export const siteMarkdownProcessor = unified({
	remarkPlugins: [remarkReadingTime],
});
