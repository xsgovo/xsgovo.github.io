---
title: Windows 配置 Python 环境——从安装到项目管理
published: 2026-04-09
pinned: false
description: "在 Windows 上从零开始配置 Python 开发环境，包括 Python 安装、虚拟环境管理、包管理工具选择与项目工程化实践。"
tags: [Python, Windows, 开发环境, uv, conda, 包管理]
category: "Backend"
draft: false
---

>[!WARNING]
> **AI 生成内容声明**：
> 本文内容由人工智能辅助生成，经过人工审阅与校对完成。

---

由于 Python 早期的工程结构非常的放飞自我，官方的 Python 体系在早期就是一个烂摊子，于是就有了各式各样的第三方工具。

这篇文章，就是教你如何使用这些工具快速初始化你的项目。

---

## 先搞清楚你要什么

Python 环境管理工具可以分成两大派系：

### 第一派：PyPI 生态

**代表工具**：`pip`、`venv`、`uv`、`poetry`、`pdm`

- **pip**: Python 官方包管理器，最基础
- **uv**: 用 Rust 重写，速度极快，目前最推荐
- **poetry**: 功能全面，适合库开发
- **pdm**: 类似 poetry，但更符合 PEP 标准

**特点**：只管理 Python 包，从 PyPI 下载。轻量、现代、速度快。

**适合**：Web 开发、自动化脚本、工具类项目、库开发。

### 第二派：Conda 生态

**代表工具**：Miniconda、Miniforge、mamba、pixi

- **conda**: 跨语言包管理器，能管 Python + 系统级库
- **miniforge**: 社区版 conda，免费，内置 mamba
- **mamba**: 用 C++ 重写的 conda，速度快
- **pixi**: 用 Rust 写的 conda 包管理器，类似 uv 的体验

**特点**：conda **从根本上与官方 Python 走的不是一条路**，拥有自己的配置文件、软件仓库，甚至连 Python 解释器都是自己编译的。支持 Go、Rust、C++、R 等多种语言，本质上是一个**跨语言的独立开发平台**，解决深度学习的环境地狱。

**适合**：数据分析、机器学习、深度学习。

### 核心原则

**不要把任何 Python 添加到系统环境变量。**

这是血泪教训。一旦 PATH 里有多个 Python，各种工具会互相打架，排查问题能浪费你一整天。

正确的做法：
- PyPI 派：用 uv 管理 Python 版本，通过 `uv run` 调用
- Conda 派：用 conda 创建隔离环境，通过 `conda activate` 切换

我见过有人在 conda 环境里用 pip 装包，装完发现 CUDA 版本对不上，PyTorch 直接罢工。排查了三个小时，最后重装整个环境。

所以先问自己：我要不要碰深度学习？

不碰，走 PyPI 派。要碰，走 Conda 派。

---

## 准备工作：安装 PyCharm

写 Python 代码需要一个趁手的编辑器。推荐使用 PyCharm：

**官方下载地址：** https://www.jetbrains.com/zh-cn/pycharm/

PyCharm 是 JetBrains 开发的 Python 专用 IDE，分两个版本：
- **Community（社区版）**：免费，功能足够日常使用
- **Professional（专业版）**：付费，支持 Web 开发、Django 等高级功能

现在社区版和专业版整合到一起了，直接下载就行。

---

## 方案一：PyPI 派（uv 管理，推荐）

这是目前最轻量、最现代的选择。不需要下载官方 Python 安装包，一切交给 uv。

### 第一步：安装 uv

uv 是一个用 Rust 写的 Python 项目管理工具，速度比 pip 快 10 到 100 倍。

使用 PowerShell 一键安装：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

这个命令会安装到 `C:\Users\你的用户名\.local\bin`，装完验证：

```powershell
uv --version
```

### 第二步：用 uv 安装 Python

uv 可以自动下载并管理 Python 版本，不需要去 python.org 下载安装包。

安装最新版 Python：

```powershell
uv python install
```

安装指定版本：

```powershell
uv python install 3.14
```

查看已安装的版本：

```powershell
uv python list
```

Python 会被安装到 uv 的管理目录（如 `%APPDATA%\uv\python`）中。

### 第三步：创建你的第一个项目

找个干净的文件夹，执行：

```powershell
uv init my-project
```

uv 会自动：
1. 下载最新的 Python（如果还没装）
2. 生成 `pyproject.toml` 配置文件
3. 创建 `.venv` 虚拟环境

生成的 `pyproject.toml` 长这样：

```toml
[project]
name = "my-project"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.14"
dependencies = []
```

`requires-python` 声明了项目需要的 Python 版本，`dependencies` 是项目依赖的包。

### 第四步：安装依赖

假设你要用 requests 写个爬虫：

```powershell
uv add requests
```

**这条命令背后发生了什么？**

1. **解析依赖**：uv 去 PyPI 查询 requests 的最新版本，以及它依赖的其他包
2. **写入配置**：把 `requests = "^2.31.0"` 写进 `pyproject.toml`
3. **生成锁文件**：创建 `uv.lock`，精确记录所有依赖的具体版本号和哈希值
4. **安装包**：把 requests 和所有依赖装进 `.venv`

整个过程几秒钟完成。

### 第五步：在 PyCharm 中打开项目

**命令行把项目建好之后，用 PyCharm 打开它：**

1. 打开 PyCharm，选择 **打开**，选中刚才 `uv init` 创建的项目目录
2. 进入 **设置 → Python → 解释器**
3. 点击右上角 **添加解释器 → 添加本地解释器**
4. 左侧选 **生成新的**，类型选选 **uv**

PyCharm 识别到 `.venv` 之后，编辑器的自动补全、跳转定义、类型推断全部生效。

> 后续用 `uv add` 安装新包时，PyCharm 会自动检测到 `.venv` 的变化并刷新索引，不需要手动操作。

**或者用 PyCharm 直接创建：**

1. 打开 PyCharm，选择**新建项目**。

2. 在解释器类型一栏选择需要的解释器，PyCharm 现在默认支持 venv、uv 和 conda 解释器。

3. 通常情况下 PyCharm 会自动检测到这些工具的路径，如果没有，请手动添加。下次新建项目 PyCharm 就会记住这些路径。

4. 点击创建就行了。


### 第六步：运行代码

如果你使用 PyCharm，直接点击顶部的运行按钮就可以了。

或者使用 `uv run` 运行代码，它会自动找到对应的环境：

```powershell
uv run python main.py
```

**`uv run` 的工作原理**

`uv run` 会：

1. 检查当前目录有没有 `.venv`
2. 临时把 `.venv\Scripts` 加到 PATH 最前面
3. 在这个环境下执行命令
4. 命令结束后恢复原 PATH

所以你不需要手动 `activate`，也不用担心忘记 `deactivate` 导致全局环境被污染。

### 验证安装

确认环境是否正常工作：

```powershell
uv run python --version
uv pip list
```

如果能看到 Python 版本号和已安装的包列表，说明一切正常。

### 常用命令速查

```powershell
uv python install 3.14      # 安装 Python 3.14
uv python list              # 查看已安装的 Python 版本
uv python uninstall 3.14	# 卸载 Python 3.14
uv add <package_name>       # 安装包并声明依赖
uv add --dev <package_name> # 安装开发依赖（如 pytest）
uv sync                     # 根据 pyproject.toml 还原环境
uv run <file_name>          # 在虚拟环境中运行文件
uv pip list                 # 查看已安装的包
```

### 换源

PyPI 官方源服务器在国外，国内访问经常慢。配置清华镜像：

```powershell
uv pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

或者临时用：

```powershell
uv add requests -i https://pypi.tuna.tsinghua.edu.cn/simple
```

常用国内镜像：
- 清华：`https://pypi.tuna.tsinghua.edu.cn/simple`
- 阿里云：`https://mirrors.aliyun.com/pypi/simple/`
- 豆瓣：`https://pypi.doubanio.com/simple/`

---

## 方案二：Conda 派（深度学习专用）

如果你要装 PyTorch、TensorFlow，或者任何依赖 CUDA 的库，用 Conda 派。

### 为什么深度学习必须用 Conda？

深度学习框架底层依赖大量 C/C++/CUDA 编写的库：
- CUDA：NVIDIA 的并行计算平台
- cuDNN：深度神经网络加速库
- MKL：Intel 数学核心库

这些不是 Python 包，是系统级的二进制库。pip 只能管 Python 包，管不了这些。

Conda 的优势在于：
1. **跨语言包管理**：能安装 Python 包 + 系统级库
2. **预编译二进制**：Windows 上编译 CUDA 库非常麻烦，conda 直接提供编译好的版本
3. **版本协调**：PyTorch 需要 CUDA 11.8 还是 12.1？conda 会帮你算清楚

### 选择哪个工具？

| 工具 | 特点 | 推荐度 |
|------|------|--------|
| **Anaconda** | 全家桶，3GB+，商业收费 | ⭐ 不推荐 |
| **Miniconda** | 精简版，只含 conda | ⭐⭐ 可用 |
| **Miniforge** | 社区版，免费，内置 mamba | ⭐⭐⭐⭐⭐ 最推荐 |
| **pixi** | Rust 写的，类似 uv 的体验，IDE 支持有限 | ⭐⭐⭐⭐ 新兴 |

**为什么选 Miniforge？**

- Anaconda 的默认频道 2020 年起对商业用途收费
- Miniforge 默认用 conda-forge，完全免费
- Miniforge 内置 Mamba，安装速度快 4-5 倍

### 安装 Miniforge

**官方下载地址：** https://conda-forge.org/miniforge/

Windows 用户找 `Miniforge3-Windows-x86_64.exe` 下载。

> **警告**：不要将 Miniforge 安装到权限受限的文件夹中，比如 `Program Files`。

安装步骤：
1. 运行安装包
2. 安装路径建议选纯英文，比如 `D:\miniforge3`
3. **默认取消勾选** "Add Miniforge3 to my PATH environment variable"
4. 完成安装

由于 Miniforge3 添加环境变量是通过修改注册表实现的，所以不建议添加到环境变量。

既然没有添加到环境变量，你需要通过完整路径调用 conda。一般路径 `D:\miniforge3\Scripts\conda.exe`。

不过也不用担心，安装完成后你的电脑会出现一个 `Miniforge Prompt` 的程序，打开它就可以使用 conda 了。

### 配置镜像

打开 `Miniforge Prompt`，在出现的终端前有类似括号代表当前的环境：

```powershell
(base) C:\Users\user>
```

conda 默认源在国外，国内访问慢。配置清华镜像：

```powershell
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
conda config --set show_channel_urls yes
```

### 创建环境

每个项目一个环境，不要往 base 里装东西：

```powershell
conda create -n my_env python=3.14
```

切换到创建的环境：

```powershell
conda activate my_env
```

当看见终端前变成 `(my_env)` 时就代表切换成功了。

**为什么不要往 base 装？**

base 是 conda 自己的运行环境。如果你在 base 里乱装包，可能破坏 conda 本身的依赖，导致 conda 命令都跑不起来。

养成习惯：每个项目 `conda create -n 环境名`，隔离干净。

**删除环境**：

先退出到 `base` 环境。

为了防止误删，建议先查看一下现有的环境列表，确认你要删除的环境名称拼写无误：

```powershell
conda env list
```

删除指定的环境：

```powershell
conda env remove --name my_env
```

### 安装依赖

在激活的环境中安装 Python 包：

```powershell
conda install requests
```

如果 conda 找不到某个包，再用 pip 安装：

```powershell
pip install some-package
```

### 安装深度学习框架

以 PyTorch 为例：

```powershell
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
```

**这条命令拆解**

- `pytorch torchvision torchaudio`：PyTorch 核心包 + 视觉/音频工具包
- `pytorch-cuda=12.1`：指定 CUDA 12.1 版本
- `-c pytorch`：从 pytorch 频道下载
- `-c nvidia`：从 nvidia 频道下载 CUDA 相关库

conda 会自动计算依赖关系，确保 PyTorch、CUDA、cuDNN 版本兼容。

如果用 pip 装 PyTorch，你得自己去 NVIDIA 官网下载 CUDA，配置环境变量，确保版本匹配。一步错，PyTorch 就检测不到 GPU。

### 一个原则

在 conda 环境里，**优先用 conda install**，找不到的包再用 pip install。顺序反了容易把环境搞乱。

**为什么顺序重要？**

conda 和 pip 的依赖解析器不一样。conda 装包时会考虑整个环境的依赖图，pip 只考虑 Python 包。

如果你先用 pip 装了某个包，再用 conda 装其他包，conda 可能不知道 pip 装的包的存在，导致依赖冲突。

正确顺序：
1. `conda install` 装所有能装的（尤其是 CUDA 相关的）
2. `pip install` 补 conda 找不到的包

### 在 PyCharm 中使用 Conda 环境

环境建好之后，把 PyCharm 指向它：

1. 打开 PyCharm，选择 **打开**，选中刚才 `uv init` 创建的项目目录
2. 进入 **设置 → Python → 解释器**
3. 点击右上角 **添加解释器 → 添加本地解释器**
4. 右侧选 **选择现有**，类型选选 **conda**
5. 点击右侧下拉框，PyCharm 通常能自动列出已有的 conda 环境。

配置完成后，PyCharm 会索引这个环境里的所有包，自动补全和类型推断随即生效。

**或者用 PyCharm 直接创建：**

1. 打开 Pycharm，点击**新建项目**
2. 在解释器类型一栏选择需要的解释器，选择 Conda 解释器。
3. 通常情况下 PyCharm 会自动检测到这些工具的路径，如果没有，请手动添加。下次新建项目 PyCharm 就会记住这些路径。

4. 点击创建就行了。


### 验证安装

确认环境是否正常工作：

```powershell
python --version
conda list
```

如果安装了 PyTorch，可以验证 GPU 是否可用：

```powershell
python -c "import torch; print(torch.cuda.is_available())"
```

输出 `True` 表示 GPU 可以被 PyTorch 调用。

### 将 Conda 的项目分享给他人

首先激活你创建的 conda 环境：

```powershell
conda activate your_env
```

使用 `conda env export` 命令导出配置：

```powershell
conda env export > environment.yml
```

导出的文件会出现在当前目录。

对方拿到 `environment.yml` 文件后，在自己的终端执行以下命令即可创建并激活环境：

```powershell
conda env create -f environment.yml
```

### 常用命令速查

```powershell
conda create -n <env_name> python=3.14	# 创建环境
conda list								# 列出环境
conda activate <env_name>				# 激活环境
conda deactivate						# 退出当前环境
conda remove -n <env_name> --all		# 删除环境
conda env export > environment.yml		# 导出环境
conda env create -f environment.yml		# 导入环境
conda install <package_name>			# 安装包
conda update <package_name>				# 更新包
conda remove <package_name>				# 卸载包
```



## 常见问题

### PowerShell 执行脚本报错

如果遇到：

```
无法加载文件，因为在此系统上禁止运行脚本
```

解决：

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

只需要执行一次。

### 中文路径问题

Python 和很多第三方库对中文路径支持不好。建议：
- 安装路径用纯英文，如 `D:\miniforge3` 而不是 `D:\软件\miniforge3`
- 项目路径也别用中文

**为什么中文路径会出问题？**

Windows 默认用 GBK 编码，而 Python 3 默认用 UTF-8。路径里有中文时，编码不一致可能导致文件打不开、导入模块失败、编译 C 扩展时报错。

最简单的解决方案：统一用英文路径。

### 多个 Python 版本共存

**用 uv：**

```powershell
uv python install 3.13 3.14
uv init --python 3.13 my-old-project
uv init --python 3.14 my-new-project
```

uv 会自动下载并管理多个 Python 版本，每个项目可以指定用哪个版本。

**用 conda：**

```powershell
conda create -n py313 python=3.13
conda create -n py314 python=3.14
```

conda 通过不同环境隔离不同 Python 版本，切换环境就是切换 Python 版本。

### uv 命令找不到

如果安装 uv 后提示命令不存在，说明 PATH 没有配置好。

**解决方法：**

1. 找到 uv 的安装位置（通常是 `C:\Users\你的用户名\.local\bin`）
2. 手动添加到 PATH：
   - `Win + S` 搜索"环境变量"
   - 编辑用户变量的 `Path`
   - 添加 `C:\Users\你的用户名\.local\bin`
3. 重启 PowerShell

或者直接用完整路径调用：

```powershell
C:\Users\你的用户名\.local\bin\uv.exe --version
```

---

## 附录 A：更新和卸载

### 更新 uv

如果你是通过脚本安装的话，你可以升级 uv：

```powershell
uv self update
```

### 卸载 uv

清理存储的数据（可选）：

```powershell
uv cache clean
rm -r "$(uv python dir)"
rm -r "$(uv tool dir)"
```

删除 uv 和 uvx 二进制文件：

```powershell
rm $HOME\.local\bin\uv.exe
rm $HOME\.local\bin\uvx.exe
```

### 更新 Miniforge

一般不推荐直接更新 Miniforge 本体，如果你一定要更新，请卸载并从官网重新下载安装最新版本的 Miniforge。

### 卸载 Miniforge

没什么好说的，直接在 Windows 应用管理直接卸载就可以了。

---

## 附录 B：运行别人的旧项目

### 场景一：有 requirements.txt

`requirements.txt` 是一种早期的分享虚拟环境的方法，使用 `pip freeze` 就可以将安装的包导出：

```powershell
pip freeze > requirements.txt
```

如果需要安装：

```powershell
pip install -r requirements.txt
```

让 pip 自动找兼容版本：

```powershell
pip install -r requirements.txt --upgrade
```

### 场景二：有 pyproject.toml

目前 Python 官方指定了 `pyproject.toml` 作为**统一的项目配置文件**。

**uv 项目：**

```powershell
uv sync
```

**poetry 项目：**

```powershell
poetry install
```

**pdm 项目：**

```powershell
pdm install
```

### 场景三：什么都没有

没招，只能自己一个个找了。

---

## 附录 C：其他工具速览

### poetry

功能全面的 Python 包管理工具，适合库开发。

```powershell
pip install poetry			# 安装poetry
poetry init					# 初始化
poetry add requests			# 安装包
poetry run python main.py	# 运行文件
```

### pdm

类似 poetry，但更符合 PEP 标准。

```powershell
pip install pdm			# 安装pdm
pdm init				# 初始化
pdm add requests		# 安装包
pdm run python main.py	# 运行文件
```

### pixi

用 Rust 写的 conda 包管理器，结合 conda 能力和 uv 体验。

这里稍微介绍一下 pixi，pixi 通过在项目当前目录创建了一个 `.pixi` 文件夹用来存放所有环境依赖，但是它是由 `pixi.toml` 来统一管理的，和 Python 的 `pyproject.toml` 并不完全兼容。

官网：`https://pixi.prefix.dev/latest/`

安装 pixi：

```powershell
powershell -ExecutionPolicy ByPass -c "irm -useb https://pixi.sh/install.ps1 | iex"
```

更新 pixi：

```powershell
pixi self-update
```

常用命令：

```powershell
pixi init my-project	# 初始化
pixi add python=3.14	# 安装Python环境
pixi add nodejs			# 安装Node环境
pixi add pytorch		# 安装pytorch包
pixi run python main.py	# 运行文件
```

pixi 相对较新，社区生态还在成长中。

---

## 选择建议

| 场景 | 推荐方案 | 理由 |
|------|----------|------|
| Web 开发 / 自动化脚本 / 工具类项目 | uv | 轻量、现代、速度极快 |
| 库开发 / 要发布到 PyPI | uv 或 poetry | 支持构建和发布 |
| 数据分析 / 机器学习 / 深度学习 | Miniforge | 能管 CUDA 等系统级依赖 |
| 同时维护多个 Python 版本 | uv 或 conda | 都能隔离管理 |
| 公司项目要求合规（无商业风险） | Miniforge | conda-forge 免费 |

---

## 结语

**核心原则再强调一遍：非必要就不要把任何 Python 添加到系统环境变量。**

- PyPI 派：用 uv 管理 Python，通过 `uv run` 调用
- Conda 派：用 miniforge 创建隔离环境，通过 `conda activate` 切换

现在，去创建一个项目试试吧。如果遇到问题，回到「常见问题」章节看看，或者检查一下是不是混用了两派的工具。

祝编码愉快。
