export const LIGHT_MODE: "light" = "light",
	DARK_MODE: "dark" = "dark",
	AUTO_MODE: "auto" = "auto";
export const DEFAULT_THEME: typeof AUTO_MODE = AUTO_MODE;

export const WALLPAPER_MODE_KEY = "wallpaper-mode";
export const WALLPAPER_MODE_CHANGE_EVENT = "wallpaper-mode:change";

export const TEXTURE_PRESET_KEY = "texture-preset";
export const TEXTURE_OPACITY_KEY = "texture-opacity";
export const TEXTURE_CHANGE_EVENT = "texture:change";
export const TEXTURE_PRESETS = [
	"none",
	"starlight",
	"cyber-dots",
	"topography",
	"geometric",
	"sakura",
] as const;

// Banner 高度单位：vh
export const BANNER_HEIGHT = 35;
export const BANNER_HEIGHT_EXTEND = 30;
export const BANNER_HEIGHT_HOME: number = BANNER_HEIGHT + BANNER_HEIGHT_EXTEND;

// 主面板与 Banner 重叠的高度，单位：rem
// 保持少量重叠，让内容框与波浪边缘自然衔接。
export const MAIN_PANEL_OVERLAPS_BANNER_HEIGHT = 1;

// 页面宽度：rem。单侧栏使用 PAGE_WIDTH；双栏布局
// 会将框架加宽一档（在 responsive-utils 中解析）。
export const PAGE_WIDTH = 85;
export const PAGE_WIDTH_DUAL = 96;
