import { fileURLToPath } from "node:url";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import { pluginFramesTexts } from "@expressive-code/plugin-frames";
import expressiveCode from "astro-expressive-code";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import swup from "@swup/astro";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import icon from "astro-icon";
import { siteConfig } from "./src/config/siteConfig.ts";
import { siteMarkdownProcessor } from "./src/utils/markdown-processor.mjs";

// 代码块复制按钮（frames 插件提供）的界面文案：站点主语言中文，全局覆盖
pluginFramesTexts.overrideTexts("zh-CN", {
	copyButtonTooltip: "复制代码",
	copyButtonCopied: "已复制",
});

const isBuildCommand = process.argv.includes("build");
const isDevCommand = process.argv.includes("dev");
const iconifyOfflineIconPath = fileURLToPath(
	new URL(
		"./node_modules/@iconify/svelte/dist/OfflineIcon.svelte",
		import.meta.url,
	),
);
const iconifyOfflineFunctionsPath = fileURLToPath(
	new URL(
		"./node_modules/@iconify/svelte/dist/offline-functions.js",
		import.meta.url,
	),
);

// https://astro.build/config
export default defineConfig({
	site: siteConfig.site,
	base: siteConfig.base ?? "/",
	trailingSlash: "always",
	integrations: [
		// 代码块渲染（语法高亮/行号/复制按钮）完全交给 Expressive Code：
		// 集成检测到 unified 工厂 processor 后会自动把 rehype 插件推入
		// siteMarkdownProcessor.options.rehypePlugins，并关闭内置 Shiki。
		// 注意：修改下方任何配置后，需删除 .astro/、node_modules/.astro/ 与
		// node_modules/.vite/ 缓存再构建（content layer 会沿用旧渲染 HTML，
		// 导致页面里的 EC 样式链接与实际产物脱节而 404、布局全丢），
		// 浏览器端还需硬刷新（旧 HTML 缓存会引用已不存在的样式文件）。
		expressiveCode({
			// 双主题语法色与原内置 Shiki 一致（暗色经 html.dark 切换）
			themes: ["github-light", "github-dark"],
			// 站点是手动切换明暗（html.dark），禁用系统偏好 media query，改用选择器：
			// EC 会把返回值拼到 ":root" 与 "&"（代码块自身）之间，".dark" 生成 ":root.dark &"
			useDarkModeMediaQuery: false,
			themeCssSelector: (theme) => (theme.type === "dark" ? ".dark" : ""),
			defaultLocale: "zh-CN",
			plugins: [pluginLineNumbers()],
			// 全局长行换行（对齐原内置 Shiki 的 wrap: true 行为）
			defaultProps: { wrap: true },
			// 站点化样式：对齐原 .astro-code 的视觉规格，颜色走 Shirone 令牌。
			// frames 的标题栏/编辑器/终端背景统一为 --codeblock-bg（原站为单一背景色）。
			styleOverrides: {
				borderRadius: "0.75rem",
				borderWidth: "0px",
				codeBackground: "var(--codeblock-bg)",
				codeFontSize: "0.875rem",
				codeLineHeight: "1.5rem",
				codePaddingBlock: "1rem",
				codePaddingInline: "1.25rem",
				frames: {
					editorBackground: "var(--codeblock-bg)",
					editorTabBarBackground: "var(--codeblock-bg)",
					editorTabBarBorderColor: "var(--codeblock-bg)",
					terminalBackground: "var(--codeblock-bg)",
				},
			},
		}),
		swup({
			theme: false,
			ignore: 'a[href="#"]',
			animationClass: "transition-swup-",
			containers: ["main", "#toc"],
			smoothScrolling: true,
			cache: true,
			preload: true,
			accessibility: true,
			updateHead: {
				awaitAssets: false,
				// 在 Swup 访问（跳转）之间保留基础样式，但语法作用域样式
				// 会在目标页面不再声明时随之消失。
				persistTags:
					"link[rel=stylesheet]:not([data-swup-optional]), style:not([data-swup-optional])",
			},
			updateBodyClass: false,
			globalInstance: true,
			animateHistoryBrowsing: false,
			skipPopStateHandling: (event) => Boolean(event.state?.url?.includes("#")),
		}),
		icon(),
		svelte({
			compilerOptions: {
				// 开发环境不设置，让插件用默认的基于文件名的哈希；生产构建再用自定义的基于内容的哈希
				cssHash: isBuildCommand ? ({ css, hash }) => `svelte-${hash(css)}` : undefined,
				warningFilter: () => !isDevCommand,
			},
		}),
		sitemap(),
	],
	markdown: {
		processor: siteMarkdownProcessor,
		// 关闭 Astro 内置 Shiki 语法高亮，代码块处理完全交给 Expressive Code
		syntaxHighlight: false,
	},
	vite: {
		resolve: {
			alias: [
				{
					find: "@shirone/iconify-offline",
					replacement: iconifyOfflineIconPath,
				},
				{
					find: "@shirone/iconify-offline-functions",
					replacement: iconifyOfflineFunctionsPath,
				},
				{
					find: /^@iconify\/svelte$/,
					replacement: fileURLToPath(
						new URL(
							"./src/components/atoms/display/Icon.svelte",
							import.meta.url,
						),
					),
				},
			],
		},
		plugins: [tailwindcss()],
		build: {
			minify: "esbuild",
			cssCodeSplit: true,
			cssMinify: "esbuild",
			chunkSizeWarningLimit: 1000,
			esbuild: isBuildCommand
				? {
						drop: ["debugger"],
						pure: ["console.log", "console.debug"],
					}
				: undefined,
			rollupOptions: {
				onwarn(warning, warn) {
					if (
						warning.message.includes("is dynamically imported by") &&
						warning.message.includes("but also statically imported by")
					) {
						return;
					}
					warn(warning);
				},
			},
		},
	},
});
