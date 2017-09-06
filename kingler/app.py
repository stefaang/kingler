# -*- coding: utf-8 -*-
"""
    package.module
    ~~~~~~~~~~~~~~

    A brief description goes here.

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

import os
import json
import time
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_mongoengine import MongoEngine

#from shapely import wkt
from flask_socketio import SocketIO, send, emit, join_room, leave_room, rooms

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
db = MongoEngine()

socketio = SocketIO(app, message_queue=app.config['REDIS_URL'])
db.init_app(app)

# now import the models and tasks
from models import *
from tasks import *


########################
#
# SOCKETIO routes

@socketio.on('connect')
def handle_connect():
    if 'username' in session:
        app.logger.info('New connection received: %s', session['username'])
        # register the handler
        join_room(str(session['username']))
        r = Racer.objects(name=session['username']).first()
        if r:
            r.modify(is_online=True)
    else:
        app.logger.warning('New connection but no username in session')
    app.logger.info('New conn rooms: %s', rooms())
    return 'OK'


@socketio.on('disconnect')
def handle_disconnect():
    if session.get('username'):
        app.logger.info('Disconnecting %s ...', session['username'])
        leave_room(str(session['username']))
        r = Racer.objects(name=session['username']).first()
        if r:
            r.modify(is_online=False)
    else:
        app.logger.warning('Disconnecting but no username in session')
    return 'OK'


@socketio.on('vue derp event')
def handle_vue_connect():
    app.logger.info('New VUE connection')


@socketio.on('move marker')
def handle_movemarker(data):
    """
    - update the new marker position in db
    - notify all markers in range of this change [both for old range and new range]
    - update bombs
    - update flags: pickup or return
    """
    timestamp = time.time()
    app.logger.info('received move marker: %s', data)

    # TODO: check if session user is allowed to move this marker!

    # update the position and do perform all related tasks
    update_racer_pos(data)

    # finalize by checking how long all this took

    duration = time.time() - timestamp
    app.logger.debug('move marker saved in %s ms', 1000*duration)
    # return "OK"


@socketio.on('add bomb')
def handle_addbomb(data):
    # todo: let the server decide when to send updates (ex a task every second?)
    app.logger.debug('add bomb received')
    if not 'lng' in data or not 'lat' in data:
        app.logger.error('add bomb received without coordinates')
        return
    lng, lat = float(data['lng']), float(data['lat'])
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
    do_bomb_explode.apply_async((str(bomb.id),), countdown=10)


@socketio.on('add flag')
def handle_addflag(data):
    """The client requests to add a flag
     :param: data : dict with the following keys:
       team
       lat
       lng
    """
    app.logger.debug('add flag received')
    lng, lat = float(data.get('lng', 0)), float(data.get('lat', 0))
    team = data.get('team')
    # don't allow flag within 50 m of an existing flag
    nearbyflags = Flag.objects(pos__near=(lng, lat),
                               pos__max_distance=50)
    if not list(nearbyflags):
        flag = Flag(pos=(lng, lat), team=team).save()
        app.logger.info('added flag: %s', flag)
    else:
        app.logger.warn('add flag request denied: too close to existing flag')


@socketio.on('add coin')
def handle_addcoin(data):
    """The client requests to add a coin
     :param: data : dict with the following keys:
       lat
       lng
    """
    app.logger.debug('add coin received')
    lng, lat = float(data.get('lng', 0)), float(data.get('lat', 0))
    nearbycoins = Flag.objects(pos__near=(lng, lat),
                               pos__max_distance=50)
    if not nearbycoins:
        coin = CopperCoin(pos=(lng, lat)).save()
        app.logger.info('added coin: {}'.format(coin))
    else:
        n = nearbycoins.delete()
        app.logger.debug('deleted {} coins'.format(n))


@socketio.on('add beast stop')
def handle_add_beast_stop(data):
    from math import cos, sqrt, radians
    def distance(hier, daar):
        lon1, lat1 = (radians(degree) for degree in hier)
        lon2, lat2 = (radians(degree) for degree in daar)
        R = 6371008  # radius of the earth in m
        x = (lon2 - lon1) * cos(0.5 * (lat2 + lat1))
        y = lat2 - lat1
        return R * sqrt(x * x + y * y)


    SPD = 10
    app.logger.debug('add beast stop received')
    if 'lng' not in data or 'lat' not in data:
        app.logger.warn('Failed to add beast stop: lat/lng not found in data')
        return
    lng, lat = float(data.get('lng', 0)), float(data.get('lat', 0))
    beast = Beast.objects.get(pk=data['id'])
    if [lng, lat] not in beast.track['coordinates']:
        app.logger.info('add a point to track')
        track = beast.track['coordinates']
        hier = track[-1]
        daar = [lng, lat]
        d = distance(hier, daar)
        app.logger.debug('mind the gap of %sm', d)
        while d > SPD:
            a = SPD/d
            hier = [hier[0]+a*(daar[0]-hier[0]), hier[1]+a*(daar[1]-hier[1])]
            track.append(hier)
            d = distance(hier, daar)
        app.logger.info('final track lenght: %s', len(track))
        beast.track = track
    else:
        app.logger.info('delete first point!!')
        beast.track = beast.track['coordinates'][1:]
    beast.save()


@socketio.on('get scores')
def handle_get_scores():
    if session.get('username'):
        app.logger.info('Get scores for %s', session['username'])
        racers = Racer.objects()    # add party
        update_scores(racers)

@socketio.on('post secret')
def handle_post_secret(data):
    app.logger.info("post secret %s", data)
    if not 'coin_id' in data or not 'racer_id' in data:
        return
    coin = CopperCoin.objects(pk=data.get('coin_id')).first()
    racer = Racer.objects(pk=data['racer_id']).first()
    secret = data.get('secret')
    if racer and coin:
        if coin.secret == secret:
            app.logger.info("Secret correct: {}".format(secret))
            emit("secret correct")
            racer.modify(inc__score=200)
            spectators = Racer.objects(pos__near=racer.pos,
                                       pos__max_distance=GLOBAL_RANGE)
            update_scores(spectators)
        else:
            app.logger.info("Wrong secret: {}".format(secret))

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


###############################
#
#  FLASK routes
#

@app.route('/')
def index():
    return render_template('index.html', session=session)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if not request.form['username']:
            return render_template('login.html', error='You must fill in a Username')
        if not all(c.isalnum() or c.isspace() for c in request.form['username']):
            return render_template('login.html', error='Only use letters, numbers and spaces in your Username')
        username = session['username'] = escape(request.form['username'])
        color = session['color'] = request.form['color']

        if username.startswith('clearall'):
            if username.endswith('bombs'):
                Bomb.drop_collection()
            elif username.endswith('coins'):
                CopperCoin.drop_collection()
            elif username.endswith('flags'):
                Flag.drop_collection()
            return redirect(url_for('logout'))

        r = Racer.objects(name=username)
        if not r:
            # add a new Racer to the db
            r = Racer(name=username, pos=[3.7, 51], color=color)
        else:
            # update the color attribute to the db
            r = r.first()
            r.color = color
        r.is_online = True
        r.save()
        # keep track of the racer object in this session
        session['racerid'] = str(r.id)
        app.logger.debug('id is %s', session['racerid'])
        if session.get('newstyle'):
            return redirect(url_for('newstylemap'))
        else:
            return redirect(url_for('oldstylemap'))
    return render_template('login.html', error='')


@app.route('/logout')
def logout():
    # remove the username from the session if it's there
    session.pop('username', None)
    return redirect(url_for('index'))


@app.route('/mbmap')
def newstylemap():
    if 'username' in session:
        admin = False
        try:
            # get the main Racer.. you need to be logged in
            session['racer'] = Racer.objects(name=session['username']).first()
            mainracer = session['racer']
            mainracer.modify(is_online=True)
            mainracer.clearNearby()   # in case it was not done on logout
            app.logger.info('loaded %s, of type %s', mainracer, type(mainracer))
            _, stuff = mainracer.get_nearby_stuff()
            racers = [o.get_info() for o in stuff if isinstance(o, Racer)]
            flags = [o.get_info() for o in stuff if isinstance(o, Flag)]
            mainracer.clearNearby()  # clear again to load all the stuff that I didn't add here on the next move
            myself = mainracer.get_info()
            racers = [myself] + racers
            app.logger.info('loading... %s', racers)
        except Exception as e:
            # message to dev
            app.logger.error("Failed to show map: %s" % e)
            # message to user
            return "Failed to show map"

        # prepare dict object
        data = {'racers': racers, 'username': session['username'], 'flags': flags}
        if session['username'] == 'Stefaan':    # todo: set party admins
            app.logger.warn('admin logged in %s', session['username'])
            admin = True
        return render_template('mbmap.html', flaskData=data, admin=admin)
    else:
        session['newstyle'] = True
        return redirect(url_for('login'))

    # return render_template('mbmap.html', session=session)


@app.route('/map')
def oldstylemap():
    if 'username' in session:
        racers = []
        flags = []
        admin = False
        try:
            # get the main Racer.. you need to be logged in
            session['racer'] = Racer.objects(name=session['username']).first()
            mainracer = session['racer']
            mainracer.modify(is_online=True)
            mainracer.clearNearby()   # in case it was not done on logout
            app.logger.info('loaded %s, of type %s', mainracer, type(mainracer))
            _, stuff = mainracer.get_nearby_stuff()
            racers = [o.get_info() for o in stuff if isinstance(o, Racer)]
            flags = [o.get_info() for o in stuff if isinstance(o, Flag)]
            mainracer.clearNearby()  # clear again to load all the stuff that I didn't add here on the next move
            myself = mainracer.get_info()
            racers = [myself] + racers
            app.logger.info('loading... %s', racers)
        except Exception as e:
            # message to dev
            app.logger.error("Failed to show map: %s" % e)
            # message to user
            return "Failed to show map"

        data = {'racers': racers, 'username': session['username'], 'flags': flags}
        # detect admin access
        if session['username'] == 'Stefaan':  # todo: set party admins
            app.logger.warn('admin logged in %s', session['username'])
            admin = True
        return render_template('map.html', flaskData=data, admin=admin)
    else:
        session['newstyle'] = False
        return redirect(url_for('login'))


# TODO: make a proper REST api /resource/id/action
@app.route('/moveracer', methods=['GET', 'POST'])
def move_racer():
    # DEPRECATED
    """Moves a Racer in the persistent database"""
    if request.method == 'POST':
        errors = []
        # TODO clean this
        name, lat, lng = request.get_data().split()
        try:
            # r = Racer('yolo', 'POINT(%s %s)' % (lng, lat))
            r = Racer.objects(name=name).first()
            r.pos = (float(lng), float(lat))
            r.save()
            return "OK"
        except Exception as e:
            errors.append(e)
            app.logger.error("Failed to move racer: %s", repr(e))
            return "Failed to move marker"
    else:
        return "Post me some JSON plx"


@app.route('/addracer', methods=['POST'])
def add_racer():
    """ Post """
    data = json.loads(request.get_json())
    name = data['name']
    lat = data['lat']
    lng = data['lng']
    try:
        r = Racer(name=name, color='black')
        r.pos = (float(lng), float(lat))
        r.save()
        return "OK"
    except Exception as e:
        app.logger.error("Failed to add racer: %s", repr(e))
        return "Failed to add racer"


@app.route('/deleteracer', methods=['GET', 'POST'])
def del_racer():
    if request.method == 'POST':
        # TODO stub
        pass


@app.route('/addpos', methods=['GET', 'POST'])
def add_position():
    if request.method == 'POST' and 'username' in session:
        try:
            data = request.get_json(force=True)
            # data = json.dumps(request.get_data())
            # app.logger.info("addpos %s",data)
            name = session['username']
            lat = float(data['coords']['latitude'])
            lng = float(data['coords']['longitude'])
            acc = float(data['coords']['accuracy'])
            pos = Position(name, (lng, lat), acc)
            pos.save()
            app.logger.info("successfully added %s", pos)
            return "OK"
        except Exception as e:
            app.logger.exception("Failed to add position: %s", repr(e))
            return "Failed to add position"
    else:
        return "Soz bro"


@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    socketio.run()
