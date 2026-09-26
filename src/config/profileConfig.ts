import type { ProfileConfig } from "@/types/config";

/**
 * 博主资料：头像 / 名称 / 简介 / 社交链接（侧栏 Profile 卡片、页脚、RSS 作者等消费）。
 * 类型见 src/types/config.ts。
 */
export const profileConfig: ProfileConfig = {
	avatar: "assets/images/MyAvatar.webp", // 相对于 /src 目录；以 '/' 开头时相对于 /public 目录
	name: "小丝瓜",
	bio: "今日もちゃんと生きている",
	links: [
		{
			name: "Bilibili",
			icon: "fa6-brands:bilibili", // 图标代码可在 https://icones.js.org/ 查询
			url: "https://space.bilibili.com/495249966",
		},
		{
			name: "Gitee",
			icon: "simple-icons:gitee",
			url: "https://gitee.com/xsgovo",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/xsgovo",
		},
	],
};
