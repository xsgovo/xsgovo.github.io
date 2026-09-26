import { closeLightbox, initLightboxDelegation, isLightboxOpen } from "./lightbox";

/**
 * 原生灯箱的全站生命周期门面。
 *
 * 灯箱走 document 级点击委托，一次绑定后对 Swup 换页、加密内容解密等
 * 新插入的图片天然生效，无需「清理-重绑」循环；这里只需保证：
 * - 尽早完成委托绑定（Layout 全局脚本调用 bindLightboxRuntime）；
 * - Swup 跳页时关闭仍打开的灯箱（避免覆盖层残留到新页面）。
 */

const RUNTIME_BOUND_KEY = "lightboxRuntimeBound";

function bindSwupClose(): void {
	const bind = () => {
		window.swup?.hooks.on("visit:start", () => {
			if (isLightboxOpen()) closeLightbox();
		});
	};

	if (window.swup?.hooks) bind();
	else document.addEventListener("swup:enable", bind, { once: true });
}

export function initLightboxRuntime(): void {
	initLightboxDelegation();
}

export function bindLightboxRuntime(): void {
	if (typeof document === "undefined") return;
	if (document.documentElement.dataset[RUNTIME_BOUND_KEY] === "true") return;
	document.documentElement.dataset[RUNTIME_BOUND_KEY] = "true";

	initLightboxRuntime();
	bindSwupClose();
}
