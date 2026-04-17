"""
星夜每日行动 - Demo 版（含收集箱改进 + 每日复盘）
独立运行于端口 5002
"""

import os
import sqlite3
import json
from datetime import datetime, date, timedelta
from flask import Flask, render_template, request, jsonify, redirect, url_for, session, send_from_directory

app = Flask(__name__, template_folder='templates', static_folder='static')
app.config['SECRET_KEY'] = 'demo-secret-key-2026'
app.static_folder = '/opt/xingye/projects/demo/static'

DATA_DIR = '/opt/xingye/data/demo'
os.makedirs(DATA_DIR, exist_ok=True)
DB = os.path.join(DATA_DIR, 'demo.db')


def get_db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # 收集箱待办
    c.execute('''
        CREATE TABLE IF NOT EXISTS inbox_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            deadline TEXT DEFAULT 'inbox',
            priority TEXT DEFAULT 'medium',
            done INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            moved_to_today_at TEXT
        )
    ''')

    # 今日待办
    c.execute('''
        CREATE TABLE IF NOT EXISTS today_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            deadline TEXT DEFAULT 'today',
            priority TEXT DEFAULT 'medium',
            done INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT
        )
    ''')

    # 项目进度
    c.execute('''
        CREATE TABLE IF NOT EXISTS project_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT '',
            emoji TEXT NOT NULL DEFAULT '📁',
            problem TEXT DEFAULT '',
            plan TEXT DEFAULT '',
            target TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # KV 存储（用于每日规划等）
    c.execute('''
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    ''')

    # 每日复盘
    c.execute('''
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            review_date TEXT UNIQUE NOT NULL,
            content TEXT DEFAULT '',
            tomorrow_plan TEXT DEFAULT '',
            mood TEXT DEFAULT 'normal',
            energy TEXT DEFAULT 'medium',
            tags TEXT DEFAULT '[]',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()


# ─── 收集箱 API ────────────────────────────────────────────

@app.route('/api/inbox', methods=['GET'])
def get_inbox():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM inbox_items ORDER BY created_at DESC')
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route('/api/inbox', methods=['POST'])
def add_inbox():
    data = request.json
    text = data.get('text', '').strip()
    deadline = data.get('deadline', 'inbox')
    priority = data.get('priority', 'medium')

    if not text:
        return jsonify({'success': False, 'message': '内容不能为空'})

    conn = get_db()
    c = conn.cursor()
    c.execute(
        'INSERT INTO inbox_items (text, deadline, priority) VALUES (?, ?, ?)',
        (text, deadline, priority)
    )
    conn.commit()
    new_id = c.lastrowid
    c.execute('SELECT * FROM inbox_items WHERE id = ?', (new_id,))
    item = dict(c.fetchone())
    conn.close()
    return jsonify({'success': True, 'item': item})

@app.route('/api/inbox/<int:item_id>', methods=['PUT'])
def update_inbox_item(item_id):
    data = request.json
    conn = get_db()
    c = conn.cursor()

    if 'done' in data:
        c.execute('UPDATE inbox_items SET done = ? WHERE id = ?', (data['done'], item_id))

    conn.commit()
    c.execute('SELECT * FROM inbox_items WHERE id = ?', (item_id,))
    item = dict(c.fetchone()) if c.fetchone() else None
    conn.close()
    return jsonify({'success': True, 'item': item})

@app.route('/api/inbox/<int:item_id>', methods=['DELETE'])
def delete_inbox_item(item_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM inbox_items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/inbox/<int:item_id>/move-today', methods=['POST'])
def move_inbox_to_today(item_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM inbox_items WHERE id = ?', (item_id,))
    item = c.fetchone()
    if not item:
        conn.close()
        return jsonify({'success': False, 'message': '找不到记录'})

    now = datetime.now().isoformat()
    c.execute(
        'INSERT INTO today_items (text, deadline, priority, created_at) VALUES (?, ?, ?, ?)',
        (item['text'], 'today', item['priority'], item['created_at'])
    )
    c.execute('UPDATE inbox_items SET moved_to_today_at = ? WHERE id = ?', (now, item_id))
    c.execute('DELETE FROM inbox_items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─── 今日待办 API ───────────────────────────────────────────

@app.route('/api/today', methods=['GET'])
def get_today():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM today_items ORDER BY created_at DESC')
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route('/api/today', methods=['POST'])
def add_today():
    data = request.json
    text = data.get('text', '').strip()
    if not text:
        return jsonify({'success': False})

    conn = get_db()
    c = conn.cursor()
    c.execute(
        'INSERT INTO today_items (text, deadline, priority) VALUES (?, ?, ?)',
        (text, 'today', data.get('priority', 'medium'))
    )
    conn.commit()
    new_id = c.lastrowid
    c.execute('SELECT * FROM today_items WHERE id = ?', (new_id,))
    item = dict(c.fetchone())
    conn.close()
    return jsonify({'success': True, 'item': item})

@app.route('/api/today/<int:item_id>', methods=['PUT'])
def update_today_item(item_id):
    data = request.json
    conn = get_db()
    c = conn.cursor()

    if 'done' in data:
        completed = datetime.now().isoformat() if data['done'] else None
        c.execute('UPDATE today_items SET done = ?, completed_at = ? WHERE id = ?',
                  (data['done'], completed, item_id))

    conn.commit()
    c.execute('SELECT * FROM today_items WHERE id = ?', (item_id,))
    item = dict(c.fetchone()) if c.fetchone() else None
    conn.close()
    return jsonify({'success': True, 'item': item})

@app.route('/api/today/<int:item_id>', methods=['DELETE'])
def delete_today_item(item_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM today_items WHERE id = ?', (item_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ─── 每日复盘 API ───────────────────────────────────────────

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    """获取所有有记录的日期列表"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT review_date FROM reviews ORDER BY review_date DESC')
    dates = [r['review_date'] for r in c.fetchall()]
    conn.close()
    return jsonify(dates)

@app.route('/api/review/<review_date>', methods=['GET'])
def get_review(review_date):
    """获取指定日期的复盘"""
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM reviews WHERE review_date = ?', (review_date,))
    row = c.fetchone()
    conn.close()
    if row:
        return jsonify(dict(row))
    return jsonify({
        'review_date': review_date,
        'content': '',
        'tomorrow_plan': '',
        'mood': 'normal',
        'energy': 'medium',
        'tags': '[]'
    })

@app.route('/api/review', methods=['POST'])
def save_review():
    """保存/更新复盘"""
    data = request.json
    review_date = data.get('review_date', date.today().isoformat())
    conn = get_db()
    c = conn.cursor()

    c.execute('''
        INSERT INTO reviews (review_date, content, tomorrow_plan, mood, energy, tags, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(review_date) DO UPDATE
        SET content = excluded.content,
            tomorrow_plan = excluded.tomorrow_plan,
            mood = excluded.mood,
            energy = excluded.energy,
            tags = excluded.tags,
            updated_at = CURRENT_TIMESTAMP
    ''', (
        review_date,
        data.get('content', ''),
        data.get('tomorrow_plan', ''),
        data.get('mood', 'normal'),
        data.get('energy', 'medium'),
        json.dumps(data.get('tags', []))
    ))

    conn.commit()
    c.execute('SELECT * FROM reviews WHERE review_date = ?', (review_date,))
    row = dict(c.fetchone())
    conn.close()
    return jsonify({'success': True, 'review': row})

# ─── 复盘分析 API ──────────────────────────────────────────

@app.route('/api/review/analysis', methods=['GET'])
def review_analysis():
    """分析近期复盘，给出进度反馈"""
    days = int(request.args.get('days', 7))
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    conn = get_db()
    c = conn.cursor()

    # 获取所有已完成条目
    c.execute('''
        SELECT text, completed_at FROM today_items
        WHERE completed_at IS NOT NULL
        AND date(completed_at) >= ?
        ORDER BY completed_at DESC
    ''', (start_date.isoformat(),))
    completed_items = [dict(r) for r in c.fetchall()]

    # 获取所有复盘
    c.execute('''
        SELECT * FROM reviews
        WHERE review_date >= ?
        ORDER BY review_date DESC
    ''', (start_date.isoformat(),))
    reviews = [dict(r) for r in c.fetchall()]

    conn.close()

    # 简单统计
    total_completed = len(completed_items)
    total_reviews = len(reviews)
    avg_energy = sum(1 for r in reviews if r.get('energy') == 'high') / max(total_reviews, 1)
    avg_mood = sum(1 for r in reviews if r.get('mood') == 'good') / max(total_reviews, 1)

    analysis = {
        'period': f'{start_date.isoformat()} 至 {end_date.isoformat()}',
        'total_completed': total_completed,
        'total_reviews': total_reviews,
        'completion_rate': f'{int(avg_energy * 100)}%',
        'mood_score': f'{int(avg_mood * 100)}%',
        'recent_items': [item['text'] for item in completed_items[:10]],
        'message': '继续加油！' if total_completed >= 5 else '今天任务完成得不错，继续保持！'
    }

    return jsonify(analysis)

# ─── 每日规划 API ───────────────────────────────────────────

@app.route('/api/plan', methods=['GET'])
def get_plan():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT value FROM app_state WHERE key = 'daily_plan'")
    row = c.fetchone()
    conn.close()
    return jsonify({'plan': row['value'] if row else ''})

@app.route('/api/plan', methods=['POST'])
def save_plan():
    data = request.json
    plan = data.get('plan', '')
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        INSERT INTO app_state (key, value) VALUES ('daily_plan', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    ''', (plan,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ─── 项目进度 API ──────────────────────────────────────────

@app.route('/api/projects', methods=['GET'])
def get_projects():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM project_items ORDER BY sort_order ASC, id ASC')
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return jsonify(rows)

@app.route('/api/projects', methods=['POST'])
def create_project():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT MAX(sort_order) as m FROM project_items')
    max_order = c.fetchone()['m'] or 0
    c.execute(
        'INSERT INTO project_items (name, emoji, problem, plan, target, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        (data.get('name',''), data.get('emoji','📁'), data.get('problem',''),
         data.get('plan',''), data.get('target',''), max_order + 1)
    )
    conn.commit()
    new_id = c.lastrowid
    c.execute('SELECT * FROM project_items WHERE id=?', (new_id,))
    row = dict(c.fetchone())
    conn.close()
    return jsonify(row)

@app.route('/api/projects/<int:pid>', methods=['PUT'])
def update_project(pid):
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        UPDATE project_items
        SET name=?, emoji=?, problem=?, plan=?, target=?, sort_order=?
        WHERE id=?
    ''', (data.get('name',''), data.get('emoji','📁'), data.get('problem',''),
          data.get('plan',''), data.get('target',''), data.get('sort_order',0), pid))
    conn.commit()
    c.execute('SELECT * FROM project_items WHERE id=?', (pid,))
    row = dict(c.fetchone())
    conn.close()
    return jsonify(row)

@app.route('/api/projects/<int:pid>', methods=['DELETE'])
def delete_project(pid):
    conn = get_db()
    conn.execute('DELETE FROM project_items WHERE id=?', (pid,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/projects/reorder', methods=['POST'])
def reorder_projects():
    data = request.json
    ids = data.get('ids', [])
    conn = get_db()
    c = conn.cursor()
    for order, pid in enumerate(ids):
        c.execute('UPDATE project_items SET sort_order=? WHERE id=?', (order, pid))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ─── 工作流 API ───────────────────────────────────────────

@app.route('/api/workflow', methods=['GET'])
def get_workflow():
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT value FROM app_state WHERE key = 'workflow'")
    row = c.fetchone()
    conn.close()
    if row and row['value']:
        data = json.loads(row['value'])
        return jsonify(data)
    return jsonify({'steps': []})

@app.route('/api/workflow', methods=['POST'])
def save_workflow():
    data = request.json
    steps = data.get('steps', [])
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        INSERT INTO app_state (key, value) VALUES ('workflow', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    ''', (json.dumps({'steps': steps}),))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ─── 页面 ───────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory('/opt/xingye/projects/demo/static', 'index.html')


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5002, debug=False)
