# 星夜系统运行规则

> 所有参与星夜系统开发、维护的人员必须遵守。本文档随系统迭代更新。

---

## 规则 1：静态文件路径规范

**所有前端构建产物必须放在 `/opt/xingye/html/`**，Nginx 配置里全部用这个路径作为 root。

```
/opt/xingye/html/
├── daily/
├── diet/          ← 注意：diet 是 proxy_pass，不是静态文件
├── reading/
├── trading/
├── xingye/
└── psych-schemes/
```

**禁止**：
- 不要再用 `/var/www/` 存放任何星夜相关文件
- 不要再在前端源码目录之外放构建产物（禁止 `/opt/web/` 作为主存储）
- 新增模块必须先确定好 Nginx location，再构建部署

---

## 规则 2：Nginx SPA 子路径标准写法

子路径 SPA（如 `/reading/`、`/psych-schemes/`）的 location 块必须使用以下模式：

```nginx
location /module/ {
    alias /opt/xingye/html/module/;
    index index.html;
    try_files $uri $uri/ =404;
}
```

**禁止**：
```nginx
# 错误：root + URI fallback → rewrite 循环
location /module/ {
    root /opt/xingye/html;
    try_files $uri $uri/ /module/index.html;
}

# 错误：alias + URI fallback → 同样循环
location /module/ {
    alias /opt/xingye/html/module/;
    try_files $uri $uri/ /module/index.html;
}
```

**原因**：`/module/index.html` 作为 fallback 会再次匹配到同一个 location，形成 rewrite 循环。只能用 `=404`。

根路径（`/`、`/xingye`）不受此限制，可以用 `try_files $uri $uri/ /index.html`。

---

## 规则 3：Nginx 配置修改流程

每次修改 `/etc/nginx/conf.d/life-manager.conf`：

1. **备份**：`sudo cp /etc/nginx/conf.d/life-manager.conf /etc/nginx/conf.d/life-manager.conf.bak`
2. **修改配置**
3. **语法检查**：`sudo nginx -t`
4. **重载**：`sudo nginx -s reload`
5. **验证**：立刻 curl 所有相关路径，确认 HTTP 200
   ```bash
   curl -k -s -o /dev/null -w "%{http_code}" https://8.129.109.139/<path>/
   ```

**必须验证的路由**（每次修改 Nginx 后全量检查）：
```
/daily/      → 200
/reading/    → 200
/xingye/     → 200
/psych-schemes/ → 200
/trading/    → 200
/diet/       → 200
```

---

## 规则 4：Git Commit 规范

每个 commit 必须带模块前缀，格式：

```
<type>: <module>: <描述>
```

类型：
- `fix` — 修复 bug
- `feat` — 新功能
- `refactor` — 重构
- `docs` — 文档
- `config` — 配置文件（Nginx、PM2、crontab 等）

示例：
```bash
git commit -m "fix: nginx: /reading/ 修复 try_files rewrite 循环"
git commit -m "config: nginx: /psych-schemes 迁移到 /opt/xingye/html/"
git commit -m "docs: AGENT.md 补充 SPA location 标准写法"
git commit -m "fix: daily: 添加 GET /api/review 端点"
```

**目的**：git log 就是变更日志，无需翻代码就知道每次动了什么。

---

## 规则 5：上线前三重检查清单

代码或配置修改完成后、上线前，必须执行：

### 第一重：curl 验证所有路由
```bash
for path in /daily/ /reading/ /xingye/ /psych-schemes/ /trading/ /diet/; do
  code=$(curl -k -s -o /dev/null -w "%{http_code}" https://8.129.109.139${path})
  echo "$path -> $code"
done
```
全部必须返回 200。

### 第二重：API 健康检查
```bash
curl -s http://127.0.0.1:5678/health      # daily
curl -s http://127.0.0.1:5001/health       # diet
curl -s http://127.0.0.1:5649/health       # trading
curl -s http://127.0.0.1:6788/health       # reading
curl -s http://127.0.0.1:6790/health       # psychology
```

### 第三重：备份 + Git push
```bash
bash /backup/backup-xingye.sh --debug "上线前检查"
cd /opt/xingye && git add -A && git commit -m "..." && git push origin master
```

---

## 规则 6：备份工作流

**调试前**：必须先跑调试备份
```bash
bash /backup/backup-xingye.sh --debug "描述"
```

**上线后**：自动备份会自动跑，但应确认 GitHub 已推送。

**危险操作前**（删除文件、重写配置、迁移目录）：调试备份 + 确认恢复路径。

---

## 规则 7：Nginx 配置中禁止的模式

| 模式 | 问题 |
|------|------|
| `root /var/www;` | 目录不存在，全部 500 |
| `alias` + `try_files $uri $uri/ /path/index.html` | rewrite 循环 |
| `root` + `try_files $uri $uri/ /path/index.html` | rewrite 循环 |

任何新增 location 先确认不包含以上模式。

---

## 规则 8：文件存放优先级

当同一模块在前端有多处存放时（如 `/opt/web/` 和 `/opt/xingye/html/`），**以 `/opt/xingye/html/` 为准**，`/opt/web/` 里的视为旧版本，可定期清理。

新增文件必须直接放到 `/opt/xingye/` 相关目录下，禁止先放临时目录再迁移。

---

*最后更新：2026-04-17*
