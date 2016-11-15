import os
import json
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_mongoengine import MongoEngine

#from shapely import wkt
from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
db = MongoEngine(app)

socketio = SocketIO(app, message_queue=app.config['REDIS_URL'])

# now import the models
from models import *

# broadcast any user movement to all other users
@socketio.on('move marker')
def handle_movemarker(json):
    app.logger.info('received move marker: '+ str(json))
    emit('marker moved', json, broadcast=True)

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

        r = Racer.objects(name=username).first()
        if not r:
            # add a new Racer to the db
            r = Racer(name=username, pos=[50, 3.7], color=color)
            # session['racer'] = r
        else:
            # update the color attribute to the db
            r.color = color
        r.save()
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
            # get the main Racer
            mainracer = Racer.objects(name=session['username']).first()

            # get the nearby same team Racers within range of 10 km
            rquery = Racer.objects(pos__near=mainracer.pos['coordinates'],
                                   pos__max_distance=10000,
                                   color=mainracer.color)[:1000]
            for r in rquery:
                posx, posy = r.pos['coordinates']
                app.logger.info("Put ally %s at pos: %s", r.name, r.pos)
                if r.name == session['username']:
                    color = session.get('color', 'black')
                    # TODO: convert to GeoJSON
                    racers.append({'name':r.name, 'lat':posx, 'lng': posy, 'icon': 'user-secret', 'color': color})
                else:
                    color = r.color
                    if not color: color = 'black'
                    racers.append({'name': r.name, 'lat': posx, 'lng': posy, 'icon': 'bug', 'color': color})

            # get the nearby Racers of the other teams within range of 300 m
            rquery = Racer.objects(pos__near=mainracer.pos['coordinates'],
                                   pos__max_distance=300,
                                   color__ne=mainracer.color)[:1000]     # not equals operator
            for r in rquery:
                posx, posy = r.pos['coordinates']
                app.logger.info("Put enemy %s at pos: %s", r.name, r.pos)
                color = r.color
                if not color: color = 'black'
                racers.append({'name': r.name, 'lat': posx, 'lng': posy, 'icon': 'bug', 'color': color})

            # get recent positions of main User
            # positions = (wkt.loads(pos) for pos, in Position.objects(name=session['username']))
            # pos in query is tuple with 1 element..
            # positions = [[pos['x'], pos['y']] for pos in positions]
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
    """Moves a Racer in the persistent database"""
    if request.method == 'POST':
        errors = []
        # TODO clean this
        name, lat, lng = request.get_data().split()
        try:
            #r = Racer('yolo', 'POINT(%s %s)' % (lat, lng))
            r = Racer.objects(name=name).first()
            r.pos = (float(lat), float(lng))
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
        r.pos = (float(lat), float(lng))
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
            pos = Position(name, (lat, lng), acc)
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
