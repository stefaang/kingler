from app import db, app, socketio
from celery import Celery
from models import Bomb, Racer

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)

@celery.task
def do_bomb_explode(bombid):
    app.logger.debug('bomb %s is exploding', bombid)
    """task to explode a bomb can be planned in advance"""
    bomb = Bomb.objects(id=bombid).first()

    spectators, victims, exposionrange = bomb.explode()
    data = bomb.get_info()
    data['range'] = exposionrange
    for racer in spectators:
        socketio.emit('bomb exploded', data, room=racer)