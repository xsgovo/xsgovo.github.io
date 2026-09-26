import path from "node:path";

const imageFiles = import.meta.glob<ImageMetadata>(
	"../**/*.{png,jpg,jpeg,webp,avif,svg,gif}",
	{ import: "default" },
);

function isRemoteOrPublic(src: string): boolean {
	return (
		src.startsWith("/") ||
		src.startsWith("http") ||
		src.startsWith("https") ||
		src.startsWith("data:")
	);
}

/**
 * 把本地相对资源路径解析为构建产物 URL（ImageMetadata）。
 * 基于 import.meta.glob 静态收集（需放在 util 层，glob 相对本文件 src/utils/ 解析），
 * 公开路径（/…）与远程（http/data:）原样返回；文件缺失时回退原路径。
 * `basePath` 相对 src/ 起算（如 "content/posts/foo"），供文章目录内图片使用。
 */
export async function resolveImageAsset(
	src: string,
	basePath = "",
): Promise<ImageMetadata | string> {
	if (!src || isRemoteOrPublic(src)) return src;
	const normalizedPath = path
		.normalize(path.join("../", basePath, src))
		.replace(/\\/g, "/");
	const file = imageFiles[normalizedPath];
	return file ? file() : src;
}
