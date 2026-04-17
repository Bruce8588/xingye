#!/usr/bin/env python3
"""
心理板块后端服务
"""
import sqlite3
import time
import uuid
from flask import Flask, jsonify, request, g

app = Flask(__name__)
DATABASE = '/opt/xingye/data/psychology/xingye.db'

# 默认心影数据
DEFAULT_HEARTS = [
    {
        'id': 'default-intj',
        'name': 'INTJ',
        'traits': '战略思维、追求效率、注重逻辑、独立自主。喜欢制定长期计划，善于发现系统性问题并设计解决方案。对无效社交不感兴趣，更偏好深度对话。',
        'tools': 'SWOT分析、波特五力模型、第一性原理思维、系统思维图谱',
    },
    {
        'id': 'default-estp',
        'name': 'ESTP',
        'traits': '务实行动派、擅长即时应对、喜欢动手解决问题、追求刺激和新鲜感。社交能力强，善于读懂现场气氛，快速做出反应。',
        'tools': '快速原型法、Demo演示、压力测试、SWOT实战',
    },
]

# 默认工具数据
DEFAULT_TOOLS = [
    {
        'id': 'default-first-principle',
        'name': '第一性原理',
        'method': '从物理最基本的定律出发，一层层剥开表象，找到问题的本质。常用于颠覆性创新和重大决策。',
        'scenario': '面对重大人生选择（转行、创业）、评估一个热门趋势、解决长期困扰的问题。',
        'notes': '追问"这件事为什么是这样"至少5遍，直到无法再追问。',
    },
    {
        'id': 'default-8020',
        'name': '二八法则',
        'method': '80%的结果由20%的原因产生。识别并聚焦那20%的关键要素，忽略大多数低效部分。',
        'scenario': '时间管理（找到最有产出的一件事）、资源分配、人生优先级排序。识别最值得深耕的技能。',
        'notes': '执行时先问自己：什么事是我做到极致，ROI最高？',
    },
    {
        'id': 'default-reverse',
        'name': '逆向思维',
        'method': '从结果倒推，或者从反面思考。先假设失败了，分析失败原因，然后提前规避。',
        'scenario': '制定计划时（问"这个计划哪里会出问题"）、评估风险、避免认知盲区。',
        'notes': '适用于重要决策前的安全检查。',
    },
]


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_default_data():
    """仅在数据库为空时写入默认数据"""
    db = get_db()

    # 检查心影
    hearts = db.execute('SELECT COUNT(*) FROM psychology_hearts').fetchone()[0]
    if hearts == 0:
        now = time.strftime('%Y-%m-%d %H:%M:%S')
        for h in DEFAULT_HEARTS:
            db.execute(
                'INSERT INTO psychology_hearts (id, name, traits, tools, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [h['id'], h['name'], h['traits'], h['tools'], now, now]
            )
        db.commit()

    # 检查工具
    tools = db.execute('SELECT COUNT(*) FROM psychology_tools').fetchone()[0]
    if tools == 0:
        now = time.strftime('%Y-%m-%d %H:%M:%S')
        for t in DEFAULT_TOOLS:
            db.execute(
                'INSERT INTO psychology_tools (id, name, method, scenario, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [t['id'], t['name'], t['method'], t['scenario'], t['notes'], now, now]
            )
        db.commit()


# ============ 心影 API ============

@app.route('/api/psychology/hearts', methods=['GET'])
def get_hearts():
    db = get_db()
    rows = db.execute('SELECT * FROM psychology_hearts ORDER BY created_at DESC').fetchall()
    return jsonify([{
        'id': r['id'],
        'name': r['name'],
        'traits': r['traits'] or '',
        'tools': r['tools'] or '',
        'createdAt': r['created_at'],
        'updatedAt': r['updated_at'],
    } for r in rows])


@app.route('/api/psychology/hearts', methods=['POST'])
def create_heart():
    data = request.json
    heart_id = data.get('id') or str(time.time())
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'INSERT INTO psychology_hearts (id, name, traits, tools, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [heart_id, data.get('name', ''), data.get('traits', ''), data.get('tools', ''), now, now]
    )
    db.commit()
    return jsonify({'id': heart_id, 'createdAt': now, 'updatedAt': now})


@app.route('/api/psychology/hearts/<heart_id>', methods=['PUT'])
def update_heart(heart_id):
    data = request.json
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'UPDATE psychology_hearts SET name=?, traits=?, tools=?, updated_at=? WHERE id=?',
        [data.get('name', ''), data.get('traits', ''), data.get('tools', ''), now, heart_id]
    )
    db.commit()
    return jsonify({'id': heart_id, 'updatedAt': now})


@app.route('/api/psychology/hearts/<heart_id>', methods=['DELETE'])
def delete_heart(heart_id):
    db = get_db()
    db.execute('DELETE FROM psychology_hearts WHERE id=?', [heart_id])
    db.commit()
    return jsonify({'deleted': True})


# ============ 工具箱 API ============

@app.route('/api/psychology/tools', methods=['GET'])
def get_tools():
    db = get_db()
    rows = db.execute('SELECT * FROM psychology_tools ORDER BY created_at DESC').fetchall()
    return jsonify([{
        'id': r['id'],
        'name': r['name'],
        'method': r['method'] or '',
        'scenario': r['scenario'] or '',
        'notes': r['notes'] or '',
        'createdAt': r['created_at'],
        'updatedAt': r['updated_at'],
    } for r in rows])


@app.route('/api/psychology/tools', methods=['POST'])
def create_tool():
    data = request.json
    tool_id = data.get('id') or str(time.time())
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'INSERT INTO psychology_tools (id, name, method, scenario, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tool_id, data.get('name', ''), data.get('method', ''), data.get('scenario', ''), data.get('notes', ''), now, now]
    )
    db.commit()
    return jsonify({'id': tool_id, 'createdAt': now, 'updatedAt': now})


@app.route('/api/psychology/tools/<tool_id>', methods=['PUT'])
def update_tool(tool_id):
    data = request.json
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'UPDATE psychology_tools SET name=?, method=?, scenario=?, notes=?, updated_at=? WHERE id=?',
        [data.get('name', ''), data.get('method', ''), data.get('scenario', ''), data.get('notes', ''), now, tool_id]
    )
    db.commit()
    return jsonify({'id': tool_id, 'updatedAt': now})


@app.route('/api/psychology/tools/<tool_id>', methods=['DELETE'])
def delete_tool(tool_id):
    db = get_db()
    db.execute('DELETE FROM psychology_tools WHERE id=?', [tool_id])
    db.commit()
    return jsonify({'deleted': True})


# ============ 心理问题 API ============

@app.route('/api/psychology/issues', methods=['GET'])
def get_issues():
    db = get_db()
    rows = db.execute('SELECT * FROM psychology_issues ORDER BY created_at DESC').fetchall()
    return jsonify([{
        'id': r['id'],
        'name': r['name'],
        'description': r['description'] or '',
        'triggers': r['triggers'] or '',
        'frequency': r['frequency'] or '偶尔',
        'problems': r['problems'] or '',
        'solutions': r['solutions'] or '',
        'status': r['status'] or '进行中',
        'effectiveness': r['effectiveness'] or 0,
        'createdAt': r['created_at'],
        'updatedAt': r['updated_at'],
    } for r in rows])


@app.route('/api/psychology/issues', methods=['POST'])
def create_issue():
    data = request.json
    issue_id = data.get('id') or str(time.time())
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'INSERT INTO psychology_issues (id, name, description, triggers, frequency, problems, solutions, status, effectiveness, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [issue_id, data.get('name', ''), data.get('description', ''), data.get('triggers', ''),
         data.get('frequency', '偶尔'), data.get('problems', ''), data.get('solutions', ''),
         data.get('status', '进行中'), data.get('effectiveness', 0), now, now]
    )
    db.commit()
    return jsonify({'id': issue_id, 'createdAt': now, 'updatedAt': now})


@app.route('/api/psychology/issues/<issue_id>', methods=['PUT'])
def update_issue(issue_id):
    data = request.json
    now = time.strftime('%Y-%m-%d %H:%M:%S')
    db = get_db()
    db.execute(
        'UPDATE psychology_issues SET name=?, description=?, triggers=?, frequency=?, problems=?, solutions=?, status=?, effectiveness=?, updated_at=? WHERE id=?',
        [data.get('name', ''), data.get('description', ''), data.get('triggers', ''),
         data.get('frequency', '偶尔'), data.get('problems', ''), data.get('solutions', ''),
         data.get('status', '进行中'), data.get('effectiveness', 0), now, issue_id]
    )
    db.commit()
    return jsonify({'id': issue_id, 'updatedAt': now})


@app.route('/api/psychology/issues/<issue_id>', methods=['DELETE'])
def delete_issue(issue_id):
    db = get_db()
    db.execute('DELETE FROM psychology_issues WHERE id=?', [issue_id])
    db.commit()
    return jsonify({'deleted': True})


# ============ 初始化 ============
with app.app_context():
    init_default_data()


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6790, debug=False)
