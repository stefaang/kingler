from app import db, app, socketio
from celery import Celery

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

@celery.task
def do_bomb_explode(bomb):
    """making a bomb explode can be planned in advance"""
    pass