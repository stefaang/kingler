import os
import json
from flask import Flask, session, redirect, url_for, escape, request, render_template
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import func
from geoalchemy2.shape import to_shape

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

from models import *






@app.route('/')
def index():
    if 'username' in session:
        return 'Logged in as %s' % escape(session['username'])
    return 'You are not logged in'

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        session['username'] = request.form['username']
        safename = escape(session['username'])
        session['racer'] = db.session.query(Racer).filter_by(name=safename.first()
        if not session['racer']:
            db.session.add(Racer(safename, 'POINT(0 0)'))
            db.session.commit()
        return redirect(url_for('index'))
    return '''
        <form action="" method="post">
            <p><input type=text name=username>
            <p><input type=submit value=Login>
        </form>
    '''

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
            pos = to_shape(r.pos)
            racers.append({'name':r.name, 'x':pos.x, 'y': pos.y})
        return render_template('map.html', racers=racers, user=escape(session['username']))
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
            r = s.query(Racer.name, ).filter_by(name=name).first()
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



@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    app.run()
