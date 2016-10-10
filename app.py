import os
import json
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_sqlalchemy import SQLAlchemy

from geoalchemy2 import func, shape

from flask_socketio import SocketIO, send, emit, join_room, leave_room

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

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

        r = db.session.query(Racer).filter_by(name=username).first()
        if not r:
            r = Racer(username, 'POINT(51 3.7)', color)
            db.session.add(r)
            db.session.commit()
            # session['racer'] = r
        else:
            r.color = color
            db.session.commit()
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
        # get Racers
        rquery = db.session.query(Racer)
        # todo: only show nearby Racers
        racers = []
        for r in rquery:
            pos = shape.to_shape(r.pos)
            if r.name == session['username']:
                color = session.get('color', 'black')
                racers.append({'name':r.name, 'lat':pos.x, 'lng': pos.y, 'icon': 'user-secret', 'color': color})
            else:
                # todo: add color from DB
                racers.append({'name': r.name, 'lat': pos.x, 'lng': pos.y, 'icon': 'bug', 'color': 'blue'})
        # get recent positions of main User
        positions = (shape.to_shape(pos) for pos, in db.session.query(Position.pos).filter_by(name=session['username']))
        # pos in query is tuple with 1 element..
        positions = [[pos.x, pos.y] for pos in positions]

        # prepare dict object
        data = {'positions':positions, 'racers':racers, 'username':session['username']}
        return render_template('map.html', flaskData=data)
    else:
        return 'You are not logged in'

@app.route('/moveit', methods=['GET','POST'])
def move_marker():
    if request.method == 'POST':
        errors = []
        # TODO clean this
        name, lat, lng = request.get_data().split()
        s = db.session
        try:
            #r = Racer('yolo', 'POINT(%s %s)' % (lat, lng))
            r = s.query(Racer).filter_by(name=name).first()
            r.pos = 'POINT(%s %s)' % (lat, lng)
            s.commit()
            return "OKOK"
        except Exception, e:
            errors.append(e)
            return "Fail awwww "+"\n"+e.message
    else:
        return "Post me some JSON plx"

@app.route('/addmarker', methods=['GET', 'POST'])
def add_marker():
    if request.method == 'POST':
        errors = []
        data = json.loads(request.get_json())
        name = data['name']
        lat = data['lat']
        lng = data['lng']
        try:
            r = Racer(name, 'POINT(%s %s)' % (lat, lng))
            db.session.add(r)
            db.session.commit()
            return "OKOK"
        except Exception, e:
            errors.append(e)
            return "Fail awwww "+e.message
    else:
        return "Post me some JSON plx"

@app.route('/deletemarker', methods=['GET', 'POST'])
def del_marker():
    if request.method == 'POST':
        pass
    # TODO fill up

@app.route('/addpos', methods=['GET', 'POST'])
def add_position():
    if request.method == 'POST' and 'username' in session:
        errors = []
        try:
            data = request.get_json(force=True)
            # data = json.dumps(request.get_data())
            # app.logger.info("addpos %s",data)
            name = session['username']
            lat = data['coords']['latitude']
            lng = data['coords']['longitude']
            acc = data['coords']['accuracy']
            pos = Position(name, 'POINT(%s %s)' % (lat, lng), acc)
            db.session.add(pos)
            db.session.commit()
            app.logger.info("successfully added %s", pos)
            return "OK"
        except Exception, e:
            errors.append(e)
            app.logger.exception("Failed to add position %s",e)
            return "Fail awwww "+e.message
    else:
        return "ehhh"

@app.route('/<name>/admin')
def show_admin_map(name):
    # get points from db
    rquery = db.session.query(Racer)
    racers = []
    for r in rquery:
        pos = shape.to_shape(r.pos)
        racers.append({'name': r.name, 'x': pos.x, 'y': pos.y})

    positions = (shape.to_shape(pos) for pos, in
                 db.session.query(Position.pos).filter_by(name=name))
    # pos in query is tuple with 1 element..
    positions = [[pos.x, pos.y] for pos in positions]
    # app.logger.info(json.dumps(positions))
    return render_template('admin.html',
                           racers=racers,
                           username=name,
                           positions=positions)


@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    app.run()
