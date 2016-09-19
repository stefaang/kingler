import datetime

from application import app, db


class Walker(db.Document):
    name = db.StringField(max_length=20)
    color = db.StringField(max_length=8)
    pos = db.PointField()
    ingedients = db.ListField(db.ReferenceField(Ingredient))
    pets = db.ListField(db.ReferenceField(Pet))

class Ingredient(db.ReferenceDocument):
    name = db.StringField(max_lenght=20)
    spawned = db.DateTimeField(default=datetime.datetime.now)
    expired = db.DateTimeField()
    maxstack = db.DecimalField()
    pos = db.PointField()

class Pet(db.ReferenceDocument):
    name = db.StringField(max_length=20)
    type = db.StringField()

class PetSpawner(db.Document):
    name = db.StringField(max_length=20)

class Backpack(db.Document):
    size = db.IntField()
