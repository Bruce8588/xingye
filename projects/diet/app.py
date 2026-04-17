"""
饮食记录网站 - Flask后端
小红书风格 + 用户系统 + 每日邮件汇总
"""

import os
import sqlite3
import hashlib
import secrets
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from werkzeug.utils import secure_filename
from functools import wraps

app = Flask(__name__,
            template_folder='/opt/xingye/projects/diet/templates',
            static_folder='/opt/xingye/projects/diet/static')
app.config['SECRET_KEY'] = secrets.token_hex(32)
app.config['UPLOAD_FOLDER'] = '/opt/xingye/projects/diet/static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# 邮件配置（QQ邮箱）
EMAIL_CONFIG = {
    'smtp_server': 'smtp.qq.com',
    'smtp_port': 587,
    'sender_email': '1299960857@qq.com',
    'sender_password': 'yckyfmrldseajfgi',
}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
DATABASE = '/opt/xingye/data/diet/diet_tracker.db'

# ========== 邮件发送防护辅助函数 ==========
def check_already_sent(sent_date, sent_type="yesterday"):
    conn = sqlite3.connect('/opt/xingye/data/diet/diet_tracker.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT 1 FROM email_sent_log WHERE sent_date = ? AND sent_type = ?", (sent_date, sent_type))
        return cursor.fetchone() is not None
    finally:
        conn.close()

def record_email_sent(sent_date, sent_type, user_count):
    conn = sqlite3.connect('/opt/xingye/data/diet/diet_tracker.db')
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO email_sent_log (sent_date, sent_type, user_count) VALUES (?, ?, ?)", 
                      (sent_date, sent_type, user_count))
        conn.commit()
    except sqlite3.IntegrityError:
        pass
    finally:
        conn.close()

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 创建用户表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 创建饮食记录表
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS food_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            food_name TEXT NOT NULL,
            category TEXT NOT NULL,
            photo_path TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function

# ============ 认证路由 ============

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect('/login')
    # 获取当前用户的记录
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, u.username as user_name 
        FROM food_records r 
        JOIN users u ON r.user_id = u.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    ''', (session['user_id'],))
    records = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # 按日期分组
    records_by_date = {}
    for record in records:
        date_str = record['created_at'].split(' ')[0]
        if date_str not in records_by_date:
            records_by_date[date_str] = []
        records_by_date[date_str].append(record)
    
    return render_template('index.html', 
                         username=session.get('username'),
                         records_by_date=records_by_date)

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect('/')
    return render_template('login.html')

@app.route('/register')
def register_page():
    if 'user_id' in session:
        return redirect('/')
    return render_template('register.html')

@app.route('/api/register', methods=['POST'])
def api_register():
    username = request.json.get('username', '').strip()
    email = request.json.get('email', '').strip()
    password = request.json.get('password', '').strip()
    
    if not username or not password or not email:
        return jsonify({'success': False, 'message': '请填写用户名、邮箱和密码'})
    if len(username) < 2 or len(username) > 20:
        return jsonify({'success': False, 'message': '用户名需要2-20个字符'})
    if len(password) < 4:
        return jsonify({'success': False, 'message': '密码至少4个字符'})
    if '@' not in email:
        return jsonify({'success': False, 'message': '请输入有效的邮箱地址'})
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM users WHERE username = ?', (username,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': '用户名已存在'})
    
    cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': '该邮箱已被注册'})
    
    cursor.execute('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                  (username, email, hash_password(password)))
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    session['user_id'] = user_id
    session['username'] = username
    return jsonify({'success': True, 'message': '注册成功'})

@app.route('/api/login', methods=['POST'])
def api_login():
    username = request.json.get('username', '').strip()
    password = request.json.get('password', '').strip()
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, password_hash FROM users WHERE username = ?', (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or user['password_hash'] != hash_password(password):
        return jsonify({'success': False, 'message': '用户名或密码错误'})
    
    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({'success': True, 'message': '登录成功'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

# ============ 主要功能路由 ============

@app.route('/add')
@login_required
def add_page():
    return render_template('add.html', username=session.get('username'))

@app.route('/api/upload', methods=['POST'])
@login_required
def upload():
    food_name = request.form.get('food_name', '').strip()
    category = request.form.get('category', 'snack')
    notes = request.form.get('notes', '').strip()
    
    if not food_name:
        return jsonify({'success': False, 'message': '请输入食物名称'})
    
    photo_path = None
    if 'photo' in request.files:
        file = request.files['photo']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            photo_path = f"uploads/{filename}"
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO food_records (user_id, food_name, category, photo_path, notes)
        VALUES (?, ?, ?, ?, ?)
    ''', (session['user_id'], food_name, category, photo_path, notes))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'message': '记录成功！'})

@app.route('/ai-admin')
def ai_admin():
    """AI管理后台（无需登录）"""
    return render_template('ai_admin.html')

@app.route('/admin')
def admin_page():
    """管理页面（需要登录）"""
    if 'user_id' not in session:
        return redirect('/login')
    return render_template('admin.html', username=session.get('username'))

@app.route('/api/records')
@login_required
def get_records():
    """获取当前用户的记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, u.username 
        FROM food_records r 
        JOIN users u ON r.user_id = u.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    ''', (session['user_id'],))
    records = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(records)

@app.route('/api/records/<int:record_id>', methods=['DELETE'])
@login_required
def delete_single_record(record_id):
    """删除单条记录"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT photo_path FROM food_records WHERE id = ? AND user_id = ?', 
                   (record_id, session['user_id']))
    row = cursor.fetchone()
    if row and row['photo_path']:
        photo_file = os.path.join(app.config['UPLOAD_FOLDER'], 
                                   row['photo_path'].replace('uploads/', ''))
        if os.path.exists(photo_file):
            os.remove(photo_file)
    
    cursor.execute('DELETE FROM food_records WHERE id = ? AND user_id = ?', 
                   (record_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/delete/<int:record_id>')
@login_required
def delete_record(record_id):
    conn = get_db()
    cursor = conn.cursor()
    # 确保只能删除自己的记录
    cursor.execute('SELECT photo_path FROM food_records WHERE id = ? AND user_id = ?', 
                   (record_id, session['user_id']))
    row = cursor.fetchone()
    if row and row['photo_path']:
        photo_file = os.path.join(app.config['UPLOAD_FOLDER'], 
                                   row['photo_path'].replace('uploads/', ''))
        if os.path.exists(photo_file):
            os.remove(photo_file)
    
    cursor.execute('DELETE FROM food_records WHERE id = ? AND user_id = ?', 
                   (record_id, session['user_id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/send-digest', methods=['POST'])
def api_send_digest():
    if request.args.get('key') != 'admin-secret-key':
        return jsonify({'success': False, 'message': '没有权限'})
    
    success, msg = send_daily_digest()
    return jsonify({'success': success, 'message': msg})

@app.route('/api/stats')
def api_stats():
    """获取统计数据（无需登录）"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM users')
    user_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM food_records WHERE date(created_at) = date('now', 'localtime')")
    today_count = cursor.fetchone()[0]
    
    cursor.execute('SELECT COUNT(*) FROM food_records')
    total_count = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'userCount': user_count,
        'todayCount': today_count,
        'totalCount': total_count
    })

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_today_records():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, u.username 
        FROM food_records r 
        JOIN users u ON r.user_id = u.id
        WHERE date(r.created_at) = date('now', 'localtime')
        ORDER BY r.created_at DESC
    ''')
    records = cursor.fetchall()
    conn.close()
    return records

def send_daily_digest():
    """给所有用户发送今日饮食汇总邮件"""
    # 重复发送防护
    today = datetime.now().strftime("%Y-%m-%d")
    if check_already_sent(today, "today"):
        return False, "今日邮件已发送过"
    records = get_today_records()
    if not records:
        return False, "今天没有记录"
    
    # 获取所有用户邮箱
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT username, email FROM users')
    all_users = {row['username']: row['email'] for row in cursor.fetchall()}
    conn.close()
    
    # 按用户分组今天的记录
    by_user = {}
    for r in records:
        user = r['username']
        if user not in by_user:
            by_user[user] = []
        by_user[user].append(r)
    
    html_content = f"""
    <html><head>
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 24px; text-align: center; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
            .header p {{ margin: 8px 0 0; opacity: 0.9; font-size: 14px; }}
            .content {{ padding: 24px; }}
            .stats {{ display: flex; gap: 16px; margin-bottom: 24px; }}
            .stat {{ flex: 1; background: #fafafa; padding: 16px; border-radius: 12px; text-align: center; }}
            .stat-num {{ font-size: 28px; font-weight: 700; color: #FF6B6B; }}
            .stat-label {{ font-size: 12px; color: #666; margin-top: 4px; }}
            .user-section {{ margin-bottom: 24px; border-left: 3px solid #FF6B6B; padding-left: 16px; }}
            .user-name {{ font-size: 16px; font-weight: 600; color: #333; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }}
            .record {{ display: flex; gap: 12px; padding: 16px; background: #fafafa; border-radius: 12px; margin-bottom: 12px; }}
            .record-img {{ width: 64px; height: 64px; border-radius: 8px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }}
            .record-img img {{ width: 64px; height: 64px; border-radius: 8px; object-fit: cover; }}
            .record-info {{ flex: 1; }}
            .record-name {{ font-weight: 600; font-size: 16px; color: #333; margin-bottom: 4px; }}
            .record-meta {{ font-size: 13px; color: #999; }}
            .category {{ display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }}
            .category-breakfast {{ background: #FFF3E0; color: #FF9800; }}
            .category-lunch {{ background: #E8F5E9; color: #4CAF50; }}
            .category-dinner {{ background: #E3F2FD; color: #2196F3; }}
            .category-snack {{ background: #FCE4EC; color: #E91E63; }}
            .footer {{ text-align: center; padding: 20px; color: #999; font-size: 12px; }}
            .motivation {{ background: linear-gradient(135deg, #FFF5F5 0%, #FFF0F0 100%); padding: 16px; border-radius: 12px; margin-top: 20px; text-align: center; color: #FF6B6B; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🍽️ 今日饮食汇报</h1>
                <p>{date.today().strftime('%Y年%m月%d日')}</p>
            </div>
            <div class="content">
                <div class="stats">
                    <div class="stat">
                        <div class="stat-num">{len(records)}</div>
                        <div class="stat-label">今日总记录</div>
                    </div>
                    <div class="stat">
                        <div class="stat-num">{len(by_user)}</div>
                        <div class="stat-label">参与者</div>
                    </div>
                    <div class="stat">
                        <div class="stat-num">{sum(len(r) for r in by_user.values())}</div>
                        <div class="stat-label">今日餐次</div>
                    </div>
                </div>
    """
    
    for user_name, user_records in by_user.items():
        cat_breakfast = [r for r in user_records if r['category'] == 'breakfast']
        cat_lunch = [r for r in user_records if r['category'] == 'lunch']
        cat_dinner = [r for r in user_records if r['category'] == 'dinner']
        cat_snack = [r for r in user_records if r['category'] == 'snack']
        
        html_content += f'''
                <div class="user-section">
                    <div class="user-name">👤 {user_name}</div>
        '''
        
        for r in user_records:
            cat_class = f'category-{r["category"]}'
            cat_text = {'breakfast': '🌅 早餐', 'lunch': '☀️ 午餐', 'dinner': '🌙 晚餐', 'snack': '🍰 零食'}.get(r['category'], '🍽️ 其他')
            time_str = r['created_at'].split(' ')[1][:5] if ' ' in r['created_at'] else ''
            
            html_content += f"""
                    <div class="record">
                        <div class="record-img">
                            {'🍽️' if not r['photo_path'] else f'<img src="/static/{r["photo_path"]}">'}
                        </div>
                        <div class="record-info">
                            <div class="record-name">{r['food_name']}</div>
                            <div class="record-meta">
                                <span class="category {cat_class}">{cat_text}</span>
                                <span>{time_str}</span>
                            </div>
                            {f'<div style="margin-top: 4px; font-size: 13px; color: #666;">📝 {r["notes"]}</div>' if r['notes'] else ''}
                        </div>
                    </div>
            """
        
        html_content += '</div>'
    
    html_content += f"""
                <div class="motivation">
                    💪 互相监督，共同保持健康饮食习惯！
                </div>
            </div>
            <div class="footer">由饮食记录网站自动生成 · {date.today().strftime('%Y年%m月%d日')}</div>
        </div>
    </body>
    </html>
    """
    
    # 给所有用户发送邮件
    try:
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import smtplib
        
        sent_count = 0
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            
            for user_name, user_email in all_users.items():
                msg = MIMEMultipart('related')
                msg['Subject'] = f"🍽️ {date.today().strftime('%m月%d日')}饮食汇报 | {len(records)}条记录 · {len(by_user)}人参与"
                msg['From'] = EMAIL_CONFIG['sender_email']
                msg['To'] = user_email
                msg.attach(MIMEText(html_content, 'html', 'utf-8'))
                server.send_message(msg)
                sent_count += 1
        
        record_email_sent(date.today().strftime("%Y-%m-%d"), "today", sent_count)
        return True, f"成功发送给 {sent_count} 位用户！"
    except Exception as e:
        return False, f"邮件发送失败: {str(e)}"

if __name__ == '__main__':
    init_db()
    print("🍽️ 饮食记录网站启动！")
    print("📱 请访问: http://localhost:5001")
    print("🌐 局域网访问: http://10.27.130.112:5001")
    app.run(debug=False, host='0.0.0.0', port=5001)
