/**
 * Tonal Bloom 工具函数：根据配置计算并输出内联 CSS 变量与占位参数。
 */
import { imageBloomConfig } from "@/config/imageBloomConfig";

export function getBloomInlineVars(): string {
	const { enable, blurRadius, opacity, transitionDuration } = imageBloomConfig;
	if (!enable) return "";
	return [
		`--image-bloom-blur: ${blurRadius ?? 20}px`,
		`--image-bloom-opacity: ${opacity ?? 0.7}`,
		`--image-bloom-duration: ${transitionDuration ?? 300}ms`,
	].join("; ");
}
