# 星夜系统 AGENT.md

> 星夜人生管理系统生产环境维护指南。记录目录结构、关键路径、排查步骤、已知陷阱。

---

## 🏠 系统概览

- **服务器**: 8.129.109.139
- **域名/入口**: https://8.129.109.139
- **Nginx**: `/etc/nginx/conf.d/life-manager.conf`
- **PM2**: `/opt/xingye/deploy/ecosystem.config.js`

---

## 📁 目录结构

```
/opt/xingye/
├── projects/          # 项目源码（Git 管理）
│   ├── daily/         # 每日行动（原 investflow）
│   │   ├── backend/   # Flask API（端口 5678）
│   │   │   └── app.py
│   │   └── frontend/  # React + Vite 源码
│   ├── trading/       # 交易系统
│   │   ├── backend/   # Flask API（端口 5649）
│   │   │   └── app.py
│   │   └── frontend/  # React + Vite 源码
│   ├── reading/       # 阅读追踪
│   │   ├── backend.py # Flask API（端口 6788）
│   │   └── frontend/  # React 源码
│   └── diet/         # 饮食追踪
│       ├── app.py     # Flask（端口 5001）
│       ├── templates/
│       └── static/
├── data/              # 数据库（永久保留）
│   ├── daily/investflow.db
│   ├── trading/trading.db
│   ├── reading/reading.db
│   └── diet/diet_tracker.db
├── html/              # 前端构建产物
│   ├── daily/         # /daily/ → React SPA
│   ├── trading/       # /trading/ → React SPA
│   ├── reading/       # /reading/ → React SPA
│   └── xingye/       # /xingye/ → 星夜主站（Canvas星空+密码登录）
├── deploy/
│   ├── ecosystem.config.js  # PM2 统一配置
│   ├── deploy.sh
│   └── nginx.conf.new
├── ssl/               # SSL 证书
│   ├── your-cert.pem
│   └── your-key.pem
```

---

## 🌐 URL 路由

| URL | 路由到 | 类型 |
|-----|--------|------|
| `/` | → 302 `/xingye/` | 重定向 |
| `/xingye/` | `/opt/xingye/html/xingye/` | 静态 |
| `/daily/` | `/opt/xingye/html/daily/` | 静态 |
| `/trading/` | `/opt/xingye/html/trading/` | 静态 |
| `/reading/` | `/opt/xingye/html/reading/` | 静态 |
| `/diet/` | Flask `localhost:5001` | 代理 |
| `/daily/api/` | Flask `localhost:5678` | 代理 |
| `/api/` | Flask `localhost:5649` | 代理 |
| `/api/reading/` | Flask `localhost:6788` | 代理 |

---

## ⚙️ 服务状态

| 服务 | PM2 名 | 端口 | 数据库 | 状态 |
|------|--------|------|--------|------|
| 每日行动 | daily | 5678 | `/opt/xingye/data/daily/investflow.db` | ✅ online |
| 交易系统 | trading | 5649 | `/opt/xingye/data/trading/trading.db` | ✅ online |
| 阅读追踪 | reading | 6788 | `/opt/xingye/data/reading/reading.db` | ✅ online |
| 饮食追踪 | diet | 5001 | `/opt/xingye/data/diet/diet_tracker.db` | ✅ online |
| 心理（未迁移） | — | 6790 | 备份中 | ❌ 离线 |

---

## 🔧 常用命令

```bash
# 查看服务状态
pm2 list

# 重启单个服务（重启后需验证配置是否生效）
pm2 delete <name> && pm2 start /opt/xingye/deploy/ecosystem.config.js --only <name>

# 重启所有
pm2 delete all && pm2 start /opt/xingye/deploy/ecosystem.config.js

# Nginx 重载配置
sudo nginx -t && sudo nginx -s reload

# 完全重启 Nginx
sudo nginx -s stop && sudo nginx

# 查看 Nginx 日志
sudo tail -20 /var/log/nginx/error.log

# 验证页面
curl -sI https://8.129.109.139/daily/ -k | grep HTTP
```

---

## 💾 备份方案（⭐ 重要）

### 备份结构
```
/backup/
  auto/xingye/      ← 每天 3:00 自动覆盖备份，/opt/xingye/ 完整镜像（536M）
  debug/            ← 调试产生的备份，保留3份
  backup.log        ← 备份日志
  backup-xingye.sh  ← 备份脚本

/opt/xingye/        ← git 自动推送到 github.com:Bruce8588/xingye
  debug/            ← 调试工作区（不在备份中）
```

### 备份脚本用法
```bash
# 自动备份（每天 3:00 cron 自动跑）
bash /backup/backup-xingye.sh

# 调试备份（修改前手动跑，保留3份）
bash /backup/backup-xingye.sh --debug "修复了xxx问题"

# 从备份恢复
bash /backup/backup-xingye.sh --restore /backup/auto/xingye/
```

### 注意事项
- 本地备份 = `/opt/xingye/` 完整镜像，只排除 `debug/` 和 `backup/` 自身
- GitHub 推送是增量，但本地备份是全量快照
- crontab：`0 3 * * * /backup/backup-xingye.sh >> /backup/backup.log 2>&1`

---

## ⚠️ 已知陷阱

### PM2 restart 不读取新配置
PM2 `restart` 不读取更新后的 `ecosystem.config.js`。**必须**：
```bash
pm2 delete <name> && pm2 start /opt/xingye/deploy/ecosystem.config.js --only <name>
```

### ecosystem.config.js 写法
`script` 是解释器（`/usr/bin/python3`），`args` 是脚本路径：
```js
script: '/usr/bin/python3',
args: '/opt/xingye/projects/daily/backend/app.py',
```

### Nginx proxy_redirect 陷阱（Flask 绝对路径 redirect）
Flask 返回 `Location: http://127.0.0.1:5001/login` 时，`proxy_redirect` 需用正则：
```nginx
proxy_redirect ~^http://[^/]+/login(.*)$ /diet/login$1;
```
同时在 diet location 设置：
```nginx
proxy_set_header Host localhost:5001;
```

### Nginx location ^~ 优先于正则
静态文件 location 必须加 `^~` 修饰符，否则 `/daily/assets/...` 会被正则 `~* \.(js|css)$` 捕获导致 404：
```nginx
location ^~ /daily/ { alias /opt/xingye/html/daily/; }
```

### Nginx proxy 路径重写（diet）
`location /diet/ { proxy_pass http://127.0.0.1:5001/; }` 会把 `/diet` 前缀吞掉。
Flask 路由是 `/api/xxx`，但收到 `/daily/api/xxx` → 404。
正确写法：`proxy_pass http://127.0.0.1:5001/api/;`

### diet Flask 硬编码路径
`app.py` 里的 `template_folder`/`static_folder`/`UPLOAD_FOLDER` 硬编码了旧路径。迁移后必须同步改为 `/opt/xingye/projects/diet/...`。

### Nginx root 放在 server 级别
`location = /` 里写 `root` 可能不生效。**必须**把 `root` 放在 server 级别。

### Apache 占用 80/443
Apache（httpd）可能仍在运行并抢掉 Nginx 的端口。发现异常响应时先检查：
```bash
systemctl stop httpd && systemctl disable httpd
```

### Nginx /xingye/ 的 root 配置
`/xingye/` 和 `/xingye` location 的 root 必须指向 `/opt/xingye/html`，不要指向 `/var/www`。文件在 `/opt/xingye/html/xingye/`。

### Nginx alias vs root 陷阱
SPA 页面（如 `/reading/`）如果用 `root` + `try_files $uri $uri/ /reading/index.html`，fallback 路径 `/reading/index.html` 会再次匹配到同一个 `location /reading/`，形成 rewrite 循环。正确做法：
- 用 `alias /opt/xingye/html/reading/;` 替代 `root`
- `try_files $uri $uri/ =404;`（不要用 URI 作为 fallback）
- **注意**：`alias` + `try_files $uri $uri/` 同样会循环（`$uri` 带完整路径前缀，会在 alias 目录下查找不存在路径），fallback 也只能用 `=404`

---

## 🛠️ 关键文件路径

| 文件 | 路径 |
|------|------|
| Nginx 配置 | `/etc/nginx/conf.d/life-manager.conf` |
| PM2 配置 | `/opt/xingye/deploy/ecosystem.config.js` |
| daily Flask | `/opt/xingye/projects/daily/backend/app.py` |
| trading Flask | `/opt/xingye/projects/trading/backend/app.py` |
| reading Flask | `/opt/xingye/projects/reading/backend.py` |
| diet Flask | `/opt/xingye/projects/diet/app.py` |
| daily 前端构建 | `/opt/xingye/html/daily/` |
| trading 前端构建 | `/opt/xingye/html/trading/` |
| reading 前端构建 | `/opt/xingye/html/reading/` |
| xingye 主站构建 | `/opt/xingye/html/xingye/` |
| SPEC.md | `/opt/xingye/backup/星夜/SPEC.md` |

---

## 🔍 排查流程

### 页面 403 Forbidden
1. `sudo ss -lptn | grep :80` — 确认是 Nginx 在监听
2. `sudo tail /var/log/nginx/error.log` — 看具体错误
3. 检查文件路径和权限：`ls -la /opt/xingye/html/<project>/`
4. 确认 Nginx 配置里没有残留的 `default_server` 冲突

### 页面返回 Apache 测试页
1. `sudo systemctl stop httpd && sudo systemctl disable httpd`
2. 确认 Nginx `server_name` 匹配：`sudo nginx -T | grep server_name`
3. 确认 `listen ... default_server` 在正确的 server 块上
4. 把 `root` 放在 server 级别而非 location 级别

### Flask 500 错误
1. `pm2 logs <name> --err --lines 30` — 查看错误日志
2. 检查数据库路径是否正确
3. 检查 `template_folder`/`static_folder` 是否指向正确路径

### PM2 服务启动后仍 502
1. 确认端口被占用：`sudo ss -lptn | grep :<port>`
2. 重启后检查服务是否在线：`pm2 list`
3. 直接 curl localhost:<port> 确认 Flask 本身正常
