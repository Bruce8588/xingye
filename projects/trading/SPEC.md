# trading-system（交易系统）

## 技术栈
- **前端**: React + Vite + Tailwind CSS
- **后端**: Flask + SQLAlchemy + SQLite
- **端口**: 5649

## 目录结构
```
trading-system/
├── backend/          # Flask API
│   └── app.py
└── frontend/         # React 源码
    ├── src/
    ├── package.json
    ├── vite.config.js
    └── dist/         # 构建产物（同步到 html/trading-system/）
```

## API 端点
- `GET /api/market-entries`
- `GET /api/stocks`
- `GET /api/logic-groups`
- `GET /api/memos`
- `GET /api/decisions`
- `GET /api/trading-reviews`
- `GET /api/market-records`

## 数据库
- 路径: `/opt/xingye/data/trading-system/trading.db`
