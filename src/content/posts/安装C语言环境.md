---
title: Windows 配置 C 语言开发环境
published: 2026-03-21
pinned: false
description: "在 Windows 上安装 C 语言开发环境，包含编译器选择、VS Code 配置与 CMake 管理项目的方法。"
tags: [C, C语言, 编译器, MinGW, CMake, Windows, 开发环境]
category: "Programming"
draft: false
---

>[!WARNING]
> **AI 生成内容声明**：
> 本文内容由人工智能辅助生成，经过人工审阅与校对完成。

---

学 C 语言的第一步不是写代码，是把环境搭好。环境搭不好，后面全是坑。

Windows 上配 C 语言环境，我只推荐一个方案：**MinGW-w64 + VS Code**。其他方案要么过时，要么太重，要么藏着各种暗坑。等你把这组工具用熟了，想换 CLion 或者研究其他工具都很容易。

这篇文章就是教你把这套环境搭起来，从安装到能跑多文件项目。

---

## 为什么选择 MinGW-w64 + VS Code

在 Windows 上写 C 代码，你有很多种选择。但大多数选择都有问题。

**Visual Studio** 是微软的官方方案，功能强大，但体积动不动超过好几个G。更重要的是，它默认使用 MSVC 编译器，而国内教材、在线评测系统、Linux 服务器都用 GCC。MSVC 和 GCC 有差异，比如 `scanf_s` 是微软的安全扩展，GCC 不认。你用 Visual Studio 写的代码，交到服务器上可能直接编译失败。

**Dev-C++** 轻量，但已经停止维护多年。它的代码补全、调试功能、Git 集成都停留在 20 年前的水平。你能用它写课程作业，但写大一点的项目会很痛苦。

**MinGW-w64 + VS Code** 的优势在于：

1. **编译器一致**：GCC 是 Linux 世界的事实标准，也是国内教材默认用的编译器。你写的代码在 Windows 上能跑，在 Linux 服务器上也能直接编译，不用改。
2. **轻量**：MinGW-w64 只有几百 MB，VS Code 启动快，不吃内存。
3. **灵活**：VS Code 是编辑器，不是 IDE。你装什么插件，它就有什么功能。不需要的功能可以不装，保持简洁。
4. **可迁移**：这套配置是跨平台的。你以后换 Mac 或 Linux，VS Code 和 GCC 的配置基本不变，只需要改几个路径。

---

## 安装 MinGW-w64

MinGW-w64 是 GCC 编译器在 Windows 上的移植版本。它把你的 C 代码编译成 Windows 能运行的可执行文件，同时保持和 Linux GCC 的行为一致。

### 下载

官网地址：https://winlibs.com/

官网下载慢的话，可以用国内网盘：

- 123 云盘：https://www.123865.com/s/JnJ5Vv-GWIMA?pwd=ONsx#
- 百度网盘：https://pan.baidu.com/s/1MY19qEViOL0W4qTfl3CKFA?pwd=pcae
- 夸克网盘：https://pan.quark.cn/s/769ab8ff174c?pwd=dkm2

下载完成后解压。这里有一个关键细节：**路径不能有中文，也不能有空格**。

为什么？因为 Windows 的命令行工具对路径处理有历史遗留问题。空格会被解析成参数分隔符，中文在某些旧版工具链里会乱码。你如果把 MinGW 放在 `C:\Program Files` 或 `D:\软件\mingw64`，后面配置环境变量时可能会遇到各种奇怪的错误，比如「找不到命令」「路径不存在」「gcc 不是内部或外部命令」。

建议放在 `D:/mingw64`，根目录，纯英文，没有空格。这是最少麻烦的选择。

---

### 配置环境变量

解压完成后，需要把 MinGW 的 bin 目录添加到系统环境变量。环境变量是操作系统用来查找可执行文件的机制。当你在终端输入 `gcc` 时，系统会在 Path 里列出的目录中依次查找，找到就执行，找不到就报错。

#### 方式一：使用脚本

解压后的目录里有一个 `mingwvars.bat`，双击运行。这个脚本会临时把 bin 目录加到当前终端的 Path 里，但关掉终端就失效。每次新开终端都要重新运行，麻烦，而且容易忘。

#### 方式二：手动配置

1. 右键「此电脑」-「属性」
2. 点击「高级系统设置」
3. 点击「环境变量」
4. 在「系统变量」里找到 Path，双击编辑
5. 新建一个条目，输入 `D:/mingw64/bin`（改成你实际的解压路径）
6. 确定保存

**重要：配置完成后，重启你的终端。**

Windows 的环境变量不会自动同步到已打开的终端。你如果在配置之前就开了 PowerShell 或 CMD，那个终端里的 Path 还是旧的，输入 `gcc` 会提示找不到命令。这不是你的问题，是 Windows 的设计。关掉终端重新打开，或者重启电脑，都能解决。

---

### 验证安装

打开 PowerShell 或者 CMD，输入：

```powershell
gcc --version
```

能看到类似这样的输出，说明配置成功：

```
gcc.exe (MinGW-W64 x86_64-posix-seh, built by Brecht Sanders) 13.2.0
Copyright (C) 2023 Free Software Foundation, Inc.
```

如果提示 "gcc 不是内部或外部命令"，按以下顺序排查：

1. **检查 Path**：环境变量里有没有 `D:/mingw64/bin`，路径对不对
2. **检查路径格式**：有没有中文或空格
3. **重启终端**：配置环境变量之前打开的终端，需要重启才能读到新配置

这三件事排查完，99% 的问题都能解决。剩下 1% 建议重启电脑，重启能解决 90% 的问题，但解决不了路径带中文的那个。

---

## 安装 VS Code

VS Code 是微软出品的代码编辑器，2015 年发布，现在是最流行的代码编辑器之一。它的设计理念是「编辑器 + 插件」，核心功能轻量，需要什么功能就装什么插件。

下载地址：https://code.visualstudio.com/

安装过程没什么可说的，一直点下一步就行。建议勾选「添加到 PATH」，这样可以在终端用 `code` 命令打开文件。

### 推荐安装的插件

| 插件名称 | 提供者 | 功能 |
|---------|-------|------|
| C/C++ | Microsoft | C/C++ 语言支持，包括代码补全、语法高亮、调试 |
| CMake Tools | Microsoft | CMake 项目管理插件 |

装完这两个插件，VS Code 就能支持 C 语言开发了。

为什么不推荐装更多插件？因为插件越多，启动越慢，冲突越多。C/C++ 插件已经包含了 IntelliSense 代码补全、语法检查、调试支持，够用。CMake Tools 用来管理多文件项目，后面会讲到。其他插件等你遇到具体需求再装，不要提前预装一堆「可能有用」的东西。

---

## 用命令编译 C 程序

环境搭好，先写个最简单的程序验证一下。这一步是为了确认 gcc 能正常工作，也是理解 C 语言编译过程的基础。

### 创建测试文件

新建文件 `main.c`：

```c
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
```

这段代码的作用是：包含标准输入输出库，定义主函数，打印一行文字，返回 0 表示正常结束。`#include <stdio.h>` 是预处理指令，告诉编译器把标准库的头文件内容插入到这里。`printf` 是标准库函数，负责把字符串输出到终端。

### 编译并运行

在终端执行：

```powershell
gcc main.c -o main.exe
```

这条命令做了三件事：

1. **预处理**：处理 `#include` 和宏定义，把 `stdio.h` 的内容插入到代码里
2. **编译**：把 C 代码翻译成汇编代码
3. **链接**：把汇编代码和目标文件链接成可执行文件

`-o main.exe` 指定输出文件名为 `main.exe`。如果不加 `-o`，Windows 下默认输出 `a.exe`，Linux 下默认输出 `a.out`。

编译成功后，当前目录会生成 `main.exe`，运行它：

```powershell
.\main.exe
```

看到输出 "Hello, World!" 就是成功了。

这一步跑不通，后面不用看了，回去检查环境变量。

---

## 配置 VS Code 调试

命令行编译能跑，但每次手动输入麻烦。VS Code 可以配置一键编译调试，还能打断点、看变量、单步执行。

VS Code 的调试系统由两部分组成：

1. **tasks.json**：定义「编译任务」，告诉 VS Code 怎么把代码编译成可执行文件
2. **launch.json**：定义「启动配置」，告诉 VS Code 怎么运行调试器

调试流程是：按 F5 → 执行 preLaunchTask（编译）→ 启动调试器 → 运行程序。

在项目根目录创建 `.vscode` 文件夹，里面放两个配置文件：

### tasks.json（编译任务）

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "gcc build",
      "type": "shell",
      "command": "gcc",
      "args": [
        "-g",
        "${fileBasename}",
        "-o",
        "${fileBasenameNoExtension}.exe"
      ],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": ["$gcc"]
    }
  ]
}
```

配置说明：

- `"label": "gcc build"`：任务名称，launch.json 会通过这个名字引用它
- `"type": "shell"`：在 shell 里执行命令
- `"command": "gcc"`：执行的命令
- `"args"`：传递给 gcc 的参数
  - `-g`：生成调试信息，这样调试器才能知道代码行号和变量名
  - `${fileBasename}`：当前打开的文件名，VS Code 的变量
  - `-o`：指定输出文件
  - `${fileBasenameNoExtension}.exe`：去掉扩展名的文件名加 `.exe`
- `"group": {"kind": "build", "isDefault": true}`：这是默认的构建任务，按 Ctrl+Shift+B 会执行它
- `"problemMatcher": ["$gcc"]`：捕获 gcc 的编译错误，显示在问题面板里

### launch.json（调试配置）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "C Debug",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/${fileBasenameNoExtension}.exe",
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "miDebuggerPath": "gdb",
      "externalConsole": false,
      "preLaunchTask": "gcc build"
    }
  ]
}
```

配置说明：

- `"name": "C Debug"`：配置名称，显示在调试下拉框里
- `"type": "cppdbg"`：使用 C/C++ 调试器
- `"request": "launch"`：启动调试
- `"program"`：要调试的可执行文件路径
- `"cwd"`：工作目录
- `"MIMode": "gdb"`：使用 GDB 作为调试器
- `"miDebuggerPath": "gdb"`：GDB 的可执行文件路径，因为在环境变量里，直接写 `gdb` 就行
- `"externalConsole": false`：在 VS Code 内置终端里运行，不弹出新窗口
- `"preLaunchTask": "gcc build"`：启动调试前先执行编译任务

配好后，打开 C 源文件，按 F5 就能编译并启动调试。如果代码有语法错误，编译会失败，问题面板会显示错误信息。如果编译成功，程序会启动并在第一行断点处暂停（如果你打了断点的话）。

---

## 用 CMake 管理多文件项目

单个文件的程序用 gcc 直接编译就行。但代码量大了，要拆成多个文件管理，还要分头文件和源文件，手动编译就很烦。

假设你有这样的项目结构：

```
.
├── main.c
├── utils.c
├── utils.h
├── math.c
├── math.h
└── ...更多文件
```

手动编译的命令会变成：

```powershell
gcc main.c utils.c math.c -o program.exe
```

每次增删文件都要改命令，还要记住哪些文件需要编译。更复杂的情况是，有些文件需要先编译成库，有些文件依赖其他文件，编译顺序也有讲究。

CMake 是一个构建系统生成器。你写一个 `CMakeLists.txt` 描述项目结构和编译规则，CMake 会根据你的平台生成对应的构建文件（Windows 下是 Visual Studio 项目或 Makefile，Linux 下是 Makefile），然后自动处理编译顺序、依赖关系、增量编译等细节。

### 项目结构示例

一个典型的 C 项目结构：

```
.
├── CMakeLists.txt
├── include
│   └── hello.h
└── src
    ├── hello.c
    └── main.c
```

- `include/`：放头文件（.h），声明函数和接口
- `src/`：放源文件（.c），实现函数逻辑
- `CMakeLists.txt`：CMake 的配置文件

这种分离的好处是：头文件暴露接口，源文件隐藏实现。其他代码只需要包含头文件就能调用函数，不需要关心具体怎么实现的。

`hello.h`（头文件）：

```c
#ifndef HELLO_H
#define HELLO_H

void say_hello();

#endif
```

`#ifndef HELLO_H` 是「头文件保护」，防止同一个头文件被多次包含。如果多个源文件都包含了这个头文件，编译器只会处理一次，避免重复定义错误。

`hello.c`（函数实现）：

```c
#include <stdio.h>
#include "../include/hello.h"

void say_hello() {
    printf("Hello, World!\n");
}
```

注意 include 路径。`#include "../include/hello.h"` 是相对路径，从 `hello.c` 的位置出发，上一级目录的 `include` 文件夹里找 `hello.h`。也可以用 `#include "hello.h"`，然后在 CMakeLists.txt 里用 `include_directories` 指定头文件搜索路径。两种写法都可以，但一个项目里要统一，不要混着用。

`main.c`（主程序）：

```c
#include "hello.h"

int main() {
    say_hello();
    return 0;
}
```

`main.c` 只需要包含头文件 `hello.h`，就能调用 `say_hello()` 函数。它不需要知道 `say_hello()` 是在哪个源文件里实现的，这是「分离编译」的核心思想。

### 编写 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.10)

project(MyCProject C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_BUILD_TYPE Debug)

include_directories(include)

add_executable(main
    src/main.c
    src/hello.c
)
```

配置说明：

- `cmake_minimum_required(VERSION 3.10)`：指定最低 CMake 版本，低于这个版本会报错
- `project(MyCProject C)`：项目名称和语言，C 表示 C 语言（不是 C++）
- `set(CMAKE_C_STANDARD 11)`：使用 C11 标准，支持 `_Generic`、匿名结构体等新特性
- `set(CMAKE_BUILD_TYPE Debug)`：调试模式，生成调试信息，不做优化
- `include_directories(include)`：添加头文件搜索路径，这样代码里写 `#include "hello.h"` 就能找到
- `add_executable(main ...)`：定义可执行文件目标，名称是 `main`，源文件列表是后面的那些

CMake 的优势在于跨平台。同样的 `CMakeLists.txt`，在 Windows 上可以用 Visual Studio 编译，在 Linux 上可以用 GCC 编译，在 Mac 上可以用 Clang 编译，不需要为每个平台写不同的构建脚本。

### 配置 CMake Tools

在 VS Code 里配置 CMake Tools：

1. 点击左侧 CMake 图标，点击「配置」按钮，选择 GCC 作为工具包
2. 或者点击 VS Code 底部的工具包按钮，选择 GCC

CMake Tools 会扫描系统里可用的编译器，列出你安装的 MinGW-w64。选择它之后，CMake Tools 会自动生成 build 目录，在里面放生成的构建文件。

CMake 支持「 out-of-source 」构建，意思是编译生成的文件和源代码分开。所有中间文件、可执行文件都在 `build/` 目录里，源代码目录保持干净。这是最佳实践，避免把 `.o`、`.exe` 等生成文件和源代码混在一起。

---

### 调试 CMake 项目

CMake 项目的调试配置和单文件项目稍有不同，主要是可执行文件的路径变了。

**tasks.json：**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "cmake build",
      "type": "shell",
      "command": "cmake",
      "args": ["--build", "build"],
      "group": "build",
      "problemMatcher": []
    }
  ]
}
```

`cmake --build build` 的意思是：在 `build` 目录里执行构建。CMake 会根据 `build` 目录里的构建文件（Makefile 或 Visual Studio 项目）调用对应的工具完成编译。

**launch.json：**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "CMake Debug",
      "type": "cppdbg",
      "request": "launch",
      "program": "${workspaceFolder}/build/main.exe",
      "cwd": "${workspaceFolder}",
      "MIMode": "gdb",
      "miDebuggerPath": "gdb",
      "externalConsole": false,
      "preLaunchTask": "cmake build"
    }
  ]
}
```

注意 `program` 的路径是 `${workspaceFolder}/build/main.exe`。CMake 把可执行文件输出到 `build` 目录里，而不是项目根目录。这是因为 CMake 默认使用 out-of-source 构建，所有生成物都放在 build 目录。

配好后按 F5 就能调试运行。CMake 会自动处理依赖关系，只编译修改过的文件，比手动用 gcc 逐个编译快得多。

---

## 其他方案

上面这套方案是我认为最适合大多数人的。如果你有特殊需求，可以考虑下面这些：

### Dev-C++

老牌轻量 IDE，小熊猫改版比原版好用。适合只想快速跑通代码、不想折腾配置的人。

下载地址：http://royqh.net/redpandacpp/download/

选后缀带 MinGW64 的文件下载，安装完就能用。

但说实话，这工具的上限就在那里。你能用它写课程作业，但写大一点的项目会很痛苦。没有代码补全，没有调试，没有 Git 集成。它的定位是「让初学者快速入门」，不是「支撑专业开发」。

### Visual Studio

功能强大的 IDE，体积也大。默认用 MSVC 编译器，和国内教材用的 GCC 有些差异。

下载地址：https://visualstudio.microsoft.com/zh-hans/

安装时勾选「使用 C++ 的桌面开发」。

如果你确定自己只会在 Windows 上写代码，且不在乎和教材的差异，可以用。但如果你以后要在 Linux 服务器上跑代码，建议还是 GCC。MSVC 的一些扩展（如 `scanf_s`）不是标准 C，GCC 不认。

Visual Studio 的真正优势是调试器和性能分析工具，Visual Studio 自带的调试器为 x64dbg，在调试启动调试窗口后，按住 Ctrl + Alt + D可以打开反汇编的窗口，可以清晰的看到编写的C语言源码，编译的汇编代码和二进制在内存中的地址。这些是 VS Code + GDB 比不了的。

如果你写大型 C++ 项目，Visual Studio 是更好的选择。但纯 C 项目，MinGW-w64 + VS Code 够用。

### CLion

JetBrains 出的专业 C/C++ IDE，内置 CMake 支持。非商业用途现在免费。

下载地址：https://www.jetbrains.com/zh-cn/clion/

需要配置 MinGW-w64 作为工具链，路径指向 `D:/mingw64`。

这工具很好，但很重。启动慢，吃内存。如果你的电脑配置一般，VS Code 更轻量。CLion 的优势是智能提示比 VS Code 强，重构功能更完善。但 VS Code 免费、开源、插件多，对大多数人来说够用。

---

## 常见问题

**问题一：提示 "gcc 不是内部或外部命令"**

环境变量没配好。检查：

1. bin 目录已经加到 Path 里
2. 重启终端或者重启电脑后再试
3. 路径没有中文或者空格

**问题二：CMake 找不到编译器**

1. 确认 `gcc --version` 能正常输出版本
2. 关掉所有终端，重新打开再执行 CMake

CMake 会缓存编译器信息，如果之前配置失败，缓存可能损坏。删掉 `build` 目录重新配置，或者执行 `cmake --fresh` 强制刷新。

**问题三：VS Code 调试时提示找不到程序**

检查 `launch.json` 里的 `program` 路径是否正确。CMake 项目的可执行文件在 build 目录里，单文件项目和 CMake 项目的配置不一样。

**问题四：中文输出乱码**

Windows 的编码问题。在代码里加一行：

```c
#include <windows.h>
SetConsoleOutputCP(CP_UTF8);
```

或者在终端执行 `chcp 65001` 切换到 UTF-8 编码。

这是 Windows 的锅，不是你的。Linux 和 macOS 默认 UTF-8，不会有这个问题。Windows 历史遗留的 GBK 编码和 UTF-8 混用，导致各种乱码。上面的代码强制把控制台编码设为 UTF-8，和源代码编码一致，就能正常显示中文。

**问题五：调试时断点不生效**

检查编译时有没有加 `-g` 参数。`-g` 生成调试信息，没有它 GDB 不知道代码对应哪一行，断点就不会生效。CMake 项目里 `set(CMAKE_BUILD_TYPE Debug)` 会自动加 `-g`，Release 模式不会。

---

环境搭好只是开始，后面还有指针、内存、数据结构在等着你。但至少，你不用再为配置问题浪费时间了。
