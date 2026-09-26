/**
 * 配置统一出口（barrel）：消费方一律 `import { xxx } from "@/config"`。
 *
 * - 值放在 `src/config/<domain>Config.ts`，类型放在 `src/types/<domain>Config.ts`；
 * - 存在反向依赖的模块（如 i18n/translation.ts 依赖 siteConfig）只允许从
 *   具体文件导入（`@/config/siteConfig`），禁止走本 barrel，避免循环依赖。
 */

export {
	articleConfig,
	resolveArticleDiscoveryOptions,
	resolveArticleShareOptions,
	resolveLastUpdatedNoticeOptions,
} from "./articleConfig";
export { fabConfig } from "./fabConfig";
export { footerConfig } from "./footerConfig";
export { imageBloomConfig } from "./imageBloomConfig";
export { licenseConfig } from "./licenseConfig";
export { llmsConfig } from "./llmsConfig";
export { profileConfig } from "./profileConfig";
export {
	getDefaultSpec,
	getDefaultStyle,
	resolveDisplaySettings,
	resolveTextureOptions,
	siteConfig,
} from "./siteConfig";
