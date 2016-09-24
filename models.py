from app import db


class Person(db.Model):
    __tablename__ = 'persons'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String())
    #pos = db.Column(db.)

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)

