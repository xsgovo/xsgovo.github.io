/**
 * Material 3 动态配色引擎（Shirone）。
 *
 * 对 Google `@material/material-color-utilities`（HCT 色彩空间）的轻量封装，
 * 与 FolkPatch 的 MaterialKolor 封装的是同一族算法，因此 MD3（2021）与
 * M3 Expressive（2025）两代设计规范以及全部 9 种调色板风格
 * （TonalSpot、Vibrant、Content、Expressive、…）都会解析出真正的 HCT 色调
 * 调色板。
 *
 * 种子色由现有 `--hue`（0-360）派生，因此色相滑块的行为与之前保持一致；
 * 引擎会为每个 M3 角色返回具体的 hex 值。
 */
import {
	type DynamicColor,
	type DynamicScheme,
	Hct,
	type MaterialDynamicColors,
	SchemeContent,
	SchemeExpressive,
	SchemeFidelity,
	SchemeFruitSalad,
	SchemeMonochrome,
	SchemeNeutral,
	SchemeRainbow,
	SchemeTonalSpot,
	SchemeVibrant,
} from "@material/material-color-utilities";

/** 调色板风格 — 对应 `com.materialkolor.PaletteStyle`。 */
export const MC_STYLES = [
	"tonalSpot",
	"vibrant",
	"content",
	"expressive",
	"rainbow",
	"fruitSalad",
	"monochrome",
	"neutral",
	"fidelity",
] as const;
export type McStyle = (typeof MC_STYLES)[number];

/** 设计规范版本 — 对应 `ColorSpec.SpecVersion`。 */
export const MC_SPECS = ["2021", "2025"] as const;
export type McSpec = (typeof MC_SPECS)[number];

/** 动态引擎种子色所用的取值（中间调、中等彩度）。 */
const SEED_CHROMA = 60;
const SEED_TONE = 50;

/**
 * 由色相（0-360）构建种子 ARGB。使用固定的 chroma/tone，
 * 确保任何色相都能得到可用、鲜亮而不浑浊的种子色。
 */
function seedFromHue(hue: number): number {
	return Hct.from(hue, SEED_CHROMA, SEED_TONE).toInt();
}

/** 将样式表消费的每个 M3/M3E 颜色角色映射到对应的 DynamicColor 解析器。 */
function buildRoleMap(
	colors: MaterialDynamicColors,
): Record<string, DynamicColor> {
	return {
		primary: colors.primary(),
		onPrimary: colors.onPrimary(),
		primaryContainer: colors.primaryContainer(),
		onPrimaryContainer: colors.onPrimaryContainer(),
		secondary: colors.secondary(),
		onSecondary: colors.onSecondary(),
		secondaryContainer: colors.secondaryContainer(),
		onSecondaryContainer: colors.onSecondaryContainer(),
		tertiary: colors.tertiary(),
		onTertiary: colors.onTertiary(),
		tertiaryContainer: colors.tertiaryContainer(),
		onTertiaryContainer: colors.onTertiaryContainer(),
		error: colors.error(),
		errorContainer: colors.errorContainer(),
		surface: colors.surface(),
		surfaceDim: colors.surfaceDim(),
		surfaceContainerLowest: colors.surfaceContainerLowest(),
		surfaceContainerLow: colors.surfaceContainerLow(),
		surfaceContainer: colors.surfaceContainer(),
		surfaceContainerHigh: colors.surfaceContainerHigh(),
		surfaceContainerHighest: colors.surfaceContainerHighest(),
		onSurface: colors.onSurface(),
		onSurfaceVariant: colors.onSurfaceVariant(),
		outline: colors.outline(),
		outlineVariant: colors.outlineVariant(),
		inverseSurface: colors.inverseSurface(),
		inverseOnSurface: colors.inverseOnSurface(),
		shadow: colors.shadow(),
		scrim: colors.scrim(),
	};
}

/** 为指定风格构建 DynamicScheme。 */
function buildScheme(
	style: McStyle,
	isDark: boolean,
	seed: number,
	spec: McSpec,
): DynamicScheme {
	const hct = Hct.fromInt(seed);
	switch (style) {
		case "content":
			return new SchemeContent(hct, isDark, 0, spec);
		case "expressive":
			return new SchemeExpressive(hct, isDark, 0, spec);
		case "fidelity":
			return new SchemeFidelity(hct, isDark, 0, spec);
		case "fruitSalad":
			return new SchemeFruitSalad(hct, isDark, 0, spec);
		case "monochrome":
			return new SchemeMonochrome(hct, isDark, 0, spec);
		case "neutral":
			return new SchemeNeutral(hct, isDark, 0, spec);
		case "rainbow":
			return new SchemeRainbow(hct, isDark, 0, spec);
		case "vibrant":
			return new SchemeVibrant(hct, isDark, 0, spec);
		case "tonalSpot":
		default:
			return new SchemeTonalSpot(hct, isDark, 0, spec);
	}
}

function argbToHex(argb: number): string {
	return `#${[16, 8, 0]
		.map((shift) => ((argb >> shift) & 0xff).toString(16).padStart(2, "0"))
		.join("")}`;
}

export type McScheme = Record<string, string>;

/**
 * 针对给定的种子色相、风格、spec 与明暗模式，
 * 把每个 M3/M3E 颜色角色解析为具体的 hex 值。
 *
 * 关于 spec（2021 vs 2025）：在 @material/material-color-utilities@0.4.0 中
 * `MaterialDynamicColors.colorSpec` 是静态属性、模块加载时固定为 2025 版委托
 * （material_dynamic_colors.js:295），因此所有角色在 2021 与 2025 下都会解析
 * 出值；2021/2025 的实际差异仅在调色板派生层
 * （DynamicSchemePalettesDelegateImpl2021 vs 2025），不影响角色集。
 */
export function resolveScheme(
	hue: number,
	isDark: boolean,
	style: McStyle,
	spec: McSpec,
): McScheme {
	const scheme = buildScheme(style, isDark, seedFromHue(hue), spec);
	const roleMap = buildRoleMap(scheme.colors);
	const out: McScheme = {};
	for (const name of Object.keys(roleMap)) {
		out[name] = argbToHex(roleMap[name].getArgb(scheme));
	}
	return out;
}
