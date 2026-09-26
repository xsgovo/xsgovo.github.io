import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const postsCollection = defineCollection({
	loader: glob({ base: "./src/content/posts", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		pinned: z.boolean().optional().default(false),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().default(""),
	}),
});

const specCollection = defineCollection({
	loader: glob({ base: "./src/content/spec", pattern: "**/*.md" }),
	schema: z.object({}),
});

// 注意：本文件的「推断类型」是 astro 生成 CollectionEntry 的 data 类型来源
// （InferEntrySchema ← ContentConfig），请勿为 collections 添加显式类型注解，
// 否则 post.data 会退化为 unknown；其推断类型亦不可满足 isolatedDeclarations
// 的可发射声明要求（type-check 脚本因此不启用该标志），schema 正确性由构建期 zod 校验兜底。
export const collections = {
	posts: postsCollection,
	spec: specCollection,
} as const;
