#!/usr/bin/env python3
"""
读书笔记后端服务
"""
import sys
sys.path.insert(0, '/root/life-manager')

import sqlite3
import json
from datetime import datetime
from flask import Flask, jsonify, request, g

app = Flask(__name__)
DATABASE = '/opt/xingye/data/reading/reading.db'

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

@app.route('/api/reading/books', methods=['GET'])
def get_books():
    db = get_db()
    books = db.execute('SELECT * FROM books ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in books])

@app.route('/api/reading/books', methods=['POST'])
def create_book():
    data = request.json
    db = get_db()
    cursor = db.execute(
        'INSERT INTO books (id, title, author, cover, description, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))',
        [data['id'], data.get('title', ''), data.get('author', ''), data.get('cover', ''), data.get('description', ''), data.get('color', '#6366f1')]
    )
    db.commit()
    return jsonify({'id': data['id']})

@app.route('/api/reading/books/<book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.json
    db = get_db()
    db.execute(
        'UPDATE books SET title=?, author=?, cover=?, description=?, color=?, updated_at=datetime("now") WHERE id=?',
        [data.get('title', ''), data.get('author', ''), data.get('cover', ''), data.get('description', ''), data.get('color', '#6366f1'), book_id]
    )
    db.commit()
    return jsonify({'id': book_id})

@app.route('/api/reading/books/<book_id>', methods=['DELETE'])
def delete_book(book_id):
    db = get_db()
    db.execute('DELETE FROM books WHERE id=?', [book_id])
    db.execute('DELETE FROM notes WHERE book_id=?', [book_id])
    db.execute('DELETE FROM summaries WHERE book_id=?', [book_id])
    db.execute('DELETE FROM mindmaps WHERE book_id=?', [book_id])
    db.commit()
    return jsonify({'deleted': True})

@app.route('/api/reading/notes', methods=['GET'])
def get_notes():
    book_id = request.args.get('book_id')
    db = get_db()
    if book_id:
        notes = db.execute('SELECT * FROM notes WHERE book_id=? ORDER BY created_at DESC', [book_id]).fetchall()
    else:
        notes = db.execute('SELECT * FROM notes ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in notes])

@app.route('/api/reading/notes', methods=['POST'])
def create_note():
    data = request.json
    db = get_db()
    note_id = data.get('id') or str(int(datetime.now().timestamp() * 1000))
    cursor = db.execute(
        'INSERT INTO notes (id, book_id, content, created_at) VALUES (?, ?, ?, datetime("now"))',
        [note_id, data['book_id'], data['content']]
    )
    db.commit()
    return jsonify({'id': note_id})

@app.route('/api/reading/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    data = request.json
    db = get_db()
    db.execute('UPDATE notes SET content=? WHERE id=?', [data['content'], note_id])
    db.commit()
    return jsonify({'id': note_id})

@app.route('/api/reading/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    db = get_db()
    db.execute('DELETE FROM notes WHERE id=?', [note_id])
    db.commit()
    return jsonify({'deleted': True})

@app.route('/api/reading/summaries', methods=['GET'])
def get_summaries():
    book_id = request.args.get('book_id')
    db = get_db()
    if book_id:
        summaries = db.execute('SELECT * FROM summaries WHERE book_id=? ORDER BY created_at DESC', [book_id]).fetchall()
    else:
        summaries = db.execute('SELECT * FROM summaries ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in summaries])

@app.route('/api/reading/summaries', methods=['POST'])
def create_summary():
    data = request.json
    db = get_db()
    summary_id = data.get('id') or str(int(datetime.now().timestamp() * 1000))
    cursor = db.execute(
        'INSERT INTO summaries (id, book_id, title, content, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [summary_id, data['book_id'], data.get('title', ''), data['content']]
    )
    db.commit()
    return jsonify({'id': summary_id})

@app.route('/api/reading/summaries/<summary_id>', methods=['PUT'])
def update_summary(summary_id):
    data = request.json
    db = get_db()
    db.execute('UPDATE summaries SET title=?, content=? WHERE id=?', [data.get('title', ''), data['content'], summary_id])
    db.commit()
    return jsonify({'id': summary_id})

@app.route('/api/reading/summaries/<summary_id>', methods=['DELETE'])
def delete_summary(summary_id):
    db = get_db()
    db.execute('DELETE FROM summaries WHERE id=?', [summary_id])
    db.commit()
    return jsonify({'deleted': True})

@app.route('/api/reading/mindmaps', methods=['GET'])
def get_mindmaps():
    book_id = request.args.get('book_id')
    db = get_db()
    if book_id:
        mindmaps = db.execute('SELECT * FROM mindmaps WHERE book_id=? ORDER BY created_at DESC', [book_id]).fetchall()
    else:
        mindmaps = db.execute('SELECT * FROM mindmaps ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in mindmaps])

@app.route('/api/reading/mindmaps', methods=['POST'])
def create_mindmap():
    data = request.json
    db = get_db()
    mindmap_id = data.get('id') or str(int(datetime.now().timestamp() * 1000))
    cursor = db.execute(
        'INSERT INTO mindmaps (id, book_id, nodes, created_at) VALUES (?, ?, ?, datetime("now"))',
        [mindmap_id, data['book_id'], json.dumps(data['nodes'])]
    )
    db.commit()
    return jsonify({'id': mindmap_id})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6788, debug=False)
