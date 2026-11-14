# 一笺诗意

## 启动

需要 Python 3，服务端仅使用标准库，无需安装额外依赖。

```powershell
python tools/public-server.py
```

在浏览器访问 `http://127.0.0.1:8001`。已有反向代理或隧道可继续指向此端口。

## Docker 部署

需要 Docker Engine / Docker Desktop 和 Docker Compose。在项目目录运行：

```powershell
docker compose up -d --build
```

访问 `http://127.0.0.1:8001`。首次切换时先停止原来占用 8001 端口的 Python 服务；不要让 Windows 上的 Python 服务与 Linux 容器同时写入同一份 SQLite 数据库。

如果 Windows 提示找不到 `docker`，而 Docker Desktop 安装在当前用户目录，可在当前 PowerShell 中先运行：

```powershell
$env:PATH = "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin;$env:PATH"
```

- 容器把项目的 `./data` 挂载到 `/app/data`，继续使用现有 `likes.sqlite3`。数据库不会打包进镜像，重建或删除容器不会删除宿主机的 `data` 目录。
- 容器以 UID/GID `10001:10001` 运行。在 Linux 主机首次启动前执行 `mkdir -p data && sudo chown -R 10001:10001 data`，确保数据目录可写。Windows Docker Desktop 使用当前项目目录的文件共享。
- 默认映射宿主机 8001 端口。需要其他端口时，在项目根目录创建 `.env`，写入 `POEMS_PORT=8080` 后重新运行启动命令。
- 配置了健康检查、日志轮转和 `unless-stopped` 重启策略。Windows 重启后需要 Docker Desktop 启动，容器才会恢复运行。
- AI 助手仍由用户在浏览器中填写自己的接口地址、模型和密钥；容器不需要配置 AI 密钥，所填服务需允许浏览器跨域调用。

如果拉取镜像遇到网络超时，可在当前 PowerShell 为构建命令设置可用代理（以下端口需与你的本机代理一致）：

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
docker compose up -d --build
```

常用命令（均在项目目录运行）：

```powershell
docker compose ps                 # 查看运行状态和健康状态
docker compose logs --tail 100    # 查看日志
docker compose up -d --build      # 修改代码后重新构建并启动
docker compose stop              # 停止服务
docker compose start             # 恢复服务
docker compose down              # 删除容器，保留宿主机 data 目录
```

备份时先执行 `docker compose stop`，复制整个 `data` 目录到备份位置，然后执行 `docker compose start`。恢复时同样先停止服务，再还原数据目录；Linux 上还需确保上述目录权限。不要在服务运行时只复制 SQLite 主文件。

## 点赞

- 每句诗签单独统计点赞，页面仅显示红心和当前诗签的点赞数。
- 每次抽签可以点赞一次；再次抽到同一句时可以继续点赞，数量累加。每次抽签生成独立标识，自动刷新计数和失败重试沿用该标识，避免一次点赞重复计数。刷新页面会重新抽签，也视为新的一次。浏览器通过 HttpOnly Cookie 识别，无登录系统。升级时自动迁移旧记录，保留已有点赞数。
- 计数保存在 `data/likes.sqlite3`，重启服务后保留。部署时需要保留该文件所在的持久化目录；备份前先停止服务，或使用 SQLite 的备份工具。
- `GET /api/likes?poem=...&draw_id=...` 返回当前诗签的 `count`、全站 `total` 与当前访客本次抽签的 `liked`；`POST /api/likes` 接收 JSON `{ "poem": "诗句", "draw_id": "32位小写十六进制抽签标识" }`，写入后返回同样的结构。
- 页面在切换诗签、回到标签页及每 30 秒时刷新计数。点赞成功立即更新。
- 需要运行此服务或部署相同的 API；仅双击 HTML 或部署到纯静态托管无法共享计数。
- 如需调整端口或数据库位置：`python tools/public-server.py --port 8002 --db D:/poems/data/likes.sqlite3`。

## 检查

- `python tests/docker.py`：先构建 `poems:local` 镜像，再使用临时数据库验证真实容器 HTTP、点赞去重、非 root 用户及删除重建后的数据保留，不修改正式数据。

- `python tests/likes.py`：真实 HTTP 接口、重复/并发请求、多人累计、服务重启持久化。
- `node tests/likes.cjs`：需要 Playwright，启动独立临时数据库，验证点赞交互并运行原页面及 AI 助手回归测试，不写入正式点赞数据。
