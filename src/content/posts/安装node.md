---
title: 使用 nvm 安装和管理 Node.js
published: 2026-03-20
updated: 2026-09-03
pinned: false
description: "使用 nvm 安装、切换和管理多版本 Node.js，并配置镜像与 pnpm。"
tags: [Node.js, nvm, pnpm, 前端, 开发环境]
category: "Frontend"
draft: false
---
## 下载安装 nvm
下载地址：https://nvm.uihtm.com/doc/download-nvm

下载后直接默认路径安装就行，但我会习惯将我电脑上的全部开发环境放到 `D:\Dev\` ，就比如说安装nvm，我会放在`D:\Dev\nvm`，nodejs目录填 nvm 目录下面的一个子目录 `D:\Dev\nvm\nodejs\` 之后你通过 nvm 下载的所有 Node 版本，都会放在 `D:\Dev\nvm\` 里面。

## 使用pnpm

为什么要使用pnpm?

使用node自带的npm时，每个项目的 `node_modules` 都是独立的副本。而在使用 pnpm 时，依赖会被存储在全局的内容可寻址的存储中，项目的 `node_modules` 通过硬链接指向全局存储。因此，pnpm在磁盘上节省了大量空间，这与项目和依赖项的数量成正比，并且安装速度要快得多！

推荐直接安装pnpm二进制文件：

```powershell
Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression
```

更新pnpm：

```powershell
pnpm self-update
```
## 常用命令

这里整理了一下 nvm 最常用的命令：

```powershell
nvm -v					 #查看nvm版本
nvm list available		 #显示可安装的所有版本
nvm install <version>	 #安装指定版本
nvm list                 #查看已安装的版本
nvm use <version>        #切换到指定版本
nvm uninstall <version>  #卸载指定版本
```

## 配置镜像

在nvm中配置node镜像：

```powershell
nvm node_mirror https://npmmirror.com/mirrors/node/
```

配置npm仓库镜像：

```powershell
npm config set registry https://registry.npmmirror.com
```

配置pnpm仓库镜像：

```powershell
pnpm config set registry https://registry.npmmirror.com
```

配完之后，`npm install` 和 `pnpm install` 都会走淘宝镜像。

## package.json

`package.json`是一个包的清单文件。 它包含包的所有元数据，包括依赖项、标题、作者等等。 这是所有主要的 Node.js 包管理工具，包括 pnpm 的保留标准。

从 v16.13 开始，Node.js 附带 Corepack 用于管理包管理器。 这是一项实验性功能，因此你需要通过运行如下脚本来启用它：

```powershell
corepack enable [package manager]
```

Corepack提供了`packageManager`字段可以在项目中指定pnpm版本：

```json
{
    "packageManager": "pnpm@9.14.4"
}
```

补充：Node.js TSC 已正式投票决定从 Node.js 25+ 移除 Corepack，它在 Node 24 及之前版本中仍为实验性功能。Corepack 正在被逐步淘汰。

最新的方法是使用`devEngines.packageManager`管理pnpm版本，看看就行，目前用的人不多，目前主流方法还是通过`packageManager`固定包管理器版本：

```json
{
  "devEngines": {
    "packageManager": {
      "name": "pnpm",
      "version": ">=11.0.0 <12.0.0",
      "onFail": "warn"
    }
  }
}
```
