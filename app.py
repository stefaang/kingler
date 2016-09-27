import os
import json
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_sqlalchemy import SQLAlchemy

from geoalchemy2 import func, shape

from flask_sse import sse


app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# now import the models
from models import *

app.register_blueprint(sse, url_prefix='/stream')

class GeoBackend(object):
    pass


@app.route('/send')
def send_message():
    sse.publish({"message": "Hello!"}, type='greeting')
    return "Message sent!"

@app.route('/')
def index():
    return render_template('index.html', session=session)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        session['username'] = request.form['username']
        safename = escape(session['username'])
        r = db.session.query(Racer).filter_by(name=safename).first()
        if not r:
            r = Racer(safename, 'POINT(0 0)')
            db.session.add(r)
            db.session.commit()
            # session['racer'] = r
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
        # get points from db
        rquery = db.session.query(Racer)
        racers = []
        for r in rquery:
            pos = shape.to_shape(r.pos)
            racers.append({'name':r.name, 'x':pos.x, 'y': pos.y})
        return render_template('map.html', racers=racers, username=escape(session['username']))
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
            app.logger.info("addpos %s",data)
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



@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    app.run()
