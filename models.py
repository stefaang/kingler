from app import db, app
from datetime import datetime

GLOBAL_VISION = 1000

ALLIED_RANGE = GLOBAL_VISION
ENEMY_RANGE = 200
RACER_DEATH_DURATION = 20

BOMB_ALLY_VISION = GLOBAL_VISION
BOMB_ENEMY_VISION = 20
BOMB_EXPIRE_TIME = 15 # to be 180
BOMB_TRIGGER_TIME = 3
BOMB_TRIGGER_RANGE = 10
BOMB_EXPLOSION_RANGE = 20

FLAG_PICKUP_RANGE = 5
FLAG_VISION_RANGE = GLOBAL_VISION


ICONMAP = {
    'green': 'leaf',
    'blue': 'anchor',
    'yellow': 'bolt',
    'red': 'fire'
}


class MapEntity(db.Document):
    pos = db.PointField()
    meta = {'allow_inheritance': True}
    date_created = db.DateTimeField

    def __init__(self, **kwargs):
        super(MapEntity, self).__init__(**kwargs)
        self.date_created = datetime.now()


class HoldableEntity(MapEntity):
    meta = {'allow_inheritance': True}

    state = db.StringField(default='home', choices=('home', 'carried', 'dropped'))
    carrier = db.ReferenceField(MapEntity, default=None)


class Racer(MapEntity):
    '''Main player class'''

    # creation params
    name = db.StringField(required=True, max_length=32)
    color = db.StringField(default='black', max_length=16)
    icon = db.StringField(default='bug', max_length=16)

    # tracking params
    date_lastseen = db.DateTimeField
    is_online = db.BooleanField(default=False)  # currently unused
    nearby = db.ListField(db.ReferenceField('Racer'))       # tracks nearby Racers
    nearbystatic = db.ListField(db.ReferenceField(MapEntity))

    # stats
    viewrange = db.IntField(default=300)
    score = db.IntField(default=0)
    is_alive = db.BooleanField(default=True)
    deathduration = db.IntField(default=RACER_DEATH_DURATION)

    has_hands_free = db.BooleanField(default=True)
    carried_item = db.ReferenceField(HoldableEntity)

    def clean(self):
        self.date_lastseen = datetime.now()
        super(Racer, self).clean()

    def setnearby(self, other):
        # this can be a one liner + a lot more atomic
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
        del self.nearbystatic[:]

    def get_info(self):
        lng, lat = self.pos['coordinates']
        return {'name': self.name, 'lat': lat, 'lng': lng,
                'icon':ICONMAP[self.color], 'color': self.color}

    def get_nearby_racers(self):
        ''' Returns info about self and a list with all nearby allied and enemy Racers
        Each Racer is represented by a dict with the following keys
        - a known Racer in range: name, lat, lng
        - a new Racer entering the range: name, lat, lng, icon, color
        - a known Racer leaving the range: name
        '''
        racers = []

        # get the nearby same team Racers within range
        allies = Racer.objects(pos__near=self.pos,
                               pos__max_distance=ALLIED_RANGE,
                               color=self.color,
                               id__ne=self.id)[:100]

        for r in allies:
            lng, lat = r.pos['coordinates']
            #app.logger.debug("Put ally %s at pos: %s", r.name, r.pos)
            d = {'name': r.name, 'lat': lat, 'lng': lng}
            if self.setnearby(r):
                # if we have nearby changes, add extra info as the client doesn't know who it is
                d.update({'icon': ICONMAP[r.color], 'color': r.color})
            racers.append(d)

        # get the nearby Racers of the other teams within range of 200 m
        enemies = Racer.objects(pos__near=self.pos,
                                pos__max_distance=ENEMY_RANGE,
                                color__ne=self.color)[:100]  # not equals operator
        for r in enemies:
            lng, lat = r.pos['coordinates']
            #app.logger.debug("Put enemy %s at pos: %s", r.name, r.pos)
            d = {'name': r.name, 'lat': lat, 'lng': lng}
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
        '''Get new bombs in the vision range of the Racer
        Enemy bombs can only be seen from close range, but ally bombs can be seen from far away.
        '''
        bombs = []

        abombs = Bomb.objects(pos__near=self.pos,
                              pos__max_distance=BOMB_ALLY_VISION,
                              team=self.color,
                              active=True)[:100]

        ebombs = Bomb.objects(pos__near=self.pos,
                              pos__max_distance=BOMB_ENEMY_VISION,
                              team__ne=self.color,
                              active=True)[:100]

        # update the list of known bombs for this racer
        for b in set(abombs) | set(ebombs):
            if b not in self.nearbystatic:
                self.modify(push__nearbystatic=b)
                bombs.append(b)
                app.logger.debug('IGOTBOMBS: %s', len([b for b in self.nearbystatic if isinstance(b, Bomb)]))

        return bombs

    def get_nearby_flags(self):
        flags = []

        fquery = Flag.objects(pos__near=self.pos,
                              pos__max_distance=FLAG_VISION_RANGE)[:100]

        for f in fquery:
            if f not in self.nearbystatic:
                self.modify(push__nearbystatic=f)
                flags.append(f)
        return flags


    def handle_flags(self):
        events = []
        # MAKE THIS A TASK AAAAH
        """Pickup enemy flag if not carrying one and return own team flags to base"""
        fquery = Flag.objects(pos__near=self.pos,
                             pos__max_distance=FLAG_PICKUP_RANGE,
                             state__ne='carried')

        for flag in fquery:
            if flag.team == self.color:
                if flag.state == 'dropped':
                    app.logger.info('%s returned the %s flag!!', self.name, flag.team)
                    flag.return_to_base()
                    lng, lat = flag.pos['coordinates']
                    events.append({'type': 'flag returned', 'name': self.name, 'target': str(flag.id),
                                   'lat': lat, 'lng': lng})
                elif flag.state == 'home':
                    if not self.has_hands_free and isinstance(self.carried_item, Flag):
                        # score points... somehow
                        app.logger.info('%s scores 5 points for TEAM %s!!', self.name, self.color)
                        stolen_flag = self.carried_item
                        stolen_flag.return_to_base()
                        self.modify(has_hands_free=True, carried_item=None)
                        lng, lat = stolen_flag.base['coordinates']
                        events.append({'type': 'flag scored', 'name': self.name, 'target':str(stolen_flag.id),
                                       'lat': lat, 'lng': lng})
            else:
                # don't pickup flags that are already carried
                if self.has_hands_free and self.is_alive:
                    app.logger.info('%s grabbed the %s flag!!', self.name, flag.team)
                    # atomic update
                    flag.modify({'state__ne':'carried'}, state='carried', carrier=self)
                    self.modify(has_hands_free=False, carried_item=flag.reload())
                    events.append({'type': 'flag grabbed', 'name': self.name, 'target': str(flag.id)})
        return events


    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Bomb(MapEntity):
    """ Work like land mines """
    color = db.StringField(default='black')
    team = db.StringField(required=True)

    trigger_range = db.IntField(default=BOMB_TRIGGER_RANGE)
    explosion_range = db.IntField(default=BOMB_EXPLOSION_RANGE)
    expire_time = db.IntField(default=BOMB_EXPIRE_TIME)
    trigger_time = db.IntField(default=BOMB_TRIGGER_TIME)
    date_exploded = db.DateTimeField
    active = db.BooleanField(default=True)

    owner = db.ReferenceField(Racer)

    meta = {'allow_inheritance': True}

    def __init__(self, **kwargs):
        if 'owner' in kwargs and isinstance(kwargs['owner'], basestring):
            kwargs['owner'] = Racer.objects.get(id=kwargs['owner'])
        self.date_created = datetime.now()
        super(Bomb, self).__init__(**kwargs)

    def get_info(self):
        if isinstance(self.pos, tuple):
            lng, lat = self.pos
        else:
            lng, lat = self.pos['coordinates']
        return {'lat': lat, 'lng': lng, 'team': self.team, 'id': str(self.id)}

    def get_nearby_racers(self):
        allies = Racer.objects(pos__near=self.pos,
                               pos__max_distance=BOMB_ALLY_VISION,
                               color=self.team)[:100]
        enemies = Racer.objects(pos__near=self.pos,
                                pos__max_distance=BOMB_ENEMY_VISION,
                                color__ne=self.team)[:100]
        return [r.name for r in allies], [r.name for r in enemies]

    def explode(self):
        if not self.active:
            return None
        #app.logger.debug('bomb explodes!')
        """Detonates the bomb and returns a dict with the effects"""
        d = {}
        # get a list of players that see the explosion
        d['spectators'] = Racer.objects(pos__near=self.pos,
                                   pos__max_distance=BOMB_ALLY_VISION)[:100]
        # if you stand too close you get hurt..
        # TODO: extend
        d['victims'] = Racer.objects(pos__near=self.pos,
                                pos__max_distance=self.explosion_range)[:100]
        # start a chain reaction of explosions
        d['nearbybombs'] = Bomb.objects(
            pos__near=self.pos,
            pos__max_distance=self.explosion_range,
            id__ne=self.id,
            active=True)[:100]
        app.logger.debug('bomb explodes! - %s others nearby', len(d['nearbybombs']))
        d['explosionrange'] = self.explosion_range
        self.active = False
        self.date_exploded = datetime.now()
        self.save()
        return d


class Flag(HoldableEntity):
    # inherits PointField pos, StringField state and MapEntity carrier

    # creation params
    base = db.PointField()
    team = db.StringField(default='black')
    icon = db.StringField(default='flag')

    def __init__(self, **kwargs):
        super(Flag, self).__init__(**kwargs)
        self.base = self.pos
        if not self.base:
            app.logger.warning('Flag needs a base position')

    def drop_on_ground(self, pos):
        return self.modify(pos=pos, state='dropped', carrier=None)

    def return_to_base(self):
        return self.modify(pos=self.base, state='home', carrier=None)

    def pickup(self, racer):
        # not used
        return self.modify({'state__ne': 'carried'}, state='carried', carrier=racer)

    def get_info(self):
        lng, lat = self.pos['coordinates']
        return {'id': str(self.id), 'lat':lat, 'lng':lng, 'team':self.team, 'state':self.state}

    def __repr__(self):
        return '<id {} team {} pos {}>'.format(self.id, self.team, self.pos['coordinates'])


class Zone(db.Document):
    name = db.StringField()
    geom = db.PolygonField()

    def __init__(self, name, geom):
        self.name = name
        self.geom = geom

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
