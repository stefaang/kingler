from app import db, app
from datetime import datetime

ALLIED_BOMB_RANGE = 1000
ENEMY_BOMB_RANGE = 60

ICONMAP = {
    'green': 'leaf',
    'blue': 'anchor',
    'yellow': 'bolt',
    'red': 'fire'
}

# import geoalchemy2

class Person(db.Document):
    name = db.StringField()

    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Racer(db.Document):
    '''Main player class'''

    # creation params
    name = db.StringField(required=True)
    color = db.StringField(default='black')
    icon = db.StringField(default='bug')
    date_created = db.DateTimeField

    # tracking params
    date_lastseen = db.DateTimeField
    pos = db.PointField()
    is_online = db.BooleanField(default=False)  # currently unused
    nearby = db.ListField(db.ReferenceField('Racer'))       # tracks nearby Racers
    nearbybombs = db.ListField(db.ReferenceField('Bomb'))   # tracks nearby Bombs
    # stats
    viewrange = db.IntField(default=300)

    def __init__(self, **kwargs):
        self.date_created = datetime.now()
        super(Racer, self).__init__(**kwargs)

    def clean(self):
        self.date_lastseen = datetime.now()
        super(Racer, self).clean()

    def setnearby(self, other):
        if other not in self.nearby:
            self.nearby.append(other)
            self.save()
        if self not in other.nearby:
            other.nearby.append(self)
            other.save()
            return True
        return False

    def unsetnearby(self, other):
        if other in self.nearby:
            self.nearby.remove(other)
            self.save()
        if self in other.nearby:
            other.nearby.remove(self)
            other.save()
            return True
        return False

    def clearNearby(self):
        for other in self.nearby[:]:
            self.unsetnearby(other)

    def get_info(self):
        lat, lng = self.pos['coordinates']
        return {'name': self.name, 'lat': lat, 'lng': lng,
                'icon':ICONMAP[self.color], 'color': self.color}

    def get_nearby_racers(self):
        ''' Returns info about self and a list with all nearby allied and enemy Racers
        Each Racer is represented by a dict with the following keys
        - a known Racer in range: name, lat, lng
        - a new Racer entering the range: name, lat, lng, icon, color
        - a known Racer leaving the range: name
        '''
        ALLIED_RANGE = 1000     # this could be a Racer property, but will require changes to setnearby
        ENEMY_RANGE = 200
        racers = []

        # get the nearby same team Racers within range
        allies = Racer.objects(pos__near=self.pos,
                               pos__max_distance=ALLIED_RANGE,
                               color=self.color,
                               name__ne=self.name)[:100]

        for r in allies:
            posx, posy = r.pos['coordinates']
            #app.logger.debug("Put ally %s at pos: %s", r.name, r.pos)
            d = {'name': r.name, 'lat': posx, 'lng': posy}
            if self.setnearby(r):
                # if we have nearby changes, add extra info as the client doesn't know who it is
                d.update({'icon': ICONMAP[r.color], 'color': r.color})
            racers.append(d)

        # get the nearby Racers of the other teams within range of 200 m
        enemies = Racer.objects(pos__near=self.pos,
                                pos__max_distance=ENEMY_RANGE,
                                color__ne=self.color)[:100]  # not equals operator
        for r in enemies:
            posx, posy = r.pos['coordinates']
            #app.logger.debug("Put enemy %s at pos: %s", r.name, r.pos)
            d = {'name': r.name, 'lat': posx, 'lng': posy}
            # if the nearby list changes, add extra info
            if self.setnearby(r):
                d.update({'icon': ICONMAP[r.color], 'color': r.color})
            racers.append(d)

        # sanitize those who are outofrange
        #app.logger.debug('OUT OF RANGE check: %s vs %s', self.nearby, set(set(allies) | set(enemies)))
        for r in set(self.nearby) - set(set(allies) | set(enemies)):
            self.unsetnearby(r)
            # name only means that the client can drop this
            racers.append({'name': r.name})
        self.save()
        #app.logger.debug('getnearbyracers presents: %s', racers)
        return racers

    def get_new_bombs(self):
        bombs = []
        def bombinfo(b):
            lat, lng = b.pos['coordinates']
            return {'lat': lat, 'lng': lng, 'team': b.team, 'id': b.id}

        abombs = Bomb.objects(pos__near=self.pos,
                              pos__max_distance=ALLIED_BOMB_RANGE,
                              team=self.color)[:100]

        ebombs = Bomb.objects(pos__near=self.pos,
                              pos__max_distance=ENEMY_BOMB_RANGE,
                              team__ne=self.color)[:100]

        for b in set(abombs) | set(ebombs):
            if b not in self.nearbybombs:
                self.nearbybombs.append(b)
                bombs.append(bombinfo(b))
        self.save()
        return bombs

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Position(db.Document):
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


class Bomb(db.Document):

    pos = db.PointField()
    color = db.StringField(default='black')
    team = db.StringField(required=True)

    range = db.IntField(default=200)
    date_created = db.DateTimeField
    date_detonated = db.DateTimeField
    active = db.BooleanField(default=True)

    owner = db.ReferenceField(Racer)

    meta = {'allow_inheritance': True}

    def __init__(self, **kwargs):
        self.date_created = datetime.now()
        super(Bomb, self).__init__(**kwargs)

    def get_nearby_racers(self):
        allies = Racer.objects(pos__near=self.pos,
                               pos__max_distance=ALLIED_BOMB_RANGE,
                               color=self.team)[:100]
        enemies = Racer.objects(pos__near=self.pos,
                                pos__max_distance=ENEMY_BOMB_RANGE,
                                color__ne=self.team)[:100]
        racers = [r.name for r in list(allies)+list(enemies)]
        return racers

    def detonate(self):
        """Detonates the bomb and returns a dict with the effects"""
        pass



class Zone(db.Document):
    name = db.StringField()
    geom = db.PolygonField()

    def __init__(self, name, geom):
        self.name = name
        self.geom = geom

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)
