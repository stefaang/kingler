import time
from flask import g, session, current_app
from flask_socketio import send, emit, join_room, leave_room, rooms
from .models import Racer
from .app import db, socketio, celery
from .utils import getlnglat

from .tasks.workers import *


def push_model(model):
    """Push the model to all connected Socket.IO clients."""
    socketio.emit('updated_model', {'class': model.__class__.__name__,
                                    'model': model.to_dict()})


@socketio.on('connect')
def handle_connect():
    if 'username' in session:
        current_app.logger.info('New connection received: %s', session['username'])
        # register the handler
        join_room(str(session['username']))
        r = Racer.objects(name=session['username']).first()
        if r:
            r.modify(is_online=True)
    else:
        current_app.logger.warning('New connection but no username in session')
    current_app.logger.info('New conn rooms: %s', rooms())
    return 'OK'


@socketio.on('disconnect')
def handle_disconnect():
    if session.get('username'):
        current_app.logger.info('Disconnecting %s ...', session['username'])
        leave_room(str(session['username']))
        r = Racer.objects(name=session['username']).first()
        if r:
            current_app.logger.info('Broadcat %s disconnect', r.name)
            r.modify(is_online=False)
    else:
        current_app.logger.warning('Disconnecting but no username in session')
    return 'OK'


@socketio.on('vue derp event')
def handle_vue_connect():
    current_app.logger.info('New VUE connection')


@socketio.on('move marker')
def handle_movemarker(data: dict):
    """
    - update the new marker position in db
    - notify all markers in range of this change [both for old range and new range]
    - update bombs
    - update flags: pickup or return
    """
    timestamp = time.perf_counter()
    current_app.logger.info('received move marker: %s', data)

    # TODO: check if session user is allowed to move this marker!

    # update the position and do perform all related tasks
    update_racer_pos(data)

    # finalize by checking how long all this took
    duration = time.perf_counter() - timestamp
    current_app.logger.debug('move marker saved in %s ms', 1000*duration)
    # return "OK"


@socketio.on('add bomb')
def handle_addbomb(data: dict):
    # todo: let the server decide when to send updates (ex a task every second?)
    current_app.logger.debug('add bomb received')

    lng, lat = getlnglat(data)
    # add the bomb to the db
    color = session['racer']['color']
    bomb = Bomb(pos=(lng, lat), team=color, owner=session['racerid'])
    if 'range' in data:
        bomb.explosion_range = int(data['range'])
    bomb.save()
    # alert nearby people
    allies, enemies = bomb.get_nearby_racers()
    for racer in allies + enemies:
        data.update({'team': color, 'id': str(bomb.id)})
        emit('bomb added', data, room=racer)
    # create a task to explode in 10 seconds
    # TODO: different bombtypes
    # currently supported: throw bomb and mine (todo: split this)
    do_bomb_explode.current_app.y_async((str(bomb.id),), countdown=10)


@socketio.on('add flag')
def handle_addflag(data: dict):
    """The client requests to add a flag
     :param: data : dict with the following keys:
       team
       lat
       lng
    """
    current_app.logger.debug('add flag received')
    lng, lat = getlnglat(data)
    team = data.get('team')
    # don't allow flag within 50 m of an existing flag
    nearbyflags = Flag.objects(pos__near=(lng, lat),
                               pos__max_distance=50)
    if not nearbyflags:
        flag = Flag(pos=(lng, lat), team=team).save()
        current_app.logger.info('added flag: %s', flag)
    else:
        current_app.logger.warn('add flag request denied: too close to existing flag')


@socketio.on('add coin')
def handle_addcoin(data: dict):
    """The client requests to add a coin
     :param: data : dict with the following keys:
       lat
       lng
    """
    current_app.logger.debug('add coin received')
    lng, lat = getlnglat(data)
    nearbycoins = Flag.objects(pos__near=(lng, lat),
                               pos__max_distance=50)
    if not nearbycoins:
        coin = CopperCoin(pos=(lng, lat)).save()
        current_app.logger.info('added coin: %s', coin)
    else:
        nearbycoins.delete()


@socketio.on('add beast stop')
def handle_add_beast_stop(data: dict):
    from math import cos, sqrt, radians

    def distance(aa, bb):
        lon1, lat1 = (radians(degree) for degree in aa)
        lon2, lat2 = (radians(degree) for degree in bb)
        R = 6371008  # radius of the earth in m
        x = (lon2 - lon1) * cos(0.5 * (lat2 + lat1))
        y = lat2 - lat1
        return R * sqrt(x * x + y * y)

    SPD = 10
    current_app.logger.debug('add beast stop received')
    if 'lng' not in data or 'lat' not in data:
        current_app.logger.warn('Failed to add beast stop: lat/lng not found in data')
        return
    lng, lat = getlnglat(data)
    beast = Beast.objects.get(pk=data['id'])
    if [lng, lat] not in beast.track['coordinates']:
        current_app.logger.info('add a point to track')
        track = beast.track['coordinates']
        a, b = track[-1], [lng, lat]
        d = distance(a, b)
        current_app.logger.debug('mind the gap of %sm', d)
        # add points to the track every 10m between a and b
        while d > SPD:
            s = SPD / d
            a = (a[0] + s*(b[0]-a[0]), a[1] + s*(b[1]-a[1]))
            track.current_app.nd(a)
            d = distance(a, b)
        current_app.logger.info('final track length: %s', len(track))
        beast.track = track
    else:
        current_app.logger.info('delete first point!!')
        beast.track = beast.track['coordinates'][1:]
    beast.save()


@socketio.on('get scores')
def handle_get_scores():
    if session.get('username'):
        current_app.logger.info('Get scores for %s', session['username'])
        racers = Racer.objects()    # add party
        update_scores(racers)


@socketio.on('post secret')
def handle_post_secret(data):
    current_app.logger.info('post secret %s', data)
    if not 'coin_id' in data or not 'racer_id' in data:
        return
    coin = CopperCoin.objects(pk=data.get('coin_id')).first()
    racer = Racer.objects(pk=data['racer_id']).first()

    if racer and coin and coin.secret == data['secret'].lower():
        emit('secret correct')
        racer.modify(inc__score=200)
        spectators = Racer.objects(pos__near=racer.pos,
                                   pos__max_distance=GLOBAL_RANGE)
        update_scores(spectators)


# room support
@socketio.on('join')
def on_join(data):
    """Activated when a user joins a room"""
    username = data['username']
    room = data['room']
    # join another room with the username
    join_room(room)
    send('%s has entered the room.' % username, room=room)


@socketio.on('leave')
def on_leave(data):
    """Activated when a user leaves a room"""
    username = data['username']
    room = data['room']
    leave_room(room)
    send('%s has left the room.' % username, room=room)
