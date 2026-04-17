# investflow（每日行动 / 投资流程管理）

## 技术栈
- **前端**: React + Vite + Tailwind CSS
- **后端**: Flask + SQLAlchemy + SQLite
- **端口**: 5678

## 目录结构
```
investflow/
├── backend/          # Flask API
│   └── app.py
└── frontend/         # React 源码
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── dist/         # 构建产物（同步到 html/investflow/）
```

## API 端点
- `GET/POST /api/projects`
- `GET/POST /api/todos`
- `GET/POST /api/plans`

## 数据库
- 路径: `/opt/xingye/data/investflow/investflow.db`
