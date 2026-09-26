import {
	MC_SPECS,
	MC_STYLES,
	type McSpec,
	type McStyle,
	resolveScheme,
} from "@utils/mc-utils";
import { getDefaultSpec, getDefaultStyle } from "@/config";

const STYLE_KEY = "mc-style";
const SPEC_KEY = "mc-spec";

/** 样式表消费的每个 M3/M3E 角色对应的 CSS 自定义属性名。 */
const ROLE_TO_CSS: Record<string, string> = {
	primary: "--mc-primary",
	onPrimary: "--mc-on-primary",
	primaryContainer: "--mc-primary-container",
	onPrimaryContainer: "--mc-on-primary-container",
	secondary: "--mc-secondary",
	onSecondary: "--mc-on-secondary",
	secondaryContainer: "--mc-secondary-container",
	onSecondaryContainer: "--mc-on-secondary-container",
	tertiary: "--mc-tertiary",
	onTertiary: "--mc-on-tertiary",
	tertiaryContainer: "--mc-tertiary-container",
	onTertiaryContainer: "--mc-on-tertiary-container",
	error: "--mc-error",
	errorContainer: "--mc-error-container",
	surface: "--mc-surface",
	surfaceDim: "--mc-surface-dim",
	surfaceContainerLowest: "--mc-surface-container-lowest",
	surfaceContainerLow: "--mc-surface-container-low",
	surfaceContainer: "--mc-surface-container",
	surfaceContainerHigh: "--mc-surface-container-high",
	surfaceContainerHighest: "--mc-surface-container-highest",
	onSurface: "--mc-on-surface",
	onSurfaceVariant: "--mc-on-surface-variant",
	outline: "--mc-outline",
	outlineVariant: "--mc-outline-variant",
	inverseSurface: "--mc-inverse-surface",
	inverseOnSurface: "--mc-inverse-on-surface",
	shadow: "--mc-shadow",
	scrim: "--mc-scrim",
};

function isMcStyle(v: string): v is McStyle {
	return (MC_STYLES as readonly string[]).includes(v);
}

function isMcSpec(v: string): v is McSpec {
	return (MC_SPECS as readonly string[]).includes(v);
}

export function getStyle(): McStyle {
	const stored = localStorage.getItem(STYLE_KEY);
	return stored && isMcStyle(stored) ? stored : (getDefaultStyle() as McStyle);
}

export function getSpec(): McSpec {
	const stored = localStorage.getItem(SPEC_KEY);
	return stored && isMcSpec(stored) ? stored : (getDefaultSpec() as McSpec);
}

export function setStyle(style: McStyle): void {
	localStorage.setItem(STYLE_KEY, style);
	applyCurrentScheme();
}

export function setSpec(spec: McSpec): void {
	localStorage.setItem(SPEC_KEY, spec);
	applyCurrentScheme();
}

/**
 * 按当前的色相、风格、spec 与明暗模式，
 * 重新计算并应用动态 M3/M3E 配色方案，
 * 将具体的 hex 值写入 `:root` 上的 CSS 自定义属性。
 */
export function applyCurrentScheme(): void {
	const root = document.documentElement;

	const hue = Number.parseInt(
		root.style.getPropertyValue("--hue") || "250",
		10,
	);
	const isDark = root.classList.contains("dark");
	const style = getStyle();
	const spec = getSpec();
	const scheme = resolveScheme(hue, isDark, style, spec);

	for (const [role, cssVar] of Object.entries(ROLE_TO_CSS)) {
		const value = scheme[role];
		if (value) {
			root.style.setProperty(cssVar, value);
		} else {
			root.style.removeProperty(cssVar);
		}
	}
}
