/**
 * 原生图片灯箱（Material 3 风格）——替代 @fancyapps/ui Fancybox。
 *
 * 能力集（对齐原 Fancybox 使用面）：
 * - 无限轮播 + 计数器 + 说明文字（取自 img alt）
 * - 缩放：滚轮/双击以光标为中心缩放（1–3x）、触摸捏合；缩放态拖拽平移
 * - 旋转/翻转/重置、1:1 切换、自动播放
 * - 缩略图条（可点跳转）、全屏
 * - 未缩放时横向滑动翻页、纵向拖拽关闭
 * - 键盘：Esc/Delete/Backspace 关闭；方向键/PageUp/PageDown 翻页
 *
 * 通过 document 级点击委托绑定（一次绑定全站生效，Swup 换页与加密内容
 * 解密后无需重绑），并提供 openLightbox() 供编程式打开（相册「查看原图」）。
 */

import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { prefersReducedMotion } from "./motion";
// 静态引入灯箱样式：随本 chunk 按需加载（纯 CSS 动态导入在构建产物中不会被发射）
import "../styles/lightbox.css";

export interface LightboxItem {
	src: string;
	caption?: string;
}

/** 文章正文图片与封面：整篇作为一个轮播组 */
const ARTICLE_IMAGES = ".custom-md img, #post-cover img";
/** 通用分组钩子：同名 data-fancybox 值聚合为一个轮播组 */
const GROUP_ATTR = "[data-fancybox]";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SWIPE_THRESHOLD = 60;
const DRAG_CLOSE_THRESHOLD = 90;
const SLIDESHOW_INTERVAL = 3500;

/* ------------------------------------------------------------------ */
/* 内联 SVG 图标（24px，线性风格）                                       */
/* ------------------------------------------------------------------ */

const S = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const F = 'fill="currentColor" stroke="none"';

const ICONS: Record<string, string> = {
	close: `<path ${S} d="M6 6l12 12M18 6L6 18"/>`,
	prev: `<path ${S} d="M15 5l-7 7 7 7"/>`,
	next: `<path ${S} d="M9 5l7 7-7 7"/>`,
	zoomIn: `<circle ${S} cx="11" cy="11" r="7"/><path ${S} d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>`,
	zoomOut: `<circle ${S} cx="11" cy="11" r="7"/><path ${S} d="M21 21l-4.3-4.3M8 11h6"/>`,
	oneToOne: `<path ${S} d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><text x="12" y="15" text-anchor="middle" font-size="7.5" ${F}>1:1</text>`,
	rotateCCW: `<path ${S} d="M3 5v5h5M3.5 10a9 9 0 1 1-.5 4"/>`,
	rotateCW: `<path ${S} d="M21 5v5h-5M20.5 10a9 9 0 1 0 .5 4"/>`,
	flipX: `<path ${S} d="M12 3v18M8 8l-4 4 4 4M16 8l4 4-4 4"/>`,
	flipY: `<path ${S} d="M3 12h18M8 8l4-4 4 4M8 16l4 4 4-4"/>`,
	reset: `<path ${S} d="M3 7v6h6M21 17a9 9 0 0 0-15.5-6.4L3 13"/>`,
	fullscreen: `<path ${S} d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>`,
	thumbs: `<path ${S} d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>`,
	play: `<path ${F} d="M8 5l12 7-12 7z"/>`,
	pause: `<path ${F} d="M7 5h3v14H7zM14 5h3v14h-3z"/>`,
};

function icon(name: string): string {
	return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ICONS[name]}</svg>`;
}

/* ------------------------------------------------------------------ */
/* 状态                                                                 */
/* ------------------------------------------------------------------ */

interface LightboxState {
	open: boolean;
	items: LightboxItem[];
	index: number;
	scale: number;
	rotation: number;
	flipX: number;
	flipY: number;
	panX: number;
	panY: number;
	thumbsVisible: boolean;
	playing: boolean;
	playTimer: ReturnType<typeof setInterval> | null;
	lastFocused: HTMLElement | null;
}

const state: LightboxState = {
	open: false,
	items: [],
	index: 0,
	scale: 1,
	rotation: 0,
	flipX: 1,
	flipY: 1,
	panX: 0,
	panY: 0,
	thumbsVisible: true,
	playing: false,
	playTimer: null,
	lastFocused: null,
};

/* ------------------------------------------------------------------ */
/* DOM（惰性构建、跨次打开复用；监听只挂一次）                              */
/* ------------------------------------------------------------------ */

interface LightboxDom {
	root: HTMLDivElement;
	stage: HTMLElement;
	stageInner: HTMLElement;
	kb: HTMLElement;
	imgs: [HTMLImageElement, HTMLImageElement];
	caption: HTMLElement;
	counter: HTMLElement;
	thumbs: HTMLElement;
	thumbsTrack: HTMLElement;
	closeBtn: HTMLButtonElement;
	playBtn: HTMLButtonElement;
	thumbsBtn: HTMLButtonElement;
}

let dom: LightboxDom | null = null;
let listenersAttached = false;
/** 当前展示图层（双图层交叉淡入淡出） */
let activeSlot: 0 | 1 = 0;
/** 切换令牌：快速连续翻页时丢弃过期的解码回调 */
let showToken = 0;

function currentImg(): HTMLImageElement | null {
	return dom?.imgs[activeSlot] ?? null;
}

function createButton(action: string, icon_: string, label: string): HTMLButtonElement {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "m3-lightbox__btn";
	btn.dataset.action = action;
	btn.setAttribute("aria-label", label);
	btn.title = label;
	btn.innerHTML = icon(icon_);
	return btn;
}

function attachListeners(box: LightboxDom): void {
	if (listenersAttached) return;
	listenersAttached = true;

	box.stage.addEventListener("click", onStageClick);
	box.stage.addEventListener("pointerdown", onPointerDown);
	box.stage.addEventListener("pointermove", onPointerMove);
	box.stage.addEventListener("pointerup", onPointerUp);
	box.stage.addEventListener("pointercancel", onPointerUp);
	box.stage.addEventListener("dblclick", onDoubleClick);
	box.root.addEventListener("wheel", onWheel, { passive: false });
	box.root.addEventListener("click", onActionClick);
}

function ensureDom(): LightboxDom {
	if (dom) return dom;

	const root = document.createElement("div");
	root.className = "m3-lightbox";
	root.hidden = true;
	root.setAttribute("role", "dialog");
	root.setAttribute("aria-modal", "true");
	root.setAttribute("aria-label", i18n(I18nKey.imageViewer));

	root.innerHTML = `
		<div class="m3-lightbox__backdrop"></div>
		<header class="m3-lightbox__toolbar">
			<span class="m3-lightbox__counter" aria-live="polite"></span>
			<div class="m3-lightbox__actions"></div>
		</header>
		<div class="m3-lightbox__stage">
			<div class="m3-lightbox__stage-inner">
				<div class="m3-lightbox__kb">
					<img class="m3-lightbox__img" alt="" draggable="false">
					<img class="m3-lightbox__img" alt="" draggable="false">
				</div>
			</div>
		</div>
		<button type="button" class="m3-lightbox__nav m3-lightbox__nav--prev" data-action="prev"></button>
		<button type="button" class="m3-lightbox__nav m3-lightbox__nav--next" data-action="next"></button>
		<figcaption class="m3-lightbox__caption"></figcaption>
		<div class="m3-lightbox__thumbs"><div class="m3-lightbox__thumbs-track"></div></div>
	`;

	const actions = root.querySelector<HTMLElement>(".m3-lightbox__actions")!;
	actions.append(
		createButton("zoomIn", "zoomIn", i18n(I18nKey.lightboxZoomIn)),
		createButton("zoomOut", "zoomOut", i18n(I18nKey.lightboxZoomOut)),
		createButton("oneToOne", "oneToOne", i18n(I18nKey.lightboxOneToOne)),
		createButton("rotateCCW", "rotateCCW", i18n(I18nKey.lightboxRotateCCW)),
		createButton("rotateCW", "rotateCW", i18n(I18nKey.lightboxRotateCW)),
		createButton("flipX", "flipX", i18n(I18nKey.lightboxFlipX)),
		createButton("flipY", "flipY", i18n(I18nKey.lightboxFlipY)),
		createButton("reset", "reset", i18n(I18nKey.lightboxReset)),
		createButton("play", "play", i18n(I18nKey.lightboxPlay)),
		createButton("fullscreen", "fullscreen", i18n(I18nKey.lightboxFullscreen)),
		createButton("thumbs", "thumbs", i18n(I18nKey.lightboxThumbs)),
		createButton("close", "close", i18n(I18nKey.lightboxClose)),
	);

	const prevBtn = root.querySelector<HTMLButtonElement>(".m3-lightbox__nav--prev")!;
	const nextBtn = root.querySelector<HTMLButtonElement>(".m3-lightbox__nav--next")!;
	prevBtn.innerHTML = icon("prev");
	nextBtn.innerHTML = icon("next");
	prevBtn.setAttribute("aria-label", i18n(I18nKey.lightboxPrev));
	nextBtn.setAttribute("aria-label", i18n(I18nKey.lightboxNext));

	dom = {
		root,
		stage: root.querySelector<HTMLElement>(".m3-lightbox__stage")!,
		stageInner: root.querySelector<HTMLElement>(".m3-lightbox__stage-inner")!,
		kb: root.querySelector<HTMLElement>(".m3-lightbox__kb")!,
		imgs: [
			root.querySelectorAll<HTMLImageElement>(".m3-lightbox__img")[0],
			root.querySelectorAll<HTMLImageElement>(".m3-lightbox__img")[1],
		],
		caption: root.querySelector<HTMLElement>(".m3-lightbox__caption")!,
		counter: root.querySelector<HTMLElement>(".m3-lightbox__counter")!,
		thumbs: root.querySelector<HTMLElement>(".m3-lightbox__thumbs")!,
		thumbsTrack: root.querySelector<HTMLElement>(".m3-lightbox__thumbs-track")!,
		closeBtn: actions.querySelector<HTMLButtonElement>('[data-action="close"]')!,
		playBtn: actions.querySelector<HTMLButtonElement>('[data-action="play"]')!,
		thumbsBtn: actions.querySelector<HTMLButtonElement>('[data-action="thumbs"]')!,
	};

	document.body.append(root);
	attachListeners(dom);
	return dom;
}

/* ------------------------------------------------------------------ */
/* 变换                                                                 */
/* ------------------------------------------------------------------ */

function applyTransform(): void {
	const img = currentImg();
	if (!img) return;
	img.style.transform =
		`translate(${state.panX}px, ${state.panY}px) scale(${state.scale}) ` +
		`rotate(${state.rotation}deg) scaleX(${state.flipX}) scaleY(${state.flipY})`;
	img.classList.toggle("is-zoomed", state.scale > 1);
}

function resetTransform(): void {
	state.scale = 1;
	state.rotation = 0;
	state.flipX = 1;
	state.flipY = 1;
	state.panX = 0;
	state.panY = 0;
	applyTransform();
}

function clampScale(scale: number): number {
	return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** 以视口内某点（clientX/Y）为锚缩放，保持锚点下的图像内容不动 */
function zoomAt(clientX: number, clientY: number, nextScale: number): void {
	if (!dom) return;
	// 用户手动缩放即接管画面，停止 Ken Burns 慢放
	cancelKenBurns();
	const rect = dom.stage.getBoundingClientRect();
	const centerX = rect.left + rect.width / 2;
	const centerY = rect.top + rect.height / 2;
	const next = clampScale(nextScale);
	if (next === state.scale) return;
	const ratio = next / state.scale;
	state.panX = clientX - centerX - (clientX - centerX - state.panX) * ratio;
	state.panY = clientY - centerY - (clientY - centerY - state.panY) * ratio;
	state.scale = next;
	if (state.scale === MIN_SCALE) {
		state.panX = 0;
		state.panY = 0;
	}
	applyTransform();
}

function zoomToCentered(nextScale: number): void {
	if (!dom) return;
	const rect = dom.stage.getBoundingClientRect();
	zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, nextScale);
}

/* ------------------------------------------------------------------ */
/* 导航与渲染                                                           */
/* ------------------------------------------------------------------ */

function preloadNeighbors(): void {
	const { items, index } = state;
	for (const offset of [-2, -1, 1, 2]) {
		const item = items[(index + offset + items.length) % items.length];
		if (!item) continue;
		const image = new Image();
		image.src = item.src;
	}
}

function renderThumbs(): void {
	const box = dom;
	if (!box) return;
	box.thumbsTrack.replaceChildren();
	state.items.forEach((item, index) => {
		const thumb = document.createElement("button");
		thumb.type = "button";
		thumb.className = "m3-lightbox__thumb";
		thumb.setAttribute("aria-label", String(index + 1));
		const image = document.createElement("img");
		image.loading = "lazy";
		image.src = item.src;
		image.alt = "";
		image.draggable = false;
		thumb.append(image);
		thumb.addEventListener("click", () => goTo(index));
		box.thumbsTrack.append(thumb);
	});
}

function syncThumbs(): void {
	if (!dom) return;
	Array.from(dom.thumbsTrack.children).forEach((thumb, index) => {
		thumb.classList.toggle("is-active", index === state.index);
	});
	dom.thumbsTrack.children[state.index]?.scrollIntoView({
		behavior: prefersReducedMotion() ? "auto" : "smooth",
		inline: "center",
		block: "nearest",
	});
}

function renderMeta(): void {
	if (!dom) return;
	const item = state.items[state.index];
	if (!item) return;
	dom.counter.textContent = `${state.index + 1} / ${state.items.length}`;
	dom.caption.textContent = item.caption ?? "";
	dom.caption.hidden = !item.caption;
	syncThumbs();
}

/** Ken Burns：展示期间以非线性缓动缓慢放大；用户交互（缩放/平移/旋转）时让位 */
function restartKenBurns(): void {
	if (!dom) return;
	dom.kb.classList.remove("is-animating");
	if (prefersReducedMotion()) return;
	void dom.kb.offsetWidth;
	dom.kb.classList.add("is-animating");
}

function cancelKenBurns(): void {
	dom?.kb.classList.remove("is-animating");
}

function show(index: number): void {
	const box = dom;
	if (!box) return;
	const item = state.items[index];
	if (!item) return;

	state.index = index;

	// 交叉淡入淡出：旧图冻结当前变换淡出，新图解码完成后淡入
	const prevImg = box.imgs[activeSlot];
	const nextImg = box.imgs[1 - activeSlot];
	prevImg.classList.remove("is-current");
	prevImg.alt = "";
	nextImg.classList.remove("is-current");
	nextImg.src = item.src;
	nextImg.alt = item.caption ?? "";
	activeSlot = activeSlot === 0 ? 1 : 0;

	state.scale = 1;
	state.rotation = 0;
	state.flipX = 1;
	state.flipY = 1;
	state.panX = 0;
	state.panY = 0;
	applyTransform();
	renderMeta();
	preloadNeighbors();
	restartKenBurns();

	const token = ++showToken;
	void nextImg
		.decode()
		.catch(() => {
			// 解码失败（如仍在加载）不阻塞展示，由加载完成事件自然呈现。
		})
		.finally(() => {
			if (token !== showToken) return;
			nextImg.classList.add("is-current");
		});
}

function goTo(index: number): void {
	const { items } = state;
	if (items.length === 0) return;
	const wrapped = (index + items.length) % items.length;
	if (wrapped === state.index) return;
	stopSlideshow();
	show(wrapped);
}

const next = (): void => goTo(state.index + 1);
const prev = (): void => goTo(state.index - 1);

/* ------------------------------------------------------------------ */
/* 自动播放                                                             */
/* ------------------------------------------------------------------ */

function stopSlideshow(): void {
	if (state.playTimer !== null) {
		clearInterval(state.playTimer);
		state.playTimer = null;
	}
	if (state.playing) {
		state.playing = false;
		if (dom) {
			dom.playBtn.replaceChildren();
			dom.playBtn.innerHTML = icon("play");
			dom.playBtn.setAttribute("aria-label", i18n(I18nKey.lightboxPlay));
		}
	}
}

function toggleSlideshow(): void {
	if (state.playing) {
		stopSlideshow();
		return;
	}
	if (!dom) return;
	state.playing = true;
	dom.playBtn.innerHTML = icon("pause");
	dom.playBtn.setAttribute("aria-label", i18n(I18nKey.lightboxPause));
	state.playTimer = setInterval(next, SLIDESHOW_INTERVAL);
}

/* ------------------------------------------------------------------ */
/* 打开 / 关闭                                                          */
/* ------------------------------------------------------------------ */

function syncToolbar(): void {
	if (!dom) return;
	dom.thumbs.classList.toggle("is-hidden", !state.thumbsVisible);
	dom.thumbsBtn.classList.toggle("is-active", state.thumbsVisible);
	dom.caption.classList.toggle("is-raised", state.thumbsVisible);
}

export function openLightbox(items: LightboxItem[], startIndex = 0): void {
	if (items.length === 0) return;
	const box = ensureDom();

	state.items = items;
	state.open = true;
	state.lastFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;
	state.thumbsVisible = items.length > 1;

	document.documentElement.classList.add("m3-lightbox-lock");
	box.root.classList.toggle("m3-lightbox--single", items.length === 1);
	box.root.hidden = false;
	// 强制回流后再挂 is-open，保证入场过渡生效
	void box.root.offsetWidth;
	box.root.classList.add("is-open");

	renderThumbs();
	syncToolbar();
	stopSlideshow();
	show(Math.min(Math.max(startIndex, 0), items.length - 1));
	box.closeBtn.focus({ preventScroll: true });
}

export function closeLightbox(): void {
	if (!state.open || !dom) return;
	state.open = false;
	stopSlideshow();
	if (document.fullscreenElement) {
		void document.exitFullscreen().catch(() => {});
	}

	const box = dom;
	box.root.classList.remove("is-open");
	document.documentElement.classList.remove("m3-lightbox-lock");

	const finish = () => {
		box.root.hidden = true;
		for (const img of box.imgs) img.classList.remove("is-current");
	};
	if (prefersReducedMotion()) finish();
	else setTimeout(finish, 220);

	state.lastFocused?.focus({ preventScroll: true });
	state.lastFocused = null;
}

export function isLightboxOpen(): boolean {
	return state.open;
}

/* ------------------------------------------------------------------ */
/* 手势（Pointer Events：滑动翻页/拖拽关闭、平移、捏合缩放）                */
/* ------------------------------------------------------------------ */

interface PointerTrack {
	x: number;
	y: number;
}

const activePointers = new Map<number, PointerTrack>();
let pinchStartDistance = 0;
let pinchStartScale = 1;
let dragStart: PointerTrack | null = null;
let dragMode: "pan" | "browse" | null = null;
let dragSuppressClick = false;

function pointerDistance(a: PointerTrack, b: PointerTrack): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function onPointerDown(event: PointerEvent): void {
	if (!state.open) return;
	dom?.stage.setPointerCapture(event.pointerId);
	activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

	if (activePointers.size === 2) {
		const [a, b] = [...activePointers.values()];
		pinchStartDistance = pointerDistance(a, b);
		pinchStartScale = state.scale;
		dragMode = null;
		dragStart = null;
		return;
	}
	if (activePointers.size === 1) {
		dragStart = { x: event.clientX, y: event.clientY };
		dragMode = state.scale > MIN_SCALE ? "pan" : "browse";
		dragSuppressClick = false;
	}
}

function onPointerMove(event: PointerEvent): void {
	if (!state.open || !dom) return;
	const previous = activePointers.get(event.pointerId);
	if (!previous) return;
	activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

	// 双指捏合：以中点为锚缩放
	if (activePointers.size === 2 && pinchStartDistance > 0) {
		const [a, b] = [...activePointers.values()];
		const midX = (a.x + b.x) / 2;
		const midY = (a.y + b.y) / 2;
		zoomAt(midX, midY, pinchStartScale * (pointerDistance(a, b) / pinchStartDistance));
		dragSuppressClick = true;
		return;
	}

	if (activePointers.size !== 1 || !dragStart || !dragMode) return;

	const dx = event.clientX - dragStart.x;
	const dy = event.clientY - dragStart.y;
	if (!dragSuppressClick && Math.hypot(dx, dy) > 8) dragSuppressClick = true;

	if (dragMode === "pan") {
		cancelKenBurns();
		state.panX += event.clientX - previous.x;
		state.panY += event.clientY - previous.y;
		applyTransform();
		return;
	}

	// 未缩放（浏览模式）：横向预览翻页位移、纵向拖拽关闭位移
	if (Math.abs(dx) >= Math.abs(dy)) {
		dom.stageInner.style.transform = `translateX(${dx * 0.35}px)`;
		dom.stageInner.style.opacity = String(1 - Math.min(Math.abs(dx) / 600, 0.4));
	} else {
		dom.stageInner.style.transform = `translateY(${dy * 0.4}px)`;
		dom.stageInner.style.opacity = String(1 - Math.min(Math.abs(dy) / 500, 0.6));
	}
}

function onPointerUp(event: PointerEvent): void {
	if (!state.open || !dom) return;
	const wasSingle = activePointers.size === 1;
	const start = dragStart;
	activePointers.delete(event.pointerId);

	if (activePointers.size > 0) {
		// 从捏合回落到单指：以剩余指为新一轮手势起点
		const [rest] = [...activePointers.values()];
		pinchStartDistance = 0;
		dragStart = rest ? { ...rest } : null;
		dragMode = state.scale > MIN_SCALE ? "pan" : "browse";
		return;
	}

	dom.stageInner.style.transform = "";
	dom.stageInner.style.opacity = "";

	if (wasSingle && start && dragMode === "browse") {
		const dx = event.clientX - start.x;
		const dy = event.clientY - start.y;
		if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
			if (dx < 0) next();
			else prev();
		} else if (Math.abs(dy) > DRAG_CLOSE_THRESHOLD && Math.abs(dy) >= Math.abs(dx)) {
			closeLightbox();
		}
	}

	dragStart = null;
	dragMode = null;
	pinchStartDistance = 0;
}

function onStageClick(event: MouseEvent): void {
	if (dragSuppressClick) {
		dragSuppressClick = false;
		return;
	}
	// 点击图片外的暗区关闭（与原 Fancybox 行为一致）
	if (event.target instanceof Element && !event.target.closest("img")) {
		closeLightbox();
	}
}

function onWheel(event: WheelEvent): void {
	if (!state.open) return;
	event.preventDefault();
	const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
	zoomAt(event.clientX, event.clientY, state.scale * factor);
}

function onDoubleClick(event: MouseEvent): void {
	if (!state.open) return;
	if (state.scale > MIN_SCALE) {
		zoomAt(event.clientX, event.clientY, MIN_SCALE);
	} else {
		zoomAt(event.clientX, event.clientY, 2);
	}
}

/* ------------------------------------------------------------------ */
/* 键盘                                                                 */
/* ------------------------------------------------------------------ */

function onKeyDown(event: KeyboardEvent): void {
	if (!state.open) return;
	switch (event.key) {
		case "Escape":
		case "Delete":
		case "Backspace":
			event.preventDefault();
			closeLightbox();
			break;
		case "PageUp":
		case "ArrowRight":
		case "ArrowUp":
			event.preventDefault();
			next();
			break;
		case "PageDown":
		case "ArrowLeft":
		case "ArrowDown":
			event.preventDefault();
			prev();
			break;
		case "Tab": {
			// 焦点圈定在灯箱内
			const focusables = dom?.root.querySelectorAll<HTMLElement>("button:not([hidden])");
			if (!focusables || focusables.length === 0) break;
			const first = focusables[0];
			const last = focusables[focusables.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
			break;
		}
	}
}

/* ------------------------------------------------------------------ */
/* 点击委托：收集轮播组                                                  */
/* ------------------------------------------------------------------ */

function itemFromImage(image: HTMLImageElement): LightboxItem {
	return {
		src: image.currentSrc || image.src,
		caption: image.alt || undefined,
	};
}

function collectGroup(target: HTMLElement): { items: LightboxItem[]; index: number } | null {
	// 1. 通用 data-fancybox 钩子（同名值聚合；无值统一落 "default" 组）
	const hooked = target.closest<HTMLElement>(GROUP_ATTR);
	if (hooked) {
		const name = hooked.getAttribute("data-fancybox") || "default";
		const members = [
			...document.querySelectorAll<HTMLElement>(`[data-fancybox="${CSS.escape(name)}"]`),
		];
		const items = members
			.map((element) => {
				const image = element instanceof HTMLImageElement
					? element
					: element.querySelector("img");
				if (image) return itemFromImage(image);
				if (element instanceof HTMLAnchorElement && element.href) {
					return {
						src: element.href,
						caption: element.getAttribute("aria-label") || undefined,
					};
				}
				return null;
			})
			.filter((item): item is LightboxItem => item !== null);
		return { items, index: Math.max(members.indexOf(hooked), 0) };
	}

	// 2. 文章正文图片与封面：整篇聚合
	const image = target.closest<HTMLImageElement>(ARTICLE_IMAGES);
	if (image) {
		const images = [...document.querySelectorAll<HTMLImageElement>(ARTICLE_IMAGES)];
		return {
			items: images.map(itemFromImage),
			index: Math.max(images.indexOf(image), 0),
		};
	}

	return null;
}

function onClickDelegated(event: MouseEvent): void {
	if (event.defaultPrevented || event.button !== 0) return;
	if (!(event.target instanceof HTMLElement)) return;
	// 灯箱已打开时，点击发生在灯箱内部，不参与收集
	if (state.open) return;

	const group = collectGroup(event.target);
	if (!group || group.items.length === 0) return;
	event.preventDefault();
	openLightbox(group.items, group.index);
}

function onActionClick(event: MouseEvent): void {
	const btn = (event.target as HTMLElement).closest<HTMLElement>("[data-action]");
	if (!btn) return;
	switch (btn.dataset.action) {
		case "close":
			closeLightbox();
			break;
		case "prev":
			prev();
			break;
		case "next":
			next();
			break;
		case "zoomIn":
			zoomToCentered(state.scale * 1.25);
			break;
		case "zoomOut":
			zoomToCentered(state.scale / 1.25);
			break;
		case "oneToOne":
			zoomToCentered(state.scale > 1 ? MIN_SCALE : MAX_SCALE);
			break;
		case "rotateCCW":
			cancelKenBurns();
			state.rotation -= 90;
			applyTransform();
			break;
		case "rotateCW":
			cancelKenBurns();
			state.rotation += 90;
			applyTransform();
			break;
		case "flipX":
			cancelKenBurns();
			state.flipX *= -1;
			applyTransform();
			break;
		case "flipY":
			cancelKenBurns();
			state.flipY *= -1;
			applyTransform();
			break;
		case "reset":
			cancelKenBurns();
			resetTransform();
			break;
		case "play":
			toggleSlideshow();
			break;
		case "fullscreen":
			toggleFullscreen();
			break;
		case "thumbs":
			state.thumbsVisible = !state.thumbsVisible;
			syncToolbar();
			break;
	}
}

function toggleFullscreen(): void {
	if (document.fullscreenElement) {
		void document.exitFullscreen().catch(() => {});
	} else if (dom) {
		void dom.root.requestFullscreen?.().catch(() => {});
	}
}

/* ------------------------------------------------------------------ */
/* 全局绑定（幂等）                                                      */
/* ------------------------------------------------------------------ */

const DELEGATION_BOUND_KEY = "lightboxBound";

/** 绑定 document 级点击委托与键盘监听（幂等；样式随首次调用懒加载） */
export function initLightboxDelegation(): void {
	if (typeof document === "undefined") return;
	if (document.documentElement.dataset[DELEGATION_BOUND_KEY] === "true") return;
	document.documentElement.dataset[DELEGATION_BOUND_KEY] = "true";

	document.addEventListener("click", onClickDelegated, true);
	document.addEventListener("keydown", onKeyDown);
}
