# reading（阅读追踪）

## 技术栈
- **前端**: React + Vite（推测）
- **后端**: Flask（原生 sqlite3）
- **端口**: 6788

## 目录结构
```
reading/
├── backend.py         # Flask API
└── frontend/         # React 源码
    ├── dist/          # 构建产物（同步到 html/reading/）
    └── node_modules/
```

## API 端点
- `GET /api/reading/books`

## 数据库
- 路径: `/opt/xingye/data/reading/reading.db`
