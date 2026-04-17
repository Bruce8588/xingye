"""
Daily Dashboard Backend - Flask API
星夜 · 每日行动 后端服务
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, date
import json
import os

app = Flask(__name__)
CORS(app)

# Database - use absolute path so it works regardless of cwd
_DB_PATH = '/opt/xingye/data/daily/investflow.db'
DATABASE_URL = os.environ.get('DATABASE_URL', f'sqlite:///{_DB_PATH}')
engine = create_engine(DATABASE_URL, echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine)

# ============== Models ==============

class DailyPlan(Base):
    __tablename__ = 'daily_plans'
    id = Column(Integer, primary_key=True)
    plan_date = Column(String(10), unique=True, nullable=False)  # YYYY-MM-DD
    content = Column(Text, default='')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Project(Base):
    __tablename__ = 'projects'
    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    emoji = Column(String(10), default='📁')
    problem = Column(Text, default='')
    plan = Column(Text, default='')
    target = Column(Text, default='')
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Todo(Base):
    __tablename__ = 'todos'
    id = Column(String(50), primary_key=True)
    text = Column(Text, nullable=False)
    deadline = Column(String(20), default='today')  # 'today', 'inbox', or YYYY-MM-DD
    priority = Column(String(10), default='medium')
    done = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Workflow(Base):
    __tablename__ = 'workflows'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), default='daily')  # 'daily' for now
    steps = Column(Text, default='[]')        # JSON array of step strings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True)
    review_date = Column(String(10), unique=True, nullable=False)  # YYYY-MM-DD
    content = Column(Text, default='')       # 今日总结
    tomorrow_plan = Column(Text, default='') # 明日计划
    mood = Column(Integer, default=7)          # 心情 1-10
    energy = Column(Integer, default=7)       # 精力 1-10
    tags = Column(Text, default='[]')        # JSON array of tag strings
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# ============== Init DB ==============

Base.metadata.create_all(engine)


def get_session():
    return Session()


def row_to_dict(row):
    """Convert SQLAlchemy row to dict"""
    if row is None:
        return None
    d = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        elif isinstance(val, date):
            val = val.isoformat()
        d[col.name] = val
    return d


# ============== API Routes ==============

# --- Daily Plan ---

@app.route('/api/plan', methods=['GET'])
def get_plan():
    """获取今日计划"""
    session = get_session()
    today = date.today().isoformat()
    plan = session.query(DailyPlan).filter_by(plan_date=today).first()
    if not plan:
        plan = DailyPlan(plan_date=today, content='')
        session.add(plan)
        session.commit()
        plan = session.query(DailyPlan).filter_by(plan_date=today).first()
    result = row_to_dict(plan)
    session.close()
    return jsonify(result)


@app.route('/api/plan', methods=['PUT'])
def save_plan():
    """保存今日计划"""
    session = get_session()
    data = request.get_json()
    today = date.today().isoformat()
    plan = session.query(DailyPlan).filter_by(plan_date=today).first()
    if not plan:
        plan = DailyPlan(plan_date=today, content=data.get('content', ''))
        session.add(plan)
    else:
        plan.content = data.get('content', '')
        plan.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(plan)
    session.close()
    return jsonify(result)


# --- Projects ---

@app.route('/api/projects', methods=['GET'])
def get_projects():
    """获取所有项目"""
    session = get_session()
    projects = session.query(Project).order_by(Project.sort_order).all()
    result = [row_to_dict(p) for p in projects]
    session.close()
    return jsonify(result)


@app.route('/api/projects', methods=['POST'])
def create_project():
    """创建项目"""
    session = get_session()
    data = request.get_json()
    max_order = session.query(Project).order_by(Project.sort_order.desc()).first()
    next_order = (max_order.sort_order + 1) if max_order else 0
    project = Project(
        id=data.get('id', f"project_{datetime.utcnow().timestamp()}"),
        name=data.get('name', '新项目'),
        emoji=data.get('emoji', '📁'),
        problem=data.get('problem', ''),
        plan=data.get('plan', ''),
        target=data.get('target', ''),
        sort_order=next_order,
    )
    session.add(project)
    session.commit()
    result = row_to_dict(project)
    session.close()
    return jsonify(result), 201


@app.route('/api/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    """更新项目"""
    session = get_session()
    project = session.query(Project).filter_by(id=project_id).first()
    if not project:
        session.close()
        return jsonify({'error': 'Project not found'}), 404
    data = request.get_json()
    for key in ['name', 'emoji', 'problem', 'plan', 'target', 'sort_order']:
        if key in data:
            setattr(project, key, data[key])
    project.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(project)
    session.close()
    return jsonify(result)


@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """删除项目"""
    session = get_session()
    project = session.query(Project).filter_by(id=project_id).first()
    if not project:
        session.close()
        return jsonify({'error': 'Project not found'}), 404
    session.delete(project)
    session.commit()
    session.close()
    return jsonify({'ok': True})


# --- Todos ---

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """获取所有待办"""
    session = get_session()
    todos = session.query(Todo).order_by(Todo.sort_order, Todo.created_at.desc()).all()
    result = [row_to_dict(t) for t in todos]
    session.close()
    return jsonify(result)


@app.route('/api/todos', methods=['POST'])
def create_todo():
    """创建待办"""
    session = get_session()
    data = request.get_json()
    # 容错：前端有时把整个 todo 对象放在 text 字段里
    if isinstance(data.get('text'), dict):
        nested = data.pop('text')
        data = {**data, **nested}
    max_order = session.query(Todo).order_by(Todo.sort_order.desc()).first()
    next_order = (max_order.sort_order + 1) if max_order else 0
    todo = Todo(
        id=data.get('id', f"todo_{datetime.utcnow().timestamp()}"),
        text=data.get('text', ''),
        deadline=data.get('deadline', 'today'),
        priority=data.get('priority', 'medium'),
        done=data.get('done', False),
        sort_order=next_order,
    )
    session.add(todo)
    session.commit()
    result = row_to_dict(todo)
    session.close()
    return jsonify(result), 201


@app.route('/api/todos/<todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """更新待办"""
    session = get_session()
    todo = session.query(Todo).filter_by(id=todo_id).first()
    if not todo:
        session.close()
        return jsonify({'error': 'Todo not found'}), 404
    data = request.get_json()
    for key in ['text', 'deadline', 'priority', 'done', 'sort_order']:
        if key in data:
            setattr(todo, key, data[key])
    todo.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(todo)
    session.close()
    return jsonify(result)


@app.route('/api/todos/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """删除待办"""
    session = get_session()
    todo = session.query(Todo).filter_by(id=todo_id).first()
    if not todo:
        session.close()
        return jsonify({'error': 'Todo not found'}), 404
    session.delete(todo)
    session.commit()
    session.close()
    return jsonify({'ok': True})


@app.route('/api/todos/batch', methods=['POST'])
def batch_update_todos():
    """批量更新待办（用于批量完成/删除）"""
    session = get_session()
    data = request.get_json()
    ids = data.get('ids', [])
    action = data.get('action')  # 'done', 'undone', 'delete'
    
    todos = session.query(Todo).filter(Todo.id.in_(ids)).all()
    for todo in todos:
        if action == 'done':
            todo.done = True
        elif action == 'undone':
            todo.done = False
        elif action == 'delete':
            session.delete(todo)
    session.commit()
    session.close()
    return jsonify({'ok': True})


# --- Workflow ---

@app.route('/api/workflow', methods=['GET'])
def get_workflow():
    """获取工作流（单条记录，name='daily'）"""
    session = get_session()
    wf = session.query(Workflow).filter_by(name='daily').first()
    if not wf:
        wf = Workflow(name='daily', steps='[]')
        session.add(wf)
        session.commit()
        wf = session.query(Workflow).filter_by(name='daily').first()
    result = row_to_dict(wf)
    session.close()
    # Parse steps from JSON string for the frontend
    result['steps'] = json.loads(result.get('steps', '[]'))
    return jsonify(result)


@app.route('/api/workflow', methods=['PUT'])
def save_workflow():
    """保存工作流"""
    session = get_session()
    data = request.get_json()
    wf = session.query(Workflow).filter_by(name='daily').first()
    if not wf:
        wf = Workflow(name='daily', steps='[]')
        session.add(wf)
    # steps is a list, store as JSON string
    wf.steps = json.dumps(data.get('steps', []), ensure_ascii=False)
    wf.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(wf)
    session.close()
    result['steps'] = json.loads(result.get('steps', '[]'))
    return jsonify(result)


# --- Seed Default Projects ---

@app.route('/api/seed', methods=['POST'])
def seed_defaults():
    """初始化默认项目数据"""
    session = get_session()
    
    defaults = [
        {'id': 'body', 'name': '身体管理', 'emoji': '🏃', 'sort_order': 0},
        {'id': 'finance', 'name': '财务管理', 'emoji': '💰', 'sort_order': 1},
        {'id': 'social', 'name': '社交内核', 'emoji': '💬', 'sort_order': 2},
        {'id': 'thesis', 'name': '论文', 'emoji': '📄', 'sort_order': 3},
        {'id': 'intern', 'name': '实习', 'emoji': '💼', 'sort_order': 4},
        {'id': 'accum', 'name': '积累', 'emoji': '📚', 'sort_order': 5},
    ]
    
    for d in defaults:
        existing = session.query(Project).filter_by(id=d['id']).first()
        if not existing:
            p = Project(**d)
            session.add(p)
    
    session.commit()
    projects = session.query(Project).order_by(Project.sort_order).all()
    result = [row_to_dict(p) for p in projects]
    session.close()
    return jsonify(result)


# --- Daily Review ---

@app.route('/api/reviews/<review_date>', methods=['GET'])
def get_review(review_date):
    """获取指定日期的复盘"""
    session = get_session()
    review = session.query(Review).filter_by(review_date=review_date).first()
    if not review:
        session.close()
        return jsonify({
            'review_date': review_date,
            'content': '',
            'tomorrow_plan': '',
            'mood': 7,
            'energy': 7,
            'tags': '[]',
        })
    result = row_to_dict(review)
    # 解析 tags JSON
    try:
        result['tags'] = json.loads(result.get('tags', '[]'))
    except Exception:
        result['tags'] = []
    session.close()
    return jsonify(result)


@app.route('/api/reviews/<review_date>', methods=['POST'])
def save_review(review_date):
    """保存指定日期的复盘"""
    session = get_session()
    data = request.get_json()
    review = session.query(Review).filter_by(review_date=review_date).first()
    if not review:
        review = Review(review_date=review_date)
        session.add(review)
    review.content = data.get('content', '')
    review.tomorrow_plan = data.get('tomorrow_plan', '')
    review.mood = int(data.get('mood', 7))
    review.energy = int(data.get('energy', 7))
    review.tags = json.dumps(data.get('tags', []), ensure_ascii=False)
    review.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(review)
    try:
        result['tags'] = json.loads(result.get('tags', '[]'))
    except Exception:
        result['tags'] = []
    session.close()
    return jsonify(result)


@app.route('/api/review', methods=['GET'])
def get_today_review():
    """获取今日复盘（供前端 loadAll 使用）"""
    today = date.today().isoformat()
    session = get_session()
    review = session.query(Review).filter_by(review_date=today).first()
    if not review:
        session.close()
        return jsonify({'review_date': today, 'content': '', 'tomorrow_plan': '',
                        'mood': 7, 'energy': 7, 'tags': []})
    result = row_to_dict(review)
    try:
        result['tags'] = json.loads(result.get('tags', '[]'))
    except Exception:
        result['tags'] = []
    session.close()
    return jsonify(result)


@app.route('/api/review', methods=['PUT'])
def put_today_review():
    """更新今日复盘（供前端 handleSaveReview 使用）"""
    today = date.today().isoformat()
    data = request.get_json()
    session = get_session()
    review = session.query(Review).filter_by(review_date=today).first()
    if not review:
        review = Review(review_date=today)
        session.add(review)
    review.content = data.get('content', '')
    review.tomorrow_plan = data.get('tomorrow_plan', '')
    review.mood = int(data.get('mood', 7))
    review.energy = int(data.get('energy', 7))
    review.tags = json.dumps(data.get('tags', []), ensure_ascii=False)
    review.updated_at = datetime.utcnow()
    session.commit()
    result = row_to_dict(review)
    try:
        result['tags'] = json.loads(result.get('tags', '[]'))
    except Exception:
        result['tags'] = []
    session.close()
    return jsonify(result)


@app.route('/api/reviews', methods=['GET'])
def list_reviews():
    """获取所有有复盘的日期列表"""
    session = get_session()
    reviews = session.query(Review.review_date).order_by(Review.review_date.desc()).all()
    result = [r.review_date for r in reviews]
    session.close()
    return jsonify(result)


@app.route('/api/reviews/analysis', methods=['GET'])
def review_analysis():
    """获取近 N 天的复盘统计分析"""
    days = int(request.args.get('days', 7))
    session = get_session()
    from datetime import timedelta
    cutoff = (date.today() - timedelta(days=days)).isoformat()
    reviews = session.query(Review).filter(Review.review_date >= cutoff).all()
    total = len(reviews)
    avg_mood = round(sum(r.mood for r in reviews) / total, 1) if total > 0 else 0
    avg_energy = round(sum(r.energy for r in reviews) / total, 1) if total > 0 else 0
    session.close()
    return jsonify({
        'total_reviews': total,
        'avg_mood': avg_mood,
        'avg_energy': avg_energy,
        'message': f'最近{days}天完成 {total} 次复盘' if total > 0 else f'最近{days}天暂无复盘记录',
    })



@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'daily-dashboard'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5678, debug=False)
