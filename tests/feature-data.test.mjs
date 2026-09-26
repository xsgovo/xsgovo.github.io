import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	filterByDisabledKeys,
	resolveDevicesData,
	resolveTimelineData,
} from "../src/utils/feature-data.ts";

describe("Feature Data & Resolver Tests", () => {
	it("filterByDisabledKeys correctly filters items by key/id/name/title", () => {
		const items = [
			{ key: "item-1", name: "One" },
			{ key: "item-2", name: "Two" },
			{ key: "item-3", name: "Three" },
		];

		const filtered = filterByDisabledKeys(items, ["item-2"], (i) => i.key);
		assert.equal(filtered.length, 2);
		assert.deepEqual(
			filtered.map((i) => i.key),
			["item-1", "item-3"],
		);
	});

	it("resolveTimelineData applies disabledTitles and order correctly", () => {
		const config = {
			enable: true,
			categories: [],
			order: "asc",
			disabledTitles: ["Senior Frontend Engineer"],
		};
		const resolved = resolveTimelineData(config);
		assert.ok(!resolved.some((t) => t.title === "Senior Frontend Engineer"));
		assert.equal(resolved[0].title, "Started Personal Blog & Tech Notes");
	});

	it("resolveDevicesData applies disabledIds correctly", () => {
		const config = {
			enable: true,
			categories: [],
			disabledIds: ["xiaomi-14"],
		};
		const resolved = resolveDevicesData(config);
		assert.ok(resolved.some((d) => d.id === "iphone-16e"));
		assert.ok(!resolved.some((d) => d.id === "xiaomi-14"));
	});
});
