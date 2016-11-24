import os
import json
import time
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_mongoengine import MongoEngine

#from shapely import wkt
from flask_socketio import SocketIO, send, emit, join_room, leave_room, rooms

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
db = MongoEngine(app)

socketio = SocketIO(app, message_queue=app.config['REDIS_URL'])

# now import the models and tasks
from models import *
from tasks import *



@socketio.on('connect')
def handle_connect():
    app.logger.info('New connection received: %s', session['username'])
    # register the handler
    join_room(str(session['username']))
    app.logger.info('New conn rooms: %s', rooms())

@socketio.on('disconnect')
def handle_disconnect():
    app.logger.info('Disconnecting %s ...', session['username'])
    leave_room(str(session['username']))

@socketio.on('move marker')
def handle_movemarker(data):
    """
    - update the new marker position in db
    - notify all markers in range of this change [both for old range and new range]
    """
    timestamp = time.time()
    app.logger.info('received move marker: %s', data)
    # broadcast the new position to everybody?? room??
    #emit('marker moved', data, broadcast=True)

    # get the marker name and the new position from the json data
    d = data
    name = d.get('name')
    lng, lat = float(d.get('lng', 0)), float(d.get('lat', 0))

    # OPTIONAL: check if session user is allowed to move this marker!
    # get the moving racer marker and update its position
    movedracer = Racer.objects(name=name).first()
    movedracer.pos = {"type": "Point", "coordinates": [lng,lat]}
    movedracer.save()

    # app.logger.debug('get nearby racers')
    racers = movedracer.get_nearby_racers()
    mr = movedracer.get_info()
    # app.logger.debug('get nearby racers others: %s', racers)
    # update the others' view
    for racer in racers:
        if len(racer) == 3:
            # app.logger.debug('Move marker... %s', racer)
            emit('marker moved', mr, room=racer['name'])
            emit('marker moved', racer, room=mr['name'])
        elif len(racer) == 5:
            # app.logger.debug('Add marker... %s', racer)
            emit('marker added', mr, room=racer['name'])
            emit('marker added', racer, room=mr['name'])
        elif len(racer) == 1:
            # app.logger.debug('Remove marker... %s', racer)
            emit('marker removed', mr, room=racer['name'])
            emit('marker removed', racer, room=mr['name'])

    bombs = movedracer.get_new_bombs()
    for bomb in bombs:
        emit('bomb added', bomb, room=mr['name'])

    duration = time.time() - timestamp
    app.logger.debug('move marker saved in %s ms', 1000*duration)
    # return "OK"

@socketio.on('add bomb')
def handle_addbomb(data):
    app.logger.debug('add bomb received')
    d = json.loads(data)
    lng, lat = float(d.get('lng', 0)), float(d.get('lat', 0))
    # add the bomb to the db
    color = session['racer']['color']
    bomb = Bomb(pos=(lng,lat), team=color)
    bomb.save()
    # alert nearby people
    racers = bomb.get_nearby_racers()
    for racer in racers:
        d.update( {'team': color, 'id': str(bomb.id)})
        emit('bomb added', d, room=racer)
    # create a task to explode in 10 seconds
    do_bomb_explode.apply_async((str(bomb.id),), countdown=5)
    # TODO: different bombtypes

# room support
@socketio.on('join')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    send('%s has entered the room.' % username, room=room)

@socketio.on('leave')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    send('%s has left the room.' % username, room=room)


@app.route('/')
def index():
    return render_template('index.html', session=session)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':

        if not request.form['username']:
            return render_template('login.html', error='You must fill in a Username')
        if not request.form['username'].isalnum():
            return render_template('login.html', error='Only use letters and numbers in your Username')
        username = session['username'] = escape(request.form['username'])
        color = session['color'] = request.form['color']

        if username == 'clearallbombsPLX':
            bombs = Bomb.objects()
            for b in bombs:
                b.delete()
            return redirect(url_for('logout'))

        r = Racer.objects(name=username).first()
        if not r:
            # add a new Racer to the db
            r = Racer(name=username, pos=[50, 3.7], color=color)
        else:
            # update the color attribute to the db
            r.color = color
        r.save()
        # keep track of the racer object in this session
        session['racer'] = r
        return redirect(url_for('show_map'))
    return render_template('login.html', error='')

@app.route('/logout')
def logout():
    # remove the username from the session if it's there
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/map')
def show_map():
    if 'username' in session:
        racers = []
        try:
            # get the main Racer.. you need to be logged in
            session['racer'] = Racer.objects(name=session['username']).first()
            mainracer = session['racer']
            mainracer.clearNearby()   # in case it was not done on logout
            app.logger.info('loaded %s, of type %s', mainracer, type(mainracer))
            racers = mainracer.get_nearby_racers()
            myself = mainracer.get_info()
            racers = [myself] + racers
            app.logger.info('loading... %s', racers)
        except Exception, e:
            # message to dev
            app.logger.error("Failed to show map: %s" % repr(e))
            # message to user
            return "Failed to show map"

        # prepare dict object
        data = {'racers':racers, 'username':session['username']}
        return render_template('map.html', flaskData=data)
    else:
        return 'You are not logged in'

#TODO: make a proper REST api /resource/id/action
@app.route('/moveracer', methods=['GET','POST'])
def move_racer():
    # DEPRECATED
    """Moves a Racer in the persistent database"""
    if request.method == 'POST':
        errors = []
        # TODO clean this
        name, lat, lng = request.get_data().split()
        try:
            #r = Racer('yolo', 'POINT(%s %s)' % (lng, lat))
            r = Racer.objects(name=name).first()
            r.pos = (float(lng), float(lat))
            r.save()
            return "OK"
        except Exception, e:
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
    except Exception, e:
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
        except Exception, e:
            app.logger.exception("Failed to add position: %s", repr(e))
            return "Failed to add position"
    else:
        return "Soz bro"


@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    socketio.run()
