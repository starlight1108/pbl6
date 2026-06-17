from app import create_app, db

app = create_app()
with app.app_context():
    from app.models import User
    
    from sqlalchemy import text
    
    try:
        db.session.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
        db.session.commit()
        print('Column is_admin added successfully')
    except Exception as e:
        print(f'Error adding column: {e}')
        db.session.rollback()