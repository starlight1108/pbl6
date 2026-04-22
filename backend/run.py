from dotenv import load_dotenv
load_dotenv()


from app import create_app, db
import os

app = create_app(os.getenv('FLASK_ENV') or 'default')


@app.cli.command('init-db')
def init_db():
    with app.app_context():
        db.create_all()
    print('Database initialized.')


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
