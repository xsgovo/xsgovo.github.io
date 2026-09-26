---
title: Ubuntu 安装 MySQL
published: 2026-03-08
pinned: false
description: "介绍在 Ubuntu 系统上安装、配置并开启远程访问 MySQL 数据库的步骤。"
tags: [MySQL, 数据库, Ubuntu, Linux]
category: "Database"
draft: false
---

## 下载安装mysql

~~正经人谁用mysql?~~

在终端安装 MySQL（默认使用系统仓库当前版本）：

```bash
sudo apt install mysql-server -y
```

## 初始化安全配置（可选）

```bash
sudo mysql_secure_installation
```

常见选项说明：

- VALIDATE PASSWORD 插件：是否启用强密码验证
- Remove anonymous users? 是否移除匿名用户
- Disallow root login remotely? 是否禁止 root 用户远程登录
- Remove test database and access to it? 是否删除 test 数据库
- Reload privilege tables now? 重新加载权限

## 修改监听地址

编辑配置文件：

```bash
sudo vim /etc/mysql/mysql.conf.d/mysqld.cnf
```

找到 `bind-address = 127.0.0.1`：

修改为 `bind-address = 0.0.0.0`，保存并退出。

## 创建管理员用户用于远程登录

重启 MySQL：

```bash
sudo systemctl restart mysql
```

使用默认的 root 账号登录：

```bash
sudo mysql
```

创建管理员账号（`admin` 可替换为自定义名称）：

```sql
CREATE USER 'admin'@'%' IDENTIFIED WITH mysql_native_password BY 'PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

确认用户是否创建成功：

```sql
SELECT user, host, plugin FROM mysql.user;
```

示例输出：

| user             | host      | plugin                |
| ---------------- | --------- | --------------------- |
| admin            | %         | mysql_native_password |
| debian-sys-maint | localhost | caching_sha2_password |
| mysql.infoschema | localhost | caching_sha2_password |
| mysql.session    | localhost | caching_sha2_password |
| mysql.sys        | localhost | caching_sha2_password |
| root             | localhost | auth_socket           |

当看到创建的用户且 `plugin` 为 `mysql_native_password` 即表示成功。

接下来可以用 DBeaver 等客户端连接数据库。

::github{repo="dbeaver/dbeaver"}

## 远程连接常见问题排查

- 端口未放行：确保服务器防火墙/安全组已放行 `3306` 端口
- 服务未监听公网：确认 `bind-address` 已改为 `0.0.0.0`，并重启 MySQL
- 权限或账号不对：确认账号的 `host` 为 `%`，并重新 `FLUSH PRIVILEGES`
- 仍无法登录：确认使用的用户名、密码与数据库实例一致



