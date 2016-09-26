import os
import json
from flask import Flask, render_template, request
from flask_sqlalchemy import SQLAlchemy
from geoalchemy2 import func
from shapely import wkb

app = Flask(__name__)
app.config.from_object(os.environ['APP_SETTINGS'])
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

from models import *


@app.route('/')
def hello():
    return "Hello World"

@app.route('/map')
def show_map():
    # get points from db
    rquery = db.session.query(Racer)
    racers = []  
    for r in rquery:
        pos = wkb.loads(bytes(r.pos.data))
        racers.append({'name':r.name, 'x':pos.x, 'y': pos.y})
    return render_template('map.html', racers=racers)

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



@app.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)


if __name__ == '__main__':
    app.run()
