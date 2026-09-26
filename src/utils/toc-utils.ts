import type { MarkdownHeading } from "astro";

/** 去掉标题文本末尾的 "#"（autolink-headings 注入的锚点符号残留）。 */
export function removeTailingHash(text: string): string {
	const lastIndexOfHash = text.lastIndexOf("#");
	return lastIndexOfHash === text.length - 1
		? text.substring(0, lastIndexOfHash)
		: text;
}

/** MarkdownHeading → TOC 渲染条目（去尾 # 后的 depth/text/slug）。 */
export function mapTocHeadings(headings: MarkdownHeading[]): {
	depth: number;
	text: string;
	slug: string;
}[] {
	return headings.map((heading) => ({
		depth: heading.depth,
		text: removeTailingHash(heading.text),
		slug: heading.slug,
	}));
}
