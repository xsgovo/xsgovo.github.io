import type { APIContext, APIRoute } from "astro";
import { getSortedPosts } from "@utils/content-utils";
import { generateLlmsFullTxt } from "@utils/llms-utils";
import { llmsConfig, siteConfig } from "@/config";

export const GET: APIRoute = async (context: APIContext) => {
	if (!llmsConfig.enable || !llmsConfig.generateFull) {
		return new Response("Not Found", { status: 404 });
	}

	const siteUrl = (context.site?.href ?? siteConfig.site ?? "https://shirone.mysqil.com").replace(/\/$/, "");
	const allPosts = await getSortedPosts();

	// 隐私过滤：排除草稿以及黑名单标签/分类
	const publicPosts = allPosts.filter((post) => {
		if (post.data.draft) return false;
		if (
			llmsConfig.excludeTags?.length &&
			post.data.tags.some((t) => llmsConfig.excludeTags?.includes(t))
		) {
			return false;
		}
		if (
			llmsConfig.excludeCategories?.length &&
			post.data.category &&
			llmsConfig.excludeCategories.includes(post.data.category)
		) {
			return false;
		}
		return true;
	});

	const content = generateLlmsFullTxt({
		posts: publicPosts,
		baseUrl: siteUrl,
		config: llmsConfig,
		siteTitle: siteConfig.title,
	});

	return new Response(content, {
		headers: {
			"Content-Type": "text/markdown; charset=utf-8",
			"Cache-Control": "public, max-age=86400",
		},
	});
};
