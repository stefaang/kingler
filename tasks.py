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
    # show the bomb explosion
    for racer in spectators:
        socketio.emit('bomb exploded', data, room=racer.name)

    # update scores ... do this here on in Bomb.explode?
    for victim in victims:
        if victim.color == bomb.team:
            app.logger.debug('set victim %s score', victim.name)
            if victim.score == None:
                victim.score = 0
            victim.score -= 1
            victim.save()
        else:
            if bomb.owner:
                bomb.owner.score += 1
                bomb.owner.save()
                app.logger.debug('set owner %s score to %s', bomb.owner.name, bomb.owner.score)

    # show new scores to spectators
    if victims:
        app.logger.debug('calculate new scores')
        data = {'individual': {}, 'team' : {}}
        for racer in spectators:
            data['individual'][racer.name] = racer.score
            if racer.color not in data['team']:
                data['team'][racer.color] = sum(r.score for r in spectators if r.color == racer.color)

            for racer in spectators:
                socketio.emit('new score', data, room=racer.name)
    else:
        app.logger.debug('no score changes')