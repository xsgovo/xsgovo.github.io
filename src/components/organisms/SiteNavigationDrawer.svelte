<script lang="ts">
/**
 * 全站导航抽屉（M3 ModalNavigationDrawer 应用，自包含实现，不改原子）。
 * 顶部栏菜单按钮派发 site-drawer:toggle 事件开合；内容：
 *   一级导航（navBarConfig）+ 可折叠「分类」分组（多级扩展点）。
 * 链接由 Swup 自动接管，点击后收起抽屉；高亮与当前路由/分类筛选同步。
 */
import Icon from "@iconify/svelte";
import { resolvePageKey } from "@utils/nav-utils";
import { url } from "@utils/url-utils";
import { onMount, tick } from "svelte";
import { siteConfig } from "@/config";
import { navBarConfig } from "@/config/navBarConfig";

let open = $state(false);
let activePrimary = $state("");
const openGroups = $state<Record<string, boolean>>({});

const links = navBarConfig.links;

const primaryItems = links.map((link) => {
	const key = link.name.toLowerCase();
	return {
		value: key,
		label: link.name,
		icon: link.icon,
		href: link.url ? (link.external ? link.url : url(link.url)) : undefined,
		external: !!link.external,
		pageKey: link.pageKey ?? "",
		children: link.children?.map((child) => ({
			value: child.name.toLowerCase(),
			label: child.name,
			icon: child.icon,
			href: child.url
				? child.external
					? child.url
					: url(child.url)
				: undefined,
			external: !!child.external,
			pageKey: child.pageKey ?? "",
		})),
	};
});

function syncFromRoute() {
	const pageKey = resolvePageKey(new URL(window.location.href));
	activePrimary = "";
	for (const item of primaryItems) {
		if (item.pageKey && item.pageKey === pageKey) {
			activePrimary = item.value;
			break;
		}
		const activeChild = item.children?.find(
			(child) => child.pageKey && child.pageKey === pageKey,
		);
		if (activeChild) {
			activePrimary = activeChild.value;
			openGroups[item.value] = true;
			break;
		}
	}
}

// 点击链接后收起抽屉；外部链接不改变路由，高亮已由路由同步维护
function handleNavClick() {
	open = false;
}

function toggleGroup(group: string) {
	openGroups[group] = !openGroups[group];
}

onMount(() => {
	syncFromRoute();
	const onToggle = () => {
		open = !open;
		if (open) {
			tick().then(() => {
				drawerEl?.querySelector<HTMLElement>("a, button")?.focus();
			});
		}
	};
	const onKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") open = false;
	};
	document.addEventListener("site-drawer:toggle", onToggle);
	document.addEventListener("swup:content:replace", syncFromRoute);
	window.addEventListener("keydown", onKey);
	return () => {
		document.removeEventListener("site-drawer:toggle", onToggle);
		document.removeEventListener("swup:content:replace", syncFromRoute);
		window.removeEventListener("keydown", onKey);
	};
});

let drawerEl: HTMLElement | undefined = $state();
</script>

<div
	class="site-drawer"
	class:site-drawer--open={open}
>
	<div class="site-drawer__scrim" aria-hidden="true" onclick={() => (open = false)}></div>
	<aside
		bind:this={drawerEl}
		class="site-drawer__panel"
		role="dialog"
		aria-modal="true"
		aria-label={siteConfig.title}
	>
		<div class="site-drawer__brand">
			<div class="site-drawer__title">{siteConfig.title}</div>
			<div class="site-drawer__subtitle">{siteConfig.subtitle}</div>
		</div>

		<nav class="site-drawer__nav" aria-label="Navigation drawer">
			{#each primaryItems as item (item.value)}
				{#if item.children}
					<div class="site-drawer__group">
						<button type="button" class="site-drawer__group-head" class:site-drawer__item--active={item.children.some((child) => activePrimary === child.value)} onclick={() => toggleGroup(item.value)} aria-expanded={openGroups[item.value] ?? false}>
							{#if item.icon}<span class="site-drawer__group-icon" aria-hidden="true"><Icon icon={item.icon} /></span>{/if}
							<span class="site-drawer__group-label">{item.label}</span>
							<Icon class={openGroups[item.value] ? "site-drawer__group-arrow site-drawer__group-arrow--open" : "site-drawer__group-arrow"} icon="material-symbols:keyboard-arrow-down" />
						</button>
						{#if openGroups[item.value]}
							<div class="site-drawer__group-body">
								{#each item.children as child (child.value)}
									<a href={child.href} class="site-drawer__item site-drawer__item--child" class:site-drawer__item--active={activePrimary === child.value} aria-current={activePrimary === child.value ? "page" : undefined} target={child.external ? "_blank" : undefined} rel={child.external ? "noopener noreferrer" : undefined} onclick={handleNavClick}>
										{#if child.icon}<span class="site-drawer__item-icon" aria-hidden="true"><Icon icon={child.icon} /></span>{/if}
										<span class="site-drawer__item-label">{child.label}</span>
									</a>
								{/each}
							</div>
						{/if}
					</div>
				{:else if item.href}
					<a href={item.href} class="site-drawer__item" class:site-drawer__item--active={activePrimary === item.value} aria-current={activePrimary === item.value ? "page" : undefined} target={item.external ? "_blank" : undefined} rel={item.external ? "noopener noreferrer" : undefined} onclick={handleNavClick}>
						{#if item.icon}<span class="site-drawer__item-icon" aria-hidden="true"><Icon icon={item.icon} /></span>{/if}
						<span class="site-drawer__item-label">{item.label}</span>
					</a>
				{/if}
			{/each}

		</nav>
	</aside>
</div>

<style>
.site-drawer {
	position: fixed;
	inset: 0;
	z-index: 60;
	visibility: hidden;
	pointer-events: none;

	/* 面板：360dp 宽、surface-container-low、右侧 16dp 大圆角，左侧滑入 */
	/* 一级/子项：全宽 56dp，选中整项 secondary-container 全圆 pill */
	/* 分组头部 */
}

.site-drawer--open {
	visibility: visible;
	pointer-events: auto;
}

.site-drawer__scrim {
	position: absolute;
	inset: 0;
	background: color-mix(in oklab, var(--scrim, #000) 32%, transparent);
	opacity: 0;
	transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard);
}

.site-drawer--open .site-drawer__scrim {
	opacity: 1;
}

.site-drawer__panel {
	position: absolute;
	top: 0;
	bottom: 0;
	left: 0;
	display: flex;
	flex-direction: column;
	width: 360px;
	max-width: 85vw;
	box-sizing: border-box;
	background: var(--surface-container-low);
	color: var(--on-surface);
	border-radius: 0 var(--shape-corner-l) var(--shape-corner-l) 0;
	transform: translateX(-100%);
	transition: transform var(--m3e-duration-long) var(--m3e-easing-emphasized-decelerate);
}

.site-drawer--open .site-drawer__panel {
	transform: translateX(0);
}

.site-drawer__brand {
	padding: 20px 28px 12px;
	flex: none;
}

.site-drawer__title {
	font: var(--m3e-type-title-large);
	color: var(--on-surface);
}

.site-drawer__subtitle {
	margin-top: 4px;
	font: var(--m3e-type-body-medium);
	color: var(--on-surface-variant);
}

.site-drawer__nav {
	flex: 1;
	overflow-y: auto;
	padding: 8px 12px 16px;
}

.site-drawer__item {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	min-height: 56px;
	box-sizing: border-box;
	padding: 0 16px;
	border-radius: var(--shape-corner-full);
	color: var(--on-surface-variant);
	text-decoration: none;
	cursor: pointer;
	transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard);
}

.site-drawer__item:hover {
	background: color-mix(in oklab, var(--on-surface) 8%, transparent);
}

.site-drawer__item:focus-visible {
	outline: 2px solid var(--secondary);
	outline-offset: -2px;
}

.site-drawer__item--active {
	background: var(--secondary-container);
	color: var(--on-secondary-container);
}

.site-drawer__item--active:hover {
	background: var(--secondary-container);
}

.site-drawer__item--child {
	min-height: 48px;
	padding-left: 32px;
}

.site-drawer__item-icon {
	display: flex;
	flex: none;
	color: var(--on-surface-variant);
}

.site-drawer__item-icon > :global(svg) {
	width: 1.5rem;
	height: 1.5rem;
}

.site-drawer__item--active .site-drawer__item-icon {
	color: var(--on-secondary-container);
}

.site-drawer__item-label {
	flex: 1;
	min-width: 0;
	font: var(--m3e-type-label-large);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.site-drawer__item--child .site-drawer__item-label {
	font: var(--m3e-type-body-medium);
}

.site-drawer__group {
	margin-top: 4px;
}

.site-drawer__group-head {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	min-height: 56px;
	box-sizing: border-box;
	padding: 0 16px;
	border: none;
	border-radius: var(--shape-corner-full);
	background: none;
	color: var(--on-surface-variant);
	cursor: pointer;
	transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard);
}

.site-drawer__group-head:hover {
	background: color-mix(in oklab, var(--on-surface) 8%, transparent);
}

.site-drawer__group-head:focus-visible {
	outline: 2px solid var(--secondary);
	outline-offset: -2px;
}

.site-drawer__group-icon {
	display: flex;
	flex: none;
}

.site-drawer__group-icon > :global(svg) {
	width: 1.5rem;
	height: 1.5rem;
}

.site-drawer__group-label {
	flex: 1;
	text-align: left;
	font: var(--m3e-type-label-large);
	color: var(--on-surface-variant);
}

.site-drawer__group-arrow {
	display: flex;
	flex: none;
	transition: transform var(--m3e-duration-short) var(--m3e-easing-standard);
}

.site-drawer__group-arrow > :global(svg) {
	width: 1.25rem;
	height: 1.25rem;
}

.site-drawer__group-arrow--open {
	transform: rotate(180deg);
}

.site-drawer__group-body {
	padding: 4px 0 8px;
}
</style>
