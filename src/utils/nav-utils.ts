/**
 * 当前 URL → 导航高亮标识（pageKey）。
 * 分类/标签筛选优先于归档页（与抽屉/分类栏的筛选优先语义一致）；
 * 文章页、自定义页等无匹配时返回空串（不点亮任何导航项）。
 */
export function resolvePageKey(
	url: Pick<URL, "pathname" | "searchParams">,
): string {
	const pathname = url.pathname.replace(/\/+$/, "") || "/";
	if (pathname === "/") return "home";
	if (url.searchParams.has("category")) return "categories";
	if (url.searchParams.has("tag")) return "tags";
	if (pathname === "/archive") return "archive";
	if (pathname === "/friends") return "friends";
	if (pathname === "/anime") return "anime";
	if (pathname === "/compass") return "compass";
	if (pathname === "/devices") return "devices";
	if (pathname === "/timeline") return "timeline";
	if (pathname === "/about") return "about";
	return "";
}
