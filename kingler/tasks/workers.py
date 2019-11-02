from .. import celery as celery_app
from ..app import socketio
from flask_socketio import SocketIO
from celery.utils.log import get_task_logger
#from flask_security.utils import config_value, send_mail
#from kingler.bp.users.models.user_models import User
from ..models import Bomb, Racer, Flag, Beast, CopperCoin, \
    GLOBAL_RANGE, PICKUP_RANGE, BEAST_EAT_RANGE, VISION_RANGE
#from kingler.extensions import mail # this is the flask-mail

# thanks Bob Jordan in https://stackoverflow.com/questions/16221295/python-flask-with-celery-out-of-application-context

logger = get_task_logger(__name__)


#@celery_app.task
def do_bomb_explode(bombid):
    logger.debug('bomb %s is exploding', bombid)
    """task to explode a bomb can be planned in advance"""
    bomb = Bomb.objects.get(id=bombid)

    if not bomb.is_active:
        # this bomb already exploded earlier (due to chain reaction)
        return None

    explosion = bomb.explode()
    if explosion is None:
        # this scenario is very unlikely as we just checked if it already blew
        return
    spectators = explosion['spectators']
    victims = explosion['victims']

    for b in explosion['nearbybombs']:
        do_bomb_explode.delay(str(b.id))

    data = bomb.get_info()
    data['range'] = explosion['explosionrange']    
    #socketio = SocketIO(message_queue='redis://')
    # show the bomb explosion
    for racer in explosion['spectators']:
        socketio.emit('bomb exploded', data, room=racer.name)

    # update scores and alive setting... do this here on in Bomb.explode?
    for victim in explosion['victims']:
        if victim.color == bomb.team:
            logger.debug('set victim %s score', victim.name)
            victim.modify(dec__score=1)
        else:
            if bomb.owner:
                if not victim.has_hands_free:
                    bomb.owner.modify(inc__score=2)     # increase score by 2
                    logger.debug('%s\'bomb killed a flag carrier, new score %s', bomb.owner.name, bomb.owner.score)
                else:
                    bomb.owner.modify(inc__score=1)  # increase score by 1
                    logger.debug('%s\'bomb killed a Racer, new score %s', bomb.owner.name, bomb.owner.score)

        # the victims are dead for a while, dropping their items (flag)
        victim.modify(is_alive=False)
        if not victim.has_hands_free:
            flag = victim.carried_item
            flag.drop_on_ground(victim.pos)
            logger.info('%s dropped the %s flag!!', victim.name, flag.team)
            victim.modify(has_hands_free=True, carried_item=None)
            data = {'name': victim.name, 'target': str(flag.id)}
            for racer in spectators:
                socketio.emit('flag dropped', data, room=racer.name)

        # but they will revive
        revive_racer.apply_async((str(victim.id),), countdown=victim.deathduration)

    # show new scores to spectators
    # TODO: put this in a separate task.. update_scores around pos
    if victims:
        update_scores(spectators)
    else:
        logger.debug('no score changes')


def adjust_score(racerid, points):
    Racer.objects.get(id=racerid).modify(inc__score=points)


def revive_racer(racerid):
    Racer.objects.get(id=racerid, is_alive=False).modify(is_alive=True)


########################
# tasks that do not require celery (yet)
# TODO: create independent game loop, move logic to client (or make async)
def update_racer_pos(data: dict):
    """Update Racer position
    Update the vision of the Racer and everybody who sees him
    Trigger nearby bombs, traps, flags, etc..
    :param data: dict with a racer name, lng and lat value
    """
    emit = socketio.emit

    # parse the json data
    name = data.get('name')
    lng, lat = float(data.get('lng', 0)), float(data.get('lat', 0))
    if lng == lat == 0:
        logger.warning('Warp %s to ground zero', name)

    # lookup the moved racer and update its position
    movedracer = Racer.objects(name=name).first()
    movedracer.modify(pos={"type": "Point", "coordinates": [lng, lat]})

    movedracer = movedracer.reload()

    # get all the new nearby stuff for the new position
    before, after = movedracer.get_nearby_stuff()   # todo: move nearby stuff to cache memory?
    #logger.info('NearbyStuff went from %s to %s', before, after)
    mr = movedracer.get_info()

    # A. Communication to both nearby Racers and the Moving Racer
    # A.1 Create markers for the new racers in range
    racers = (o.get_info() for o in set(after) - set(before) if isinstance(o, Racer))
    for racer in racers:
        emit('marker added', mr, room=racer['name'])
        emit('marker added', racer, room=mr['name'])

    # A.2 Move the position of known racers in range
    racers = (o.get_info() for o in set(after) | set(before) if isinstance(o, Racer))
    for racer in racers:
        emit('marker moved', mr, room=racer['name'])
        emit('marker moved', racer, room=mr['name'])

    # A.3 Remove the racers who are out of range
    racers = (o.get_info() for o in set(before) - set(after) if isinstance(o, Racer))
    for racer in racers:
        emit('marker removed', mr, room=racer['name'])
        emit('marker removed', racer, room=mr['name'])

    # A.4
    beasts = (o.get_info() for o in set(after) - set(before) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker added', beast, room=mr['name'])

    # A.5 Move the position of known racers in range
    beasts = (o.get_info() for o in set(after) | set(before) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker moved', beast, room=mr['name'])

    # A.6 Remove the beasts who are out of range
    beasts = (o.get_info() for o in set(before) - set(after) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker removed', beast, room=mr['name'])

    # B. Show new bombs (we don't remove bombs.. they disappear after explosion) TODO: but do they see the explosion??
    # bombs = (o for o in set(after) - set(before) if isinstance(o, Bomb))
    # for bomb in bombs:
    #     emit('bomb added', bomb.get_info(), room=mr['name'])
    #     # trigger enemy bombs
    #     if bomb.team != movedracer.color:
    #         do_bomb_explode.apply_async((str(bomb.id),), countdown=bomb.trigger_time)

    # C. Show new flags (we don't remove flags)
    # flags = (o for o in set(after) - set(before) if isinstance(o, Flag))
    # for flag in flags:
    #     emit('flag added', flag.get_info(), room=mr['name'])
    #     # trigger enemy bombs
    #
    # # C.2 Interact with existing flags
    # events = movedracer.handle_flags()
    #
    # # get nearby racers
    spectators = Racer.objects(pos__near=movedracer.pos,
                               pos__max_distance=GLOBAL_RANGE )
    team_spectators = [s for s in spectators if s.team == movedracer.team]
    # for event in events:
    #     eventtype = event['type']
    #     # let them update their flags (TODO: broadcast in cell)
    #     logger.info('WUP, i have to send %s', event)
    #     for racer in spectators:
    #         emit(eventtype, event, room=racer['name'])
    #
    #     # adjust scores if necessary
    #     if eventtype == 'flag scored':
    #         movedracer.modify(inc__score=5) # TODO: check for more atoms
    #         update_scores(spectators)

    # D. Show new coins
    coins = (o for o in set(after) - set(before) if isinstance(o, CopperCoin) and o.team != movedracer.color)
    for coin in coins:
        # logger.info('%s coin, %s racer' % (coin.team, movedracer.color))
        lng, lat = coin.pos['coordinates']
        emit('coin added', coin.get_info(), room=mr['name'])

    # D.2 Pickup nearby coins, set the team
    coins = CopperCoin.objects(pos__near=movedracer.pos,
                               pos__max_distance=PICKUP_RANGE,
                               team__ne=movedracer.color)
    for coin in coins:
        logger.info('racer %s picks up a %sp %s coin' % (movedracer.name, coin.value, coin.team))
        info = {'value': coin.value, 'id': str(coin.id), 'racer': str(movedracer.id)}
        if coin.secret:
            info.update({'secret': True})
        emit('coin pickup', info, room=mr['name'])

        for racer in team_spectators:
            emit('coin pickup', info, room=racer['name'])
        # change the team of the coin so that this team cannot pick it up now (TODO: improve)
        coin.modify(team=movedracer.color)
        # add the points
        movedracer.modify(inc__score=coin.value)

        logger.info('racer %s scores for coinssss', movedracer.name)
        update_scores(spectators)

    if movedracer.is_alive:
        # E. Touch beasts
        beasts = Beast.objects(pos__near=movedracer.pos,
                               pos__max_distance=BEAST_EAT_RANGE)
        if beasts:
            movedracer.modify(is_alive=False)
            revive_racer.apply_async((str(movedracer.id),), countdown=movedracer.deathduration)
        for beast in beasts:
            logger.info('racer %s hits up a %s beast' % (movedracer.name, beast.species))
            info = {'beast': str(beast.id), 'racer': str(movedracer.id)}
            emit('beast hit', info, room=mr['name'])
            # todo: warn others
            movedracer.modify(dec__score=50)
            update_scores(spectators)


def update_scores(racers):
    logger.info('calculate new scores for %s', racers)
    data = {'individual': {}, 'team': {}}
    for racer in racers:
        racer.reload('score')
        data['individual'][racer.name] = racer.score

        # this can be done client side..
        if racer.color not in data['team']:
            data['team'][racer.color] = sum(r.score for r in racers if r.color == racer.color)

    for racer in racers:
        socketio.emit('new score', data, room=racer.name)


def move_beasts():
    beasts = Beast.objects(active=True)
    for b in beasts:
        # unpack geojson linestring
        track = b.track['coordinates']
        oldpos = pos = b.pos['coordinates']
        if oldpos in track:
            i = track.index(pos)
            n = len(track)
            newpos = track[(i + 1) % n]
            logger.info('move %s to index %s at %s' % (b.name, (i+1)%n, newpos))
            b.modify(pos=newpos)
        else:
            logger.warn('Beast %s is off the track uggh', b.id)
            b.modify(pos=track[0])
            return

        # update the racers
        before = Racer.objects(pos__near=oldpos,
                               pos__max_distance=VISION_RANGE,
                               is_online=True)
        after = Racer.objects(pos__near=newpos,
                              pos__max_distance=VISION_RANGE,
                              is_online=True)

        # racers that have to add the beast
        racers = set(after) - set(before)
        for racer in racers:
            logger.info('hello racer %s, beast added %s', racer.name, b.get_info())
            socketio.emit('marker added', b.get_info(), room=racer.name)

        # racers that have to move the beast
        racers = set(after) | set(before)
        for racer in racers:
            logger.info('hello racer %s, beast moved %s', racer.name, b.get_info())
            socketio.emit('marker moved', b.get_info(), room=racer.name)

        # racers that have to remove the beast (out of range)
        racers = set(before) - set(after)
        for racer in racers:
            logger.info('hello racer %s, beast removed %s', racer.name, b.get_info())
            socketio.emit('marker removed', b.get_info(), room=racer.name)


@celery_app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(3.0, move_beasts.s(), name='move beasts every 3 seconds')
    # sender.add_periodic_task(4.0, move_racers.s(), name='move racers every 3 seconds')
