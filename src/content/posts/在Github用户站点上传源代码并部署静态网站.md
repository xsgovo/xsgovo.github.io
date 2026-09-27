---
title: 在 GitHub 用户站点上传源代码并部署静态网站
published: 2026-09-27
pinned: false
description: 从零搭建 GitHub 用户站点：仓库命名规则、源码上传流程，以及基于 GitHub Actions 自定义工作流的自动化部署配置。
tags:
  - GitHub
  - GitHub Pages
  - GitHub Actions
  - 静态网站
  - 博客
  - 部署
category: Frontend
author: 小丝瓜
draft: false
---

>[!WARNING]
> **AI 生成内容声明**：
> 本文内容由人工智能辅助生成，经过人工审阅与校对完成。

---

想拥有一个自己的网站，却又不想花钱买服务器、折腾域名解析？GitHub Pages 就是为此而生的——免费托管静态网站，自带 HTTPS，还附带一个相对较短的域名，最方便的是能配合 GitHub Actions 实现「push 即部署」。

这篇文章，就教你如何从创建仓库开始，一步步把源码传上去，再用自定义工作流把它自动部署成一个真正能访问的网站。

---

## 第一步：创建仓库并上传源码

### 创建仓库

在 GitHub 网页上点 **New**，仓库名填 `<username>.github.io`。这个名字是 GitHub 的约定：只有严格按此格式命名的仓库才会被识别为用户站点，分配到 `https://<username>.github.io` 的根地址。比如我的用户名是 `xsgovo`，仓库就应该叫：

```
xsgovo.github.io
```

注意两点：用户名里如果有大写字母，仓库名要统一转成小写；每个账号只能创建一个用户站点。仓库类型设为 Public，其它的不用管，直接创建。

私有仓库也能用 Pages，但需要 GitHub Pro 及以上的付费计划，免费账号只有公开仓库可用。

### 本地初始化并推送

假设你本地已经写好了网站源码，且已经安装配置好了 Git。

进入项目：

```bash
cd D:\Projects\my-site
```

初始化并提交全部文件：

```bash
git init
git add .
git commit -m "Initial commit"
```

添加远程仓库并推送：

```bash
git branch -M main
git remote add origin https://github.com/<username>/<username>.github.io.git
git push -u origin main
```

推送完成后，刷新 GitHub 仓库页面，就可以看到源码了。但此时网站还访问不了——Pages 默认的发布方式是 Deploy from a branch（从分支部署），对需要构建的项目并不适用（传统方式的操作方法和原因见后文「传统方式：Deploy from a branch 和 `.nojekyll`」），所以我们要换一种发布方式：GitHub Actions。

---

## 第二步：把部署源切换为 GitHub Actions

打开 GitHub 网页，登录后操作：

1. 打开仓库页面，进入 **Settings**
2. 左侧菜单找到 **Pages**
3. 在 **Build and deployment** 区域，把 **Source** 从 `Deploy from a branch` 改为 **`GitHub Actions`**

保存后，GitHub 就会按照工作流来构建和部署网站。

GitHub Pages 设置页面还会根据项目类型推荐一些官方 Starter Workflow，例如 Astro、Jekyll、Hugo 等。如果你的项目正好使用这些技术栈，可以直接使用官方模板，再根据项目需要调整。

---

## 第三步：编写 GitHub Actions 工作流

在仓库根目录里创建 GitHub 工作流文件：

```
.github/
└── workflows/
	└── deploy.yml
```

这里以我自己的博客部署脚本为例，我的项目使用了 pnpm 和 Astro。脚本中需要按你的项目情况调整的行，我都在注释里标注了作用和改法：

```yaml
# 构建 Astro 博客并部署到 GitHub Pages
name: Deploy to GitHub Pages

on:
  # 推送到 main 分支时触发（分支名改成你仓库的默认分支）
  push:
    branches: [main]
  # 允许在 Actions 页面手动运行
  workflow_dispatch:

# 授予工作流所需的最小权限
permissions:
  contents: read       # 读取仓库代码
  pages: write         # 写入 GitHub Pages
  id-token: write      # 获取 OIDC token（deploy-pages 验证用）

# 同一时刻只允许一个 pages 部署任务
concurrency:
  group: pages
  cancel-in-progress: false   # 不中断正在进行的部署

jobs:
  deploy:
    name: 构建并部署博客
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}   # 部署完成后的页面地址（这个一般不要改）
    steps:
      # 检出代码
      - uses: actions/checkout@v7

      # 安装 pnpm（用 npm/yarn 的项目删除此步，并相应调整下面的安装命令与 cache 配置）
      - uses: pnpm/action-setup@v6

      # 安装 Node 22 并启用 pnpm 缓存
      # node-version 改成你项目需要的 Node 版本；cache 与你的包管理器对应（pnpm/npm/yarn）
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: pnpm

      # 读取 Pages 配置（base path 等）
      - uses: actions/configure-pages@v5

      # 严格按 lockfile 安装依赖，保证 CI 与本地一致
      # npm 项目换成 npm ci，yarn 项目换成 yarn install --frozen-lockfile
      - run: pnpm install --frozen-lockfile

      # 【个人博客专属，可删除】拉取最新番组数据
      - name: 同步番组数据
        run: pnpm anime:sync

      # 【个人博客专属，可删除】校验番组数据非空，为空则让工作流失败
      - name: 检查番组数据
        run: node -e "const j=require('./src/data/anime-snapshots/bangumi.json'); if (!j.items?.length) process.exit(1)"

      # 类型检查通过后再构建到 dist/（换成你项目的检查与构建命令）
      - name: 检查并构建
        run: pnpm check && pnpm build

      # 上传 dist 作为 Pages artifact（path 指向你的构建产物目录，如 dist、build、_site）
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

      # 发布到 GitHub Pages（id 供 environment.url 引用）
      - name: 部署到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

提交并 push 这个文件，然后到仓库的 **Actions** 标签页就能看到工作流在跑了。全绿之后，访问 `https://<username>.github.io`，网站正式上线。

到这里，整个部署流程就走完了。如果只想把网站跑起来，看到这一步就够了；接下来的内容解释这套流程背后的原理，遇到问题时再回来查。

---

## 原理解析

### 用户站点和项目站点

GitHub Pages 主要有两种常见形式。

用户站点（User Site）：

```
https://<username>.github.io
```

项目站点（Project Site）：

```
https://<username>.github.io/<repository>/
```

用户站点的仓库必须命名为 `<username>.github.io`，每个账号只能创建一个；项目站点不限数量，任意仓库都可以开。不过一般没有开多个站点的必要，真有多站点需求，直接上 Cloudflare、Netlify、EdgeOne 这类专业平台托管更省心。

### 传统方式：Deploy from a branch 和 `.nojekyll`

`.nojekyll` 这个文件经常被 GitHub Pages 教程提到，但它是传统部署方式的产物，和 GitHub Actions 部署并不是一回事。要说清楚它，得先介绍传统方式怎么操作。

GitHub Pages 默认的发布方式叫 "Deploy from a branch"（从分支部署），操作非常简单：

1. 打开仓库页面，进入 **Settings**，左侧菜单找到 **Pages**
2. 在 **Build and deployment** 区域，把 **Source** 选为 **Deploy from a branch**
3. 在下方选择要发布的分支（一般是 `main`）和目录（保持 `/ (root)` 即可）
4. 点击 **Save**，等一两分钟，访问 `https://<username>.github.io` 就能看到网站

这种方式与 Jekyll 直接相关：用 Deploy from a branch 发布网站时，Pages 默认会使用 Jekyll 对仓库内容做一遍构建。Jekyll 是 GitHub 官方支持的静态站点生成器，如果你上传的本身就是一个 Jekyll 站点（仓库里有 `_config.yml`），它会被自动编译成网页，你什么都不用做。

但如果你的网站只是纯静态文件，不想让 Jekyll 插手，可以在发布源根目录创建一个空的 `.nojekyll` 文件来禁用默认的 Jekyll 构建。最简单的仓库结构就是：

```
.
├── index.html
└── .nojekyll
```

值得注意的是，这种方式部署的网站入口一定得是 `index.html`。

这种部署方式确实简单快捷——上传文件、选好分支就完事了。但对于 Astro 这类需要构建的项目，每次更新都得先在本地手动 build 一遍，再把构建产物推送上去，有点麻烦。这就是本文选择 GitHub Actions 的原因：构建交给 CI，本地只管写源码。

### 工作流里这几个字段一个都不能少

很多人照抄网上残缺的模板，跑出来一堆权限报错，基本都是漏了这几样：

1. `permissions` 里的 `pages: write` 和 `id-token: write`。前者授予 `GITHUB_TOKEN` 调用 Pages 部署 API 的权限，解决「能不能部署」；后者允许作业申请 OIDC token（内含当前分支信息），Pages 借此确认部署来自合法分支，解决「来源是否可信」。两个缺一个，部署必挂。
2. `environment: name: github-pages`。指定部署环境，让 Pages 的分支/部署保护规则生效；`url` 字段把站点地址作为输出，显示在 Actions 摘要和仓库首页的 Environments 里，点一下直达网站。
3. `needs: build`。只有在拆成 build、deploy 两个作业时才需要——不设置的话，deploy 可能与 build 并行启动，傻等一个还不存在的构件，最后超时失败。上文的示例把构建和部署合在了同一个作业里，所以没有用到这个字段。

### 构建产物（artifact）有格式要求

`upload-pages-artifact` 打出的是 gzip 压缩的 tar 归档，限制有两条：tar 文件小于 10 GB；归档内不含符号链接或硬链接。

因此 `path` 一般只指向框架的构建输出目录（`dist`、`build`、`_site` 之类），别把 `node_modules` 打包进去。纯静态、无需构建的网站可以把 `path` 设为 `'.'` 全量上传。

---

## 常见注意事项与易错点

- 忘了切换 Source 为 GitHub Actions：工作流跑得再绿，Pages 设置里还是 `Deploy from a branch`，站点内容就永远不会更新。
- 把源码目录当成产物目录：`upload-pages-artifact` 的 `path` 指向构建输出（如 `./dist`），指错了部署上去的就是 `.md`、`.ts` 源文件，访问全是 404。
- 部署成功但页面是旧内容：Pages 有 CDN 缓存，更新可能延迟几分钟。`Ctrl + F5` 强刷或开无痕窗口确认，别急着改配置。

---

## 常见问题（FAQ）

- **可以用自定义域名吗？**
  可以。在 Pages 设置的 Custom domain 里填域名，并在 DNS 服务商处添加指向 `<username>.github.io` 的 CNAME 记录。
- **一个账号能有多个用户站点吗？**
  不能，每个账号（或组织）只有一个 `<username>.github.io`。更多站点请用项目站点（Project Site）。
- **push 后 Actions 没触发？**
  确认工作流文件在 `.github/workflows/` 目录下、扩展名为 `.yml` 或 `.yaml`，且 `on.push.branches` 包含你实际推送的分支名（`main` 还是 `master`）。
- **deploy 报错 `Resource not accessible by integration`？**
  99% 是 `permissions` 没写全，检查 `pages: write` 和 `id-token: write` 是否都在。

---

**参考链接：**

- [使用自定义工作流与 GitHub Pages | GitHub Docs](https://docs.github.com/zh/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Deploy GitHub Pages site · Actions Marketplace](https://github.com/marketplace/actions/deploy-github-pages-site)
- [部署你的 Astro 站点至 GitHub Pages | Astro Docs](https://docs.astro.build/zh-cn/guides/deploy/github/)
