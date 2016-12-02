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

    explosion = bomb.explode()
    if explosion is None:
        # this bomb already exploded earlier (due to chain reaction)
        return
    spectators = explosion['spectators']
    victims = explosion['victims']

    for b in explosion['nearbybombs']:
        do_bomb_explode.delay(str(b.id))

    data = bomb.get_info()
    data['range'] = explosion['explosionrange']
    # show the bomb explosion
    for racer in explosion['spectators']:
        socketio.emit('bomb exploded', data, room=racer.name)

    # update scores and alive setting... do this here on in Bomb.explode?
    for victim in explosion['victims']:
        if victim.color == bomb.team:
            app.logger.debug('set victim %s score', victim.name)
            victim.modify(dec__score=1)
        else:
            if bomb.owner:
                if not victim.has_hands_free:
                    bomb.owner.modify(inc__score=2)     # increase score by 2
                    app.logger.debug('set owner %s score to %s, he killed a flag carrier', bomb.owner.name, bomb.owner.score)
                else:
                    bomb.owner.modify(inc__score=1)  # increase score by 1
                    app.logger.debug('set owner %s score to %s', bomb.owner.name, bomb.owner.score)

        # the victims are dead for a while
        victim.modify(is_alive=False)
        if not victim.has_hands_free:
            flag = victim.carried_item
            flag.drop_on_ground(victim.pos)
            app.logger.info('%s dropped the %s flag!!', victim.name, flag.team)
            victim.modify(has_hands_free=True, carried_item=None)
            data = {'name': victim.name, 'target': str(flag.id)}
            for racer in spectators:
                socketio.emit('flag dropped', data, room=racer.name)

        # but they will revive
        revive_racer.apply_async((str(victim.id),), countdown=victim.deathduration)

    # show new scores to spectators
    # TODO: put this in a separate task.. update_scores around pos
    if victims:
        spectators = [r.reload() for r in spectators]  # load the new scores
        update_scores(spectators)
    else:
        app.logger.debug('no score changes')


@celery.task
def adjust_score(racerid, points):
    Racer.get(id=racerid).update_one(inc__score=points)


@celery.task
def revive_racer(racerid):
    Racer.objects(id=racerid, is_alive=False).update_one(is_alive=True)

# tasks that do not require celery (yet)

def update_scores(racers):
    app.logger.debug('calculate new scores')
    data = {'individual': {}, 'team': {}}
    for racer in racers:
        data['individual'][racer.name] = racer.score

        # this can be done client side..
        if racer.color not in data['team']:
            data['team'][racer.color] = sum(r.score for r in racers if r.color == racer.color)

    for racer in racers:
        socketio.emit('new score', data, room=racer.name)
