本项目为使用公开主题Shirone的自用博客，Shirone目录下为上游主题源代码，一般情况下请忽略这个文件夹。禁止修改Shirone目录下的文件。

## 代码检查

更新代码后必须运行 `pnpm check`（astro check）。

## 预览与缓存

构建前必须清除缓存：删除 `.astro/`、`node_modules/.astro/`、`node_modules/.vite/`。

`dist/` 重建后需重启预览服务器（astro preview 的 sirv 在启动时缓存旧文件树），浏览器端配合硬刷新。
