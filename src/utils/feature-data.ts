/**
 * 特色页面数据解析与合并工具。
 * 遵循「配置管行为，数据管内容」原则：
 * 将 src/config/*Config.ts 的控制行为（disabledKeys、order 等）
 * 应用于 src/data/*.ts 的内容数据集合。
 */
import { devicesData } from "../data/devices.ts";
import { timelineData } from "../data/timeline.ts";
import type { DeviceItem, DevicesConfig } from "../types/devicesConfig.ts";
import type { TimelineConfig, TimelineItem } from "../types/timelineConfig.ts";

/**
 * 依据禁用列表过滤条目（纯函数）。
 */
export function filterByDisabledKeys<T>(
	items: readonly T[],
	disabledKeys: readonly string[] | undefined,
	getKey: (item: T) => string,
): T[] {
	if (!disabledKeys || disabledKeys.length === 0) {
		return [...items];
	}
	const disabledSet = new Set(disabledKeys);
	return items.filter((item) => !disabledSet.has(getKey(item)));
}

/**
 * 解析时间线页展示数据。
 */
export function resolveTimelineData(config: TimelineConfig): TimelineItem[] {
	const enabledItems = (config.items ?? timelineData).filter(
		(item) => item.enable !== false,
	);
	const filtered = filterByDisabledKeys(
		enabledItems,
		config.disabledTitles ?? config.disabledKeys,
		(item) => item.title,
	);

	if (config.order === "asc") {
		return [...filtered].reverse();
	}
	return filtered;
}

/**
 * 解析设备页展示数据。
 */
export function resolveDevicesData(config: DevicesConfig): DeviceItem[] {
	const enabledItems = (config.items ?? devicesData).filter(
		(item) => item.enable !== false,
	);
	return filterByDisabledKeys(
		enabledItems,
		config.disabledIds ?? config.disabledKeys,
		(item) => item.id,
	);
}
