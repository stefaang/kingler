from app import db
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
