import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";

export interface FeedPostItem {
	id: string;
	title: string;
	link: string;
	pubDate: Date;
	updated: Date;
	description: string;
	/** 纯文本正文（订阅端按 text 展示，不做 HTML 渲染） */
	content: string;
	category?: string;
	tags: string[];
}

function escapeXml(value: unknown): string {
	return String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

/** 剥离 Markdown 语法，产出供订阅端直接阅读的纯文本。 */
function markdownToPlainText(raw: string): string {
	return raw
		.replace(/```[\s\S]*?```/g, "")
		.replace(/~~~[\s\S]*?~~~/g, "")
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1 ($2)")
		.replace(/^\s{0,3}#{1,6}\s+/gm, "")
		.replace(/^\s{0,3}>\s?/gm, "")
		.replace(/^\s*[-+*]\s+/gm, "")
		.replace(/^\s*\d+\.\s+/gm, "")
		.replace(/[*_~`]+/g, "")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export async function getFeedPosts(site: URL): Promise<FeedPostItem[]> {
	const blog = await getSortedPosts();

	return blog.map((post) => {
		const content = stripInvalidXmlChars(markdownToPlainText(post.body ?? ""));
		const postUrl = new URL(url(`/posts/${post.id}/`), site).href;
		const pubDate = new Date(post.data.published);
		const updated = post.data.updated ? new Date(post.data.updated) : pubDate;

		return {
			id: post.id,
			title: post.data.title,
			link: postUrl,
			pubDate,
			updated,
			description: post.data.description,
			content,
			category: post.data.category || undefined,
			tags: post.data.tags,
		};
	});
}

export interface BuildAtomXmlOptions {
	title: string;
	subtitle: string;
	lang: string;
	author: string;
	siteUrl: string;
	feedUrl: string;
	items: FeedPostItem[];
}

export function buildAtomXml({
	title,
	subtitle,
	lang,
	author,
	siteUrl,
	feedUrl,
	items,
}: BuildAtomXmlOptions): string {
	const latestUpdated = items.reduce(
		(latest, item) => (item.updated > latest ? item.updated : latest),
		new Date(0),
	);

	const entries = items
		.map(
			(item) => `  <entry>
    <title>${escapeXml(item.title)}</title>
    <link href="${escapeXml(item.link)}" rel="alternate" type="text/html"/>
    <id>${escapeXml(item.link)}</id>
    <published>${item.pubDate.toISOString()}</published>
    <updated>${item.updated.toISOString()}</updated>
    <summary>${escapeXml(item.description)}</summary>
    <content type="text">${escapeXml(item.content)}</content>
    <author><name>${escapeXml(author)}</name></author>${
				item.category
					? `
    <category term="${escapeXml(item.category)}"/>`
					: ""
			}
  </entry>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${escapeXml(lang)}">
  <title>${escapeXml(title)}</title>
  <subtitle>${escapeXml(subtitle)}</subtitle>
  <link href="${escapeXml(siteUrl)}" rel="alternate" type="text/html"/>
  <link href="${escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>
  <id>${escapeXml(siteUrl)}</id>
  <updated>${latestUpdated.toISOString()}</updated>
${entries}
</feed>
`;
}
