from app import db, app
from datetime import datetime

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
    name = db.StringField()
    color = db.StringField(default='black')
    icon = db.StringField(default='bug')
    date_created = db.DateTimeField

    # tracking params
    date_lastseen = db.DateTimeField
    pos = db.PointField()
    is_online = db.BooleanField(default=False)  # currently unused
    nearby = db.ListField(db.ReferenceField('Racer'))
    # stats
    viewrange = db.IntField(default=300)

    def setnearby(self, other):
        if other not in self.nearby:
            self.nearby.append(other)
            self.save()
        if self not in other.nearby:
            other.nearby.append(self)
            other.save()
            return True
        else:
            return False

    def unsetnearby(self, other):
        if other in self.nearby:
            self.nearby.remove(other)
            self.save()
        if self in other.nearby:
            other.nearby.remove(self)
            other.save()
            return True
        else:
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
                               name__ne=self.name)[:1000]

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
                                color__ne=self.color)[:1000]  # not equals operator
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


class Zone(db.Document):
    name = db.StringField()
    geom = db.PolygonField()

    def __init__(self, name, geom):
        self.name = name
        self.geom = geom

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)
