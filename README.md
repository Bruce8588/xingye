# 星夜系统 / Xingye System

星夜人生管理系统的生产环境目录。

## 目录结构

```
xingye/
├── projects/          # 项目代码（由 Git 管理）
│   ├── investflow/    # 每日行动 / 投资流程管理
│   │   ├── backend/   # Flask API（端口 5678）
│   │   └── frontend/  # React + Vite 源码
│   ├── trading-system/ # 交易系统
│   │   ├── backend/   # Flask API（端口 5649）
│   │   └── frontend/  # React + Vite 源码
│   ├── reading/       # 阅读追踪
│   │   ├── backend.py # Flask API（端口 6788）
│   │   └── frontend/  # React 源码
│   └── diet/         # 饮食追踪
│       ├── app.py     # Flask 应用（端口 5001）
│       ├── static/
│       └── templates/
│
├── data/              # 数据文件（永久保留，永不删除）
│   ├── investflow/
│   │   └── investflow.db
│   ├── trading-system/
│   │   ├── trading.db
│   │   └── trading_system.db
│   ├── reading/
│   │   └── reading.db
│   └── diet/
│       ├── diet_tracker.db
│       └── diet.db
│
├── html/              # 静态文件（构建产物）
│   ├── investflow/   # /daily/ → investflow 前端
│   ├── trading-system/ # /trading/ → 交易系统前端
│   ├── reading/       # /reading/ → 阅读前端
│   └── xingye/        # /xingye/ → 主站
│
├── ssl/               # SSL 证书
└── deploy/            # 部署工具
    ├── ecosystem.config.js  # PM2 配置
    ├── deploy.sh            # 部署脚本
    └── README.md
```

## 核心设计原则

- **代码 vs 数据完全分离** — 无论怎么移动代码目录，数据永远在 `data/` 里
- **PM2 统一托管** — 一个配置管所有后端进程
- **Nginx 按项目路由** — `/daily/` → investflow, `/trading/` → trading-system, etc.
- **前端独立构建** — 每个项目可单独 `npm run build` 更新前端

## PM2 服务管理

```bash
# 查看状态
pm2 list

# 重启单个服务
pm2 restart investflow

# 重启所有服务（使用 ecosystem.config.js）
pm2 start /opt/xingye/deploy/ecosystem.config.js

# 删除并重新启动
pm2 delete all && pm2 start /opt/xingye/deploy/ecosystem.config.js
```

## API 端口映射

| 服务 | 端口 | Nginx 路由 | 数据 |
|------|------|-----------|------|
| investflow | 5678 | `/daily/api/` | `/opt/xingye/data/investflow/investflow.db` |
| trading-system | 5649 | `/api/` | `/opt/xingye/data/trading-system/trading.db` |
| reading | 6788 | `/api/reading/` | `/opt/xingye/data/reading/reading.db` |
| diet | 5001 | `/diet/` | `/opt/xingye/data/diet/diet_tracker.db` |
| psychology | 6790 | `/api/psychology/` | 待确认 |
