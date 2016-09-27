from app import db
from datetime import datetime
import geoalchemy2

class Person(db.Model):
    __tablename__ = 'persons'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())
    #pos = db.Column(db.)

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)

class Racer(db.Model):
    __tablename__ = 'racer'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())
    pos = db.Column(geoalchemy2.Geometry('POINT'))

    def __init__(self, name, pos):
        self.name = name
        self.pos = pos

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Position(db.Model):
    __tablename__ = 'position'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())
    pos = db.Column(geoalchemy2.Geometry('POINT'))
    accuracy = db.Column(db.Integer)
    time = db.Column(db.DateTime)

    def __init__(self, name, pos, acc=0):
        self.name = name
        self.pos = pos
        self.time = datetime.now()
        self.accuracy = acc

    def __repr__(self):
        return '<{} {} {} {}>'.format(self.time, self.name, self.pos, self.accuracy)

class Zone(db.Model):
    __tablename__ = 'zone'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())
    geom = db.Column(geoalchemy2.Geometry('POINT'))

    def __init__(self, name, geom):
        self.name = name
        self.geom = geom

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)
