/* 新建文章脚本：在 src/content/posts/ 下生成携带完整 frontmatter 的 Markdown 模板 */

import fs from "fs";
import path from "path";

function getDate() {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, "0");
	const day = String(today.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

const args = process.argv.slice(2);

if (args.length === 0) {
	console.error(`Error: No filename argument provided
Usage: npm run new-post -- <filename>`);
	process.exit(1); // 以错误码 1 结束脚本
}

let fileName = args[0];

// 未带扩展名时补 .md
const fileExtensionRegex = /\.(md|mdx)$/i;
if (!fileExtensionRegex.test(fileName)) {
	fileName += ".md";
}

const targetDir = "./src/content/posts/";
const fullPath = path.join(targetDir, fileName);

if (fs.existsSync(fullPath)) {
	console.error(`Error: File ${fullPath} already exists `);
	process.exit(1);
}

// recursive 模式创建多级目录
const dirPath = path.dirname(fullPath);
if (!fs.existsSync(dirPath)) {
	fs.mkdirSync(dirPath, { recursive: true });
}

// 标题取文件名（去掉扩展名）；单引号翻倍转义，保证含引号标题的 YAML 合法
const title = args[0].replace(fileExtensionRegex, "").replace(/'/g, "''");
const date = getDate();

// 字段与 content.config.ts 的 posts schema 一一对应（全部显式写出，便于新文直接改）
const content = `---
title: '${title}'
published: ${date}
updated: ${date}
pinned: false
draft: false
description: ''
image: ''
tags: []
category: ''
---
`;

fs.writeFileSync(path.join(targetDir, fileName), content);

console.log(`Post ${fullPath} created`);
