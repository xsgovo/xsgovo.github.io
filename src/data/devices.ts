/**
 * 设备展示页数据源（纯内容）。
 * 页面展示与筛选规则由 src/config/devicesConfig.ts 控制。
 */
import type { DeviceItem } from "@/types/devicesConfig";

export const devicesData: DeviceItem[] = [
	{
		id: "xiaomi-14",
		name: "Xiaomi 14",
		brand: "Xiaomi",
		category: "phone",
		status: "active",
		specs: "16G + 1T",
		description: "日常使用，除了电池不行了，还能再战几年。",
		image: "/images/device/xiaomi14.jpg",
		link: "https://www.mi.com/xiaomi-14",
	},
	{
		id: "redmi-note12-turbo",
		name: "Redmi Note12 Turbo",
		brand: "Redmi",
		category: "phone",
		status: "backup",
		specs: "12G + 512G",
		description: "root后当做备用机，偶尔用来测试安卓系统和app。",
		image: "/images/device/redmi-note12t.jpg",
		link: "https://www.mi.com/redmi-note-12-turbo",
	},
	{
		id: "iphone-16e",
		name: "iPhone 16e",
		brand: "Apple",
		category: "phone",
		status: "active",
		specs: "128G",
		description: "电子垃圾",
		image: "/images/device/iphone16e.jpg",
		link: "https://support.apple.com/zh-cn/122208",
	},
	{
		id: "galaxy-tab-s9-plus",
		name: "Samsung Galaxy Tab S9+",
		brand: "Samsung",
		category: "tablet",
		status: "active",
		specs: "12G + 256G",
		description: "主要用来记笔记和打草稿，有时用来串流。",
		image: "/images/device/samsung-galaxy-tab-s9+.jpg",
		link: "https://www.samsung.com.cn/tablets/galaxy-tab-s/galaxy-tab-s9-wi-fi-graphite-128gb-sm-x710nzaachn/",
	},
];
