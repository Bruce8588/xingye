"""
Trading System Backend - Flask API
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# Database
DATABASE_URL = "sqlite:////opt/xingye/data/trading/trading.db"
engine = create_engine(DATABASE_URL, echo=False)
Base = declarative_base()
Session = sessionmaker(bind=engine)

# ============== Models ==============

class Memo(Base):
    __tablename__ = 'memos'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), default='')
    content = Column(Text, nullable=False)
    logic_group_ids = Column(JSON, default=list)  # JSON array of logic group IDs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class LogicGroup(Base):
    __tablename__ = 'logic_groups'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(20), default='#6366f1')
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    stocks = relationship('Stock', back_populates='logic_group')

class CustomField(Base):
    __tablename__ = 'custom_fields'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    field_type = Column(String(20), default='text')  # text, number, date
    created_at = Column(DateTime, default=datetime.utcnow)

class Stock(Base):
    __tablename__ = 'stocks'
    id = Column(Integer, primary_key=True)
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    sector = Column(String(100))
    current_price = Column(Float)
    notes = Column(Text)
    logic_group_id = Column(Integer, ForeignKey('logic_groups.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    logic_group = relationship('LogicGroup', back_populates='stocks')
    field_values = relationship('StockFieldValue', back_populates='stock', cascade='all, delete-orphan')

class StockFieldValue(Base):
    __tablename__ = 'stock_field_values'
    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey('stocks.id'))
    custom_field_id = Column(Integer, ForeignKey('custom_fields.id'))
    value = Column(Text)
    stock = relationship('Stock', back_populates='field_values')
    custom_field = relationship('CustomField')

class TradingModel(Base):
    __tablename__ = 'trading_models'
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    drawing_data = Column(JSON)  # Canvas drawing data stored as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class MarketEntry(Base):
    __tablename__ = 'market_entries'
    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text)
    category = Column(String(50), default='index')  # index, sector, news, sentiment, custom
    tags = Column(JSON)  # List of tags
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RiskRule(Base):
    __tablename__ = 'risk_rules'
    id = Column(Integer, primary_key=True)
    name = Column(String(50), nullable=False)  # max_position_percent, max_total_exposure, etc.
    value = Column(Float, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RiskPosition(Base):
    __tablename__ = 'risk_positions'
    id = Column(Integer, primary_key=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    price = Column(Float, default=0)
    quantity = Column(Integer, default=0)
    cost = Column(Float, default=0)
    stop_loss = Column(Float, default=0)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class RiskAlert(Base):
    __tablename__ = 'risk_alerts'
    id = Column(Integer, primary_key=True)
    alert_type = Column(String(20), default='warning')  # warning, danger, info
    message = Column(Text, nullable=False)
    is_read = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class TradingReview(Base):
    __tablename__ = 'trading_reviews'
    id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Decision(Base):
    __tablename__ = 'decisions'
    id = Column(Integer, primary_key=True)
    stock_name = Column(String(100), nullable=False)
    decision = Column(Text, nullable=False)
    max_risk = Column(Float, default=0)
    buy_price = Column(Float, default=0)
    stop_loss = Column(Float, default=0)
    position_period = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)

class MarketRecord(Base):
    __tablename__ = 'market_records'
    id = Column(Integer, primary_key=True)
    stock_id = Column(Integer, ForeignKey('stocks.id'))
    date = Column(String(20))  # YYYY-MM-DD
    data = Column(JSON, default=dict)  # JSON object with trend data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables
Base.metadata.create_all(engine)

# Migration: add title column to memos if not exists
from sqlalchemy import inspect, text
inspector = inspect(engine)
columns = [c['name'] for c in inspector.get_columns('memos')]
if 'title' not in columns:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE memos ADD COLUMN title TEXT DEFAULT ''"))
        conn.execute(text("UPDATE memos SET title = '' WHERE title IS NULL"))

# Migration: add logic_group_ids column to memos if not exists
columns = [c['name'] for c in inspector.get_columns('memos')]
if 'logic_group_ids' not in columns:
    with engine.begin() as conn:
        if 'logic_group_id' in columns:
            conn.execute(text("ALTER TABLE memos ADD COLUMN logic_group_ids TEXT"))
            results = conn.execute(text("SELECT id, logic_group_id FROM memos WHERE logic_group_id IS NOT NULL")).fetchall()
            for row in results:
                conn.execute(text("UPDATE memos SET logic_group_ids = :ids WHERE id = :id"),
                             [{'ids': json.dumps([row.logic_group_id]), 'id': row.id}])
        else:
            conn.execute(text("ALTER TABLE memos ADD COLUMN logic_group_ids TEXT"))

# Migration: add sort_order column to logic_groups if not exists
columns = [c['name'] for c in inspector.get_columns('logic_groups')]
if 'sort_order' not in columns:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE logic_groups ADD COLUMN sort_order INTEGER DEFAULT 0"))
        # Initialize existing groups with their id order as sort_order
        results = conn.execute(text("SELECT id FROM logic_groups ORDER BY id ASC")).fetchall()
        for idx, row in enumerate(results):
            conn.execute(text("UPDATE logic_groups SET sort_order = :so WHERE id = :id"),
                         [{'so': idx, 'id': row.id}])
        print(f"Migration: initialized sort_order for {len(results)} logic groups")

# ============== API Routes ==============

# --- Memos ---
@app.route('/api/memos', methods=['GET'])
def get_memos():
    session = Session()
    memos = session.query(Memo).order_by(Memo.updated_at.desc()).all()
    # Fetch all logic groups once for resolving names/colors
    all_groups = {g.id: g for g in session.query(LogicGroup).all()}
    result = []
    for m in memos:
        ids = m.logic_group_ids or []
        logic_groups = [
            {'id': gid, 'name': all_groups[gid].name, 'color': all_groups[gid].color}
            for gid in ids if gid in all_groups
        ]
        result.append({
            'id': m.id,
            'title': m.title or '',
            'content': m.content,
            'logic_group_ids': ids,
            'logic_groups': logic_groups,
            'created_at': m.created_at.isoformat(),
            'updated_at': m.updated_at.isoformat()
        })
    session.close()
    return jsonify(result)

@app.route('/api/memos', methods=['POST'])
def create_memo():
    data = request.json
    session = Session()
    logic_group_ids = data.get('logic_group_ids', [])
    memo = Memo(title=data.get('title', ''), content=data['content'], logic_group_ids=logic_group_ids)
    session.add(memo)
    session.commit()
    ids = memo.logic_group_ids or []
    all_groups = {g.id: g for g in session.query(LogicGroup).all()}
    logic_groups = [
        {'id': gid, 'name': all_groups[gid].name, 'color': all_groups[gid].color}
        for gid in ids if gid in all_groups
    ]
    result = {
        'id': memo.id,
        'title': memo.title or '',
        'content': memo.content,
        'logic_group_ids': ids,
        'logic_groups': logic_groups,
        'created_at': memo.created_at.isoformat(),
        'updated_at': memo.updated_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/memos/<int:id>', methods=['PUT'])
def update_memo(id):
    data = request.json
    session = Session()
    memo = session.query(Memo).get(id)
    if memo:
        memo.content = data.get('content', memo.content)
        memo.title = data.get('title', memo.title)
        if 'logic_group_ids' in data:
            memo.logic_group_ids = data['logic_group_ids']
        session.commit()
        ids = memo.logic_group_ids or []
        all_groups = {g.id: g for g in session.query(LogicGroup).all()}
        logic_groups = [
            {'id': gid, 'name': all_groups[gid].name, 'color': all_groups[gid].color}
            for gid in ids if gid in all_groups
        ]
        result = {
            'id': memo.id,
            'title': memo.title or '',
            'content': memo.content,
            'logic_group_ids': ids,
            'logic_groups': logic_groups,
            'created_at': memo.created_at.isoformat(),
            'updated_at': memo.updated_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/memos/<int:id>', methods=['DELETE'])
def delete_memo(id):
    session = Session()
    memo = session.query(Memo).get(id)
    if memo:
        session.delete(memo)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Logic Groups ---
@app.route('/api/logic-groups', methods=['GET'])
def get_logic_groups():
    session = Session()
    groups = session.query(LogicGroup).order_by(LogicGroup.sort_order.asc()).all()
    result = [{'id': g.id, 'name': g.name, 'description': g.description, 'color': g.color, 'sort_order': g.sort_order, 'created_at': g.created_at.isoformat()} for g in groups]
    session.close()
    return jsonify(result)

@app.route('/api/logic-groups', methods=['POST'])
def create_logic_group():
    data = request.json
    session = Session()
    # Auto-set sort_order to max+1 so new groups appear at the end
    max_order = session.query(LogicGroup).order_by(LogicGroup.sort_order.desc()).first()
    next_order = (max_order.sort_order + 1) if max_order else 0
    group = LogicGroup(name=data['name'], description=data.get('description', ''), color=data.get('color', '#6366f1'), sort_order=next_order)
    session.add(group)
    session.commit()
    result = {'id': group.id, 'name': group.name, 'description': group.description, 'color': group.color, 'sort_order': group.sort_order, 'created_at': group.created_at.isoformat()}
    session.close()
    return jsonify(result), 201

@app.route('/api/logic-groups/reorder', methods=['PUT'])
def reorder_logic_groups():
    """Bulk update sort_order for all logic groups. Payload: [{id, sort_order}, ...]"""
    data = request.json
    if not isinstance(data, list):
        return jsonify({'error': 'Expected array of {id, sort_order}'}), 400
    session = Session()
    try:
        for item in data:
            group = session.query(LogicGroup).get(item['id'])
            if group:
                group.sort_order = item['sort_order']
        session.commit()
        # Return updated list ordered by sort_order
        groups = session.query(LogicGroup).order_by(LogicGroup.sort_order.asc()).all()
        result = [{'id': g.id, 'name': g.name, 'description': g.description, 'color': g.color, 'sort_order': g.sort_order, 'created_at': g.created_at.isoformat()} for g in groups]
        session.close()
        return jsonify(result)
    except Exception as e:
        session.rollback()
        session.close()
        return jsonify({'error': str(e)}), 500

@app.route('/api/logic-groups/<int:id>', methods=['PUT'])
def update_logic_group(id):
    data = request.json
    session = Session()
    group = session.query(LogicGroup).get(id)
    if group:
        group.name = data['name']
        group.description = data.get('description', group.description)
        group.color = data.get('color', group.color)
        session.commit()
        result = {'id': group.id, 'name': group.name, 'description': group.description, 'color': group.color, 'sort_order': group.sort_order, 'created_at': group.created_at.isoformat()}
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/logic-groups/<int:id>', methods=['DELETE'])
def delete_logic_group(id):
    session = Session()
    group = session.query(LogicGroup).get(id)
    if group:
        session.delete(group)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Custom Fields ---
@app.route('/api/custom-fields', methods=['GET'])
def get_custom_fields():
    session = Session()
    fields = session.query(CustomField).all()
    result = [{'id': f.id, 'name': f.name, 'field_type': f.field_type, 'created_at': f.created_at.isoformat()} for f in fields]
    session.close()
    return jsonify(result)

@app.route('/api/custom-fields', methods=['POST'])
def create_custom_field():
    data = request.json
    session = Session()
    field = CustomField(name=data['name'], field_type=data.get('field_type', 'text'))
    session.add(field)
    session.commit()
    result = {'id': field.id, 'name': field.name, 'field_type': field.field_type, 'created_at': field.created_at.isoformat()}
    session.close()
    return jsonify(result), 201

@app.route('/api/custom-fields/<int:id>', methods=['PUT'])
def update_custom_field(id):
    data = request.json
    session = Session()
    field = session.query(CustomField).get(id)
    if field:
        field.name = data['name']
        field.field_type = data.get('field_type', field.field_type)
        session.commit()
        result = {'id': field.id, 'name': field.name, 'field_type': field.field_type, 'created_at': field.created_at.isoformat()}
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/custom-fields/<int:id>', methods=['DELETE'])
def delete_custom_field(id):
    session = Session()
    field = session.query(CustomField).get(id)
    if field:
        session.delete(field)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Stocks ---
@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    session = Session()
    stocks = session.query(Stock).all()
    result = []
    for s in stocks:
        field_values = {fv.custom_field_id: fv.value for fv in s.field_values}
        result.append({
            'id': s.id,
            'code': s.code,
            'name': s.name,
            'sector': s.sector,
            'current_price': s.current_price,
            'notes': s.notes,
            'logic_group_id': s.logic_group_id,
            'logic_group': {'id': s.logic_group.id, 'name': s.logic_group.name, 'color': s.logic_group.color} if s.logic_group else None,
            'field_values': field_values,
            'created_at': s.created_at.isoformat()
        })
    session.close()
    return jsonify(result)

@app.route('/api/stocks', methods=['POST'])
def create_stock():
    data = request.json
    session = Session()
    stock = Stock(
        code=data.get('code', ''),
        name=data['name'],
        sector=data.get('sector'),
        current_price=data.get('current_price'),
        notes=data.get('notes'),
        logic_group_id=data.get('logic_group_id')
    )
    session.add(stock)
    session.commit()
    
    # Add field values
    field_values = data.get('field_values', {})
    for field_id, value in field_values.items():
        fv = StockFieldValue(stock_id=stock.id, custom_field_id=int(field_id), value=value)
        session.add(fv)
    session.commit()
    
    result = {
        'id': stock.id,
        'code': stock.code,
        'name': stock.name,
        'sector': stock.sector,
        'current_price': stock.current_price,
        'notes': stock.notes,
        'logic_group_id': stock.logic_group_id,
        'field_values': field_values,
        'created_at': stock.created_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/stocks/<int:id>', methods=['PUT'])
def update_stock(id):
    data = request.json
    session = Session()
    stock = session.query(Stock).get(id)
    if stock:
        stock.code = data.get('code', stock.code)
        stock.name = data.get('name', stock.name)
        stock.sector = data.get('sector', stock.sector)
        stock.current_price = data.get('current_price', stock.current_price)
        stock.notes = data.get('notes', stock.notes)
        stock.logic_group_id = data.get('logic_group_id', stock.logic_group_id)
        
        # Update field values
        field_values = data.get('field_values', {})
        for field_id, value in field_values.items():
            existing = session.query(StockFieldValue).filter_by(stock_id=id, custom_field_id=int(field_id)).first()
            if existing:
                existing.value = value
            else:
                fv = StockFieldValue(stock_id=id, custom_field_id=int(field_id), value=value)
                session.add(fv)
        
        session.commit()
        result = {
            'id': stock.id,
            'code': stock.code,
            'name': stock.name,
            'sector': stock.sector,
            'current_price': stock.current_price,
            'notes': stock.notes,
            'logic_group_id': stock.logic_group_id,
            'field_values': field_values,
            'created_at': stock.created_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/stocks/<int:id>', methods=['DELETE'])
def delete_stock(id):
    session = Session()
    stock = session.query(Stock).get(id)
    if stock:
        session.delete(stock)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Trading Models ---
@app.route('/api/models', methods=['GET'])
def get_models():
    session = Session()
    models = session.query(TradingModel).order_by(TradingModel.updated_at.desc()).all()
    result = [{'id': m.id, 'name': m.name, 'description': m.description, 'drawing_data': m.drawing_data, 'created_at': m.created_at.isoformat(), 'updated_at': m.updated_at.isoformat()} for m in models]
    session.close()
    return jsonify(result)

@app.route('/api/models', methods=['POST'])
def create_model():
    data = request.json
    session = Session()
    model = TradingModel(
        name=data['name'],
        description=data.get('description', ''),
        drawing_data=data.get('drawing_data')
    )
    session.add(model)
    session.commit()
    result = {'id': model.id, 'name': model.name, 'description': model.description, 'drawing_data': model.drawing_data, 'created_at': model.created_at.isoformat(), 'updated_at': model.updated_at.isoformat()}
    session.close()
    return jsonify(result), 201

@app.route('/api/models/<int:id>', methods=['PUT'])
def update_model(id):
    data = request.json
    session = Session()
    model = session.query(TradingModel).get(id)
    if model:
        model.name = data.get('name', model.name)
        model.description = data.get('description', model.description)
        model.drawing_data = data.get('drawing_data', model.drawing_data)
        session.commit()
        result = {'id': model.id, 'name': model.name, 'description': model.description, 'drawing_data': model.drawing_data, 'created_at': model.created_at.isoformat(), 'updated_at': model.updated_at.isoformat()}
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/models/<int:id>', methods=['DELETE'])
def delete_model(id):
    session = Session()
    model = session.query(TradingModel).get(id)
    if model:
        session.delete(model)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/models/<int:id>/drawing', methods=['GET'])
def get_model_drawing(id):
    session = Session()
    model = session.query(TradingModel).get(id)
    if model:
        result = {'drawing_data': model.drawing_data}
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/models/<int:id>/drawing', methods=['POST'])
def save_model_drawing(id):
    data = request.json
    session = Session()
    model = session.query(TradingModel).get(id)
    if model:
        model.drawing_data = data.get('drawing_data')
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Market Entries ---
@app.route('/api/market-entries', methods=['GET'])
def get_market_entries():
    session = Session()
    entries = session.query(MarketEntry).order_by(MarketEntry.created_at.desc()).all()
    result = [{
        'id': e.id,
        'title': e.title,
        'content': e.content,
        'category': e.category,
        'tags': e.tags or [],
        'created_at': e.created_at.isoformat(),
        'updated_at': e.updated_at.isoformat()
    } for e in entries]
    session.close()
    return jsonify(result)

@app.route('/api/market-entries', methods=['POST'])
def create_market_entry():
    data = request.json
    session = Session()
    entry = MarketEntry(
        title=data.get('title', data.get('content', '')),
        content=data.get('content', ''),
        category=data.get('category', 'index'),
        tags=data.get('tags', [])
    )
    session.add(entry)
    session.commit()
    result = {
        'id': entry.id,
        'title': entry.title,
        'content': entry.content,
        'category': entry.category,
        'tags': entry.tags or [],
        'created_at': entry.created_at.isoformat(),
        'updated_at': entry.updated_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/market-entries/<int:id>', methods=['PUT'])
def update_market_entry(id):
    data = request.json
    session = Session()
    entry = session.query(MarketEntry).get(id)
    if entry:
        entry.title = data.get('title', entry.title)
        entry.content = data.get('content', entry.content)
        entry.category = data.get('category', entry.category)
        entry.tags = data.get('tags', entry.tags)
        session.commit()
        result = {
            'id': entry.id,
            'title': entry.title,
            'content': entry.content,
            'category': entry.category,
            'tags': entry.tags or [],
            'created_at': entry.created_at.isoformat(),
            'updated_at': entry.updated_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/market-entries/<int:id>', methods=['DELETE'])
def delete_market_entry(id):
    session = Session()
    entry = session.query(MarketEntry).get(id)
    if entry:
        session.delete(entry)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Risk Rules ---
@app.route('/api/risk-rules', methods=['GET'])
def get_risk_rules():
    session = Session()
    rules = session.query(RiskRule).all()
    result = {r.name: r.value for r in rules}
    # Add defaults for any missing rules
    defaults = {
        'max_position_percent': 20,
        'max_total_exposure': 80,
        'stop_loss_percent': 8,
        'max_drawdown': 15,
        'daily_loss_limit': 5,
    }
    for k, v in defaults.items():
        if k not in result:
            result[k] = v
    session.close()
    return jsonify(result)

@app.route('/api/risk-rules', methods=['POST'])
def save_risk_rules():
    data = request.json
    session = Session()
    for name, value in data.items():
        rule = session.query(RiskRule).filter_by(name=name).first()
        if rule:
            rule.value = value
        else:
            rule = RiskRule(name=name, value=value)
            session.add(rule)
    session.commit()
    result = {r.name: r.value for r in session.query(RiskRule).all()}
    session.close()
    return jsonify(result)

# --- Risk Positions ---
@app.route('/api/risk-positions', methods=['GET'])
def get_risk_positions():
    session = Session()
    positions = session.query(RiskPosition).all()
    result = [{
        'id': p.id,
        'symbol': p.symbol,
        'name': p.name,
        'price': p.price,
        'quantity': p.quantity,
        'cost': p.cost,
        'stop_loss': p.stop_loss,
        'notes': p.notes,
        'created_at': p.created_at.isoformat(),
        'updated_at': p.updated_at.isoformat()
    } for p in positions]
    session.close()
    return jsonify(result)

@app.route('/api/risk-positions', methods=['POST'])
def create_risk_position():
    data = request.json
    session = Session()
    position = RiskPosition(
        symbol=data.get('symbol', ''),
        name=data['name'],
        price=data.get('price', 0),
        quantity=data.get('quantity', 0),
        cost=data.get('cost', 0),
        stop_loss=data.get('stop_loss', 0),
        notes=data.get('notes', '')
    )
    session.add(position)
    session.commit()
    result = {
        'id': position.id,
        'symbol': position.symbol,
        'name': position.name,
        'price': position.price,
        'quantity': position.quantity,
        'cost': position.cost,
        'stop_loss': position.stop_loss,
        'notes': position.notes,
        'created_at': position.created_at.isoformat(),
        'updated_at': position.updated_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/risk-positions/<int:id>', methods=['PUT'])
def update_risk_position(id):
    data = request.json
    session = Session()
    position = session.query(RiskPosition).get(id)
    if position:
        position.symbol = data.get('symbol', position.symbol)
        position.name = data.get('name', position.name)
        position.price = data.get('price', position.price)
        position.quantity = data.get('quantity', position.quantity)
        position.cost = data.get('cost', position.cost)
        position.stop_loss = data.get('stop_loss', position.stop_loss)
        position.notes = data.get('notes', position.notes)
        session.commit()
        result = {
            'id': position.id,
            'symbol': position.symbol,
            'name': position.name,
            'price': position.price,
            'quantity': position.quantity,
            'cost': position.cost,
            'stop_loss': position.stop_loss,
            'notes': position.notes,
            'created_at': position.created_at.isoformat(),
            'updated_at': position.updated_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/risk-positions/<int:id>', methods=['DELETE'])
def delete_risk_position(id):
    session = Session()
    position = session.query(RiskPosition).get(id)
    if position:
        session.delete(position)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Risk Alerts ---
@app.route('/api/risk-alerts', methods=['GET'])
def get_risk_alerts():
    session = Session()
    alerts = session.query(RiskAlert).order_by(RiskAlert.created_at.desc()).limit(50).all()
    result = [{
        'id': a.id,
        'type': a.alert_type,
        'message': a.message,
        'is_read': bool(a.is_read),
        'created_at': a.created_at.isoformat()
    } for a in alerts]
    session.close()
    return jsonify(result)

@app.route('/api/risk-alerts', methods=['POST'])
def create_risk_alert():
    data = request.json
    session = Session()
    alert = RiskAlert(
        alert_type=data.get('type', 'warning'),
        message=data['message']
    )
    session.add(alert)
    session.commit()
    result = {
        'id': alert.id,
        'type': alert.alert_type,
        'message': alert.message,
        'is_read': bool(alert.is_read),
        'created_at': alert.created_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/risk-alerts/<int:id>', methods=['PUT'])
def update_risk_alert(id):
    data = request.json
    session = Session()
    alert = session.query(RiskAlert).get(id)
    if alert:
        alert.is_read = 1 if data.get('is_read', True) else 0
        session.commit()
        result = {
            'id': alert.id,
            'type': alert.alert_type,
            'message': alert.message,
            'is_read': bool(alert.is_read),
            'created_at': alert.created_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/risk-alerts/<int:id>', methods=['DELETE'])
def delete_risk_alert(id):
    session = Session()
    alert = session.query(RiskAlert).get(id)
    if alert:
        session.delete(alert)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Trading Reviews (simplified free-form) ---
@app.route('/api/trading-reviews', methods=['GET'])
def get_trading_reviews():
    session = Session()
    reviews = session.query(TradingReview).order_by(TradingReview.created_at.desc()).all()
    result = [{
        'id': r.id,
        'content': r.content,
        'created_at': r.created_at.isoformat()
    } for r in reviews]
    session.close()
    return jsonify(result)

@app.route('/api/trading-reviews', methods=['POST'])
def create_trading_review():
    data = request.json
    session = Session()
    review = TradingReview(content=data['content'])
    session.add(review)
    session.commit()
    result = {
        'id': review.id,
        'content': review.content,
        'created_at': review.created_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/trading-reviews/<int:id>', methods=['DELETE'])
def delete_trading_review(id):
    session = Session()
    review = session.query(TradingReview).get(id)
    if review:
        session.delete(review)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Decisions ---
@app.route('/api/decisions', methods=['GET'])
def get_decisions():
    session = Session()
    decisions = session.query(Decision).order_by(Decision.created_at.desc()).all()
    result = [{
        'id': d.id,
        'stock_name': d.stock_name,
        'decision': d.decision,
        'max_risk': d.max_risk,
        'buy_price': d.buy_price,
        'stop_loss': d.stop_loss,
        'position_period': d.position_period,
        'created_at': d.created_at.isoformat()
    } for d in decisions]
    session.close()
    return jsonify(result)

@app.route('/api/decisions', methods=['POST'])
def create_decision():
    data = request.json
    session = Session()
    decision = Decision(
        stock_name=data['stock_name'],
        decision=data['decision'],
        max_risk=data.get('max_risk', 0),
        buy_price=data.get('buy_price', 0),
        stop_loss=data.get('stop_loss', 0),
        position_period=data.get('position_period', '')
    )
    session.add(decision)
    session.commit()
    result = {
        'id': decision.id,
        'stock_name': decision.stock_name,
        'decision': decision.decision,
        'max_risk': decision.max_risk,
        'buy_price': decision.buy_price,
        'stop_loss': decision.stop_loss,
        'position_period': decision.position_period,
        'created_at': decision.created_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/decisions/<int:id>', methods=['DELETE'])
def delete_decision(id):
    session = Session()
    decision = session.query(Decision).get(id)
    if decision:
        session.delete(decision)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

# --- Market Records ---
@app.route('/api/market-records', methods=['GET'])
def get_market_records():
    session = Session()
    stock_id = request.args.get('stock_id', type=int)
    query = session.query(MarketRecord)
    if stock_id:
        query = query.filter_by(stock_id=stock_id)
    records = query.order_by(MarketRecord.date.desc()).all()
    result = [{
        'id': r.id,
        'stock_id': r.stock_id,
        'date': r.date,
        'data': r.data or {},
        'created_at': r.created_at.isoformat()
    } for r in records]
    session.close()
    return jsonify(result)

@app.route('/api/market-records', methods=['POST'])
def create_market_record():
    data = request.json
    session = Session()
    record = MarketRecord(
        stock_id=data.get('stock_id'),
        date=data.get('date', datetime.now().strftime('%Y-%m-%d')),
        data=data.get('data', {})
    )
    session.add(record)
    session.commit()
    result = {
        'id': record.id,
        'stock_id': record.stock_id,
        'date': record.date,
        'data': record.data or {},
        'created_at': record.created_at.isoformat()
    }
    session.close()
    return jsonify(result), 201

@app.route('/api/market-records/<int:id>', methods=['PUT'])
def update_market_record(id):
    data = request.json
    session = Session()
    record = session.query(MarketRecord).get(id)
    if record:
        record.date = data.get('date', record.date)
        record.data = data.get('data', record.data)
        record.stock_id = data.get('stock_id', record.stock_id)
        session.commit()
        result = {
            'id': record.id,
            'stock_id': record.stock_id,
            'date': record.date,
            'data': record.data or {},
            'created_at': record.created_at.isoformat()
        }
        session.close()
        return jsonify(result)
    session.close()
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/market-records/<int:id>', methods=['DELETE'])
def delete_market_record(id):
    session = Session()
    record = session.query(MarketRecord).get(id)
    if record:
        session.delete(record)
        session.commit()
        session.close()
        return jsonify({'success': True})
    session.close()
    return jsonify({'error': 'Not found'}), 404

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5649)
