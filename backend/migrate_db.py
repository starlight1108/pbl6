"""
数据库迁移脚本：为 Order 表添加线上交易字段，创建 Transaction 表
"""
import os
import sys

# 确保能找到 app 模块
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import Order, Transaction
from sqlalchemy import inspect, text

app = create_app(os.getenv('FLASK_ENV') or 'default')

with app.app_context():
    inspector = inspect(db.engine)

    # 1. 检查 orders 表缺少哪些列
    orders_columns = [c['name'] for c in inspector.get_columns('orders')]
    print(f"orders 表现有列: {orders_columns}")

    new_columns = {
        'transaction_type': "ALTER TABLE orders ADD COLUMN transaction_type VARCHAR(20) DEFAULT 'offline'",
        'payment_method': 'ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50)',
        'paid_at': 'ALTER TABLE orders ADD COLUMN paid_at DATETIME',
        'delivery_method': 'ALTER TABLE orders ADD COLUMN delivery_method VARCHAR(50)',
        'auto_complete_at': 'ALTER TABLE orders ADD COLUMN auto_complete_at DATETIME',
        'tracking_number': 'ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(200)',
    }

    for col_name, sql in new_columns.items():
        if col_name not in orders_columns:
            print(f"添加列: {col_name}")
            db.session.execute(text(sql))
        else:
            print(f"列已存在: {col_name}")

    # 2. 创建 transactions 表（如果不存在）
    if not inspector.has_table('transactions'):
        print("创建 transactions 表...")
        Transaction.__table__.create(db.engine)
        print("transactions 表已创建")
    else:
        print("transactions 表已存在")

    db.session.commit()
    print("✅ 数据库迁移完成")
