from app import db
from datetime import datetime
#import geoalchemy2

class Person(db.Document):
    __tablename__ = 'persons'

    name = db.StringField()

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)

class Racer(db.Document):
    __tablename__ = 'racer'

    name = db.StringField()
    pos = db.PointField()
    color = db.StringField(default='orange')
    icon = db.StringField(default='bug')
    date_created = db.DateTimeField

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Position(db.Document):
    __tablename__ = 'position'

    name = db.StringField()
    pos = db.PointField()
    accuracy = db.IntField()
    time = db.DateTimeField()

    def __init__(self, name, pos, acc=0):
        self.name = name
        self.pos = pos
        self.time = datetime.now()
        self.accuracy = acc

    def __repr__(self):
        return '<{} {} {} {}>'.format(self.time, self.name, self.pos, self.accuracy)

class Zone(db.Document):
    __tablename__ = 'zone'

    name = db.StringField()
    geom = db.PolygonField()

    def __init__(self, name, geom):
        self.name = name
        self.geom = geom

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)
