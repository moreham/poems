# 一笺诗意

Vue 3 + Element Plus 前端，Node.js / Express 后端，MySQL 持久化，Redis 验证码、会话与限流。游客可抽签、解读和点赞；邮箱验证码登录后可投稿并查看自己的记录；管理员通过独立账号密码审核。

## 本地 Docker 启动

1. 复制 `.env.example` 为 `.env`，替换数据库、Redis、会话密钥和管理员密码。密码不要共用，管理员密码至少 12 位，其他密钥建议至少 32 位。`.env` 不提交 Git。
2. 运行 `docker compose up -d --build`。
3. 网站：`http://127.0.0.1:8001`；个人记录：`/submissions`；独立管理员入口：`/admin`。
4. 首次启动使用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 创建管理员，之后重启不会覆盖已有密码。

`.env.example` 使用 **Mailpit 本地收件箱**：`http://127.0.0.1:8025`。它接收测试验证码，但**不会发送到真实邮箱**。邮箱验证码在应用中不会直接返回、展示或写入日志。

### 接入真实 SMTP

编辑 `.env`：清空 `COMPOSE_PROFILES`，将 `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`SMTP_FROM` 改为服务商提供的参数。`SMTP_PASS` 通常是邮箱授权码。465 端口通常使用 `SMTP_SECURE=true`；587 使用 `SMTP_SECURE=false` 和 `SMTP_REQUIRE_TLS=true`。应用不会忽略 TLS 证书校验。

然后运行 `docker compose up -d --force-recreate poems`。不再需要本地收件箱时，执行 `docker compose --profile local-mail stop mailpit`。

部署域名时将 `APP_ORIGIN` 设置为实际访问的完整站点来源，例如 `https://poems.example.com`（不要加路径）。该设置用于请求来源校验及 Secure Cookie；页面访问地址与该值必须一致。线上使用 HTTPS。默认不信任代理转发的客户端 IP；若有固定反向代理，按实际拓扑设置 `TRUST_PROXY_HOPS`，并限制应用端口只允许该代理访问。

### 数据与旧版本迁移

- MySQL、Redis 使用各自的 Docker 命名卷；普通重建和 `docker compose down` 保留数据，**不要用 `down -v` 删除正式卷**。
- 首次启动导入原来的 288 首诗签。审核通过的投稿在同一个事务里加入抽签池。
- 旧 `data/likes.sqlite3` 以只读方式挂载。启动时将数据库及存在的 WAL 文件复制到临时目录后，自动导入原点赞记录到 MySQL，以迁移标记保证只导入一次；任何未知诗句会让迁移回滚并停止启动，不会静默丢弃。迁移前先停止旧 Python 容器，确保 SQLite 已完整落盘。旧数据库保留在原位置作为备份。
- 点赞仍按访客 Cookie 和每次抽签标识记录，支持取消、重新点赞、下次抽到相同诗句继续点赞。取消只影响本次抽签。
- 备份 MySQL 使用 `mysqldump` 或数据库备份工具；备份配置时妥善保管 `.env`。Redis 数据丢失会使验证码与登录会话失效，但不会删除用户、投稿和点赞。

### 管理员密码重置

修改 `.env` 中 `ADMIN_PASSWORD` 后，先运行 `docker compose up -d --force-recreate poems` 更新容器环境，再运行 `docker compose exec poems npm run admin:password`。此命令更新指定管理员的 scrypt 密码哈希，并清除管理员会话。不会修改普通用户账号。

## 行为与权限

- 验证码有效期 10 分钟、成功后立即销毁；单个验证码连续输错 5 次失效。
- 同邮箱 60 秒内不能重发，每小时最多 5 次；同 IP 每小时最多发送 20 次。登录校验、管理员密码尝试、投稿和点赞也有限流，数据存于 Redis，跨进程共享。
- 邮箱统一去除首尾空格并转小写。验证码保留 HMAC 摘要，不在 Redis 中保存明文。
- 普通用户不设置密码；管理员密码使用随机盐及 scrypt 存储。普通用户与管理员分别使用数据库表、Redis 会话命名空间和 HttpOnly Cookie，普通登录不能换取管理员权限。
- 普通会话有效 7 天，管理员会话 8 小时；退出立即撤销服务端会话。前端不把登录令牌存入 localStorage。
- 写接口校验请求来源，未登录投稿被拒绝，个人列表只查询当前用户的数据。前端以文本渲染诗句和理由，不渲染投稿 HTML。
- 投稿提供诗句、作品名称、作者、诗意解读；原文和来源链接选填。待审和已收录的同一诗句不重复受理；驳回后可修改后重新投稿。
- 审核结果是终态，不能再审核一次；并发审核由事务及行锁保证只成功一次。驳回理由选填，投稿人可以查看。用户和管理员列表都支持状态筛选、每页 10 条分页和详情。

## 本地开发

需要 Node.js 24 或更高版本、MySQL 8.4 和 Redis 7.4。`npm ci` 安装依赖。

- `npm run dev`：Vite 开发前端，默认 5173，代理 `/api` 到 8001。
- `npm run dev:server`：开发后端。设置 `MYSQL_HOST`、`MYSQL_PORT`、`MYSQL_USER`、`MYSQL_DATABASE`、`MYSQL_PASSWORD`、`REDIS_URL` 以及 SMTP 参数，开发时 `APP_ORIGIN=http://127.0.0.1:5173`，并通过同一地址访问前端。
- `npm run build`：构建前端到 `dist`。
- `npm start`：Express 提供 API 和已构建前端。

## 验证

- `npm test`：密码哈希与验证的单元测试。
- `docker compose -p poems-test -f compose.test.yaml up -d --wait`：使用 `poems:local` 镜像启动独立的 MySQL、Redis、Mailpit 和网站测试环境，不挂载正式数据库。
- `docker compose -p poems-test -f compose.test.yaml run --rm tests`：真实 HTTP 集成测试，覆盖验证码、会话隔离、越权、投稿归属、分页、审核并发、公开收录、驳回和点赞取消。
- 浏览器测试：独立测试站点固定为 `http://127.0.0.1:18001`，测试收件箱为 `http://127.0.0.1:18025`，运行 `npm run test:ui`（需要本机安装 Microsoft Edge）。截图默认保存到 `test-results/`，可通过 `SCREENSHOT_DIR` 指定目录。
- SQLite 迁移测试：`docker compose -p poems-test -f compose.test.yaml run --rm --no-deps -e LEGACY_SQLITE_PATH=/tmp/likes-fixture.sqlite3 -v ./tests:/app/tests:ro poems node tests/migration.mjs`，覆盖旧点赞、每次抽签点赞和重复启动。
- SMTP 故障测试：先 `docker compose -p poems-test -f compose.test.yaml stop mailpit`，再 `docker compose -p poems-test -f compose.test.yaml run --rm --no-deps --entrypoint node tests tests/smtp-failure.mjs`，最后启动测试 Mailpit。
- 测试后仅对测试项目运行 `docker compose -p poems-test -f compose.test.yaml down -v`。

## 主要接口

| 接口 | 权限 | 功能 |
| --- | --- | --- |
| `GET /api/poems` | 公开 | 已收录诗签 |
| `GET/POST /api/likes` | 公开 | 当前签点赞计数与设定点赞状态 |
| `POST /api/auth/code` | 公开、限流 | SMTP 发送邮箱验证码 |
| `POST /api/auth/login` | 验证码 | 自动注册或登录 |
| `GET /api/auth/me` / `POST /api/auth/logout` | 用户会话 | 登录状态、退出 |
| `GET/POST /api/submissions` | 普通用户 | 本人投稿记录、投稿 |
| `POST /api/admin/login` | 管理员账号密码、限流 | 管理员登录 |
| `GET /api/admin/me` / `POST /api/admin/logout` | 管理员会话 | 管理员状态、退出 |
| `GET /api/admin/submissions` | 管理员 | 分页待审列表与审核历史 |
| `POST /api/admin/submissions/:id/review` | 管理员 | 通过或驳回，选填理由 |
