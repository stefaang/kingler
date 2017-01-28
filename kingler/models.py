# -*- coding: utf-8 -*-
"""
    kingler.models
    ~~~~~~~~~~~~~~

    The MongoDB models are defined here

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

import logging
import sys
from datetime import datetime as dt

#from mongoengine import signals


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

logger = logging.getLogger(__name__)

# in the application context, the db is already defined by flask_mongoengine
if 'db' in globals():
    logger.info('Database connection in application context')
# outside of the application, use mongoengine right away
else:
    import mongoengine
    logger.info('Connecting to database outside of application context')
    mongoengine.connect('kingler')
    db = mongoengine

ICONMAP = {
    'green': 'leaf',
    'blue': 'anchor',
    'yellow': 'bolt',
    'red': 'fire'
}

class Cell(db.Document):
    # use this to divide players in global cells
    pos = db.PointField()
    name = db.StringField()


class MapEntity(db.Document):
    #: the position of the entity on the map
    pos = db.PointField()
    #: the date the entity was added to the database
    date_created = db.DateTimeField(default=dt.now)
    #: the team the entity belongs to (could change)
    team = db.StringField(default='black')
    #: is this entity visible to its own team only
    teamview_only = db.BooleanField(default=False)

    meta = {'allow_inheritance': True}

    def __repr__(self):
        """compact formatter"""
        return '<{} {}>'.format(self._cls, str(self.id), )

    def __str__(self):
        """longer string representation"""
        return '<{} {} at {}>'.format(self._cls, str(self.id), self.pos.get('coordinates') if self.pos else None)


class HoldableEntity(MapEntity):
    meta = {'allow_inheritance': True}

    state = db.StringField(default='home', choices=('home', 'carried', 'dropped'))
    carrier = db.ReferenceField(MapEntity, default=None)


class Racer(MapEntity):
    """Main player class"""

    # creation params
    name = db.StringField(required=True, max_length=32)
    color = db.StringField(default='black', max_length=16)
    icon = db.StringField(default='bug', max_length=16)
    teamview_only = db.BooleanField(default=True)


    party = db.StringField()

    # tracking params
    date_lastseen = db.DateTimeField
    is_online = db.BooleanField(default=False)              # currently unused
    nearby = db.ListField(db.ReferenceField('MapEntity'))   # track nearby Racers, Bombs, ...

    # stats
    viewrange = db.IntField(default=300)
    score = db.IntField(default=0)
    is_alive = db.BooleanField(default=True)
    deathduration = db.IntField(default=RACER_DEATH_DURATION)

    has_hands_free = db.BooleanField(default=True)
    carried_item = db.ReferenceField(HoldableEntity)

    # @classmethod
    # def pre_save(cls, sender, document, **kwargs):
    #     logger.debug("Pre Save: %s" % document.name)
    #     logger.debug("Updated - %s", document._delta())

    def clearNearby(self):
        self.modify(nearby=list())

    def get_info(self):
        lng, lat = self.pos['coordinates']
        return {'name': self.name, 'lat': lat, 'lng': lng,
                'icon':ICONMAP[self.color], 'color': self.color}

    def get_nearby_stuff(self, info_only=True):
        oldnb = self.nearby
        # get nearby allies and let them know we are nearby
        allies = Racer.objects(pos__near=self.pos,
                               pos__max_distance=ALLIED_RANGE,
                               team=self.team,
                               is_online=True,
                               id__ne=self.id)
        res = allies.update(add_to_set__nearby=self)

        # get the nearby Racers of the other teams within short range and let them know we are here
        enemies = Racer.objects(pos__near=self.pos,
                                pos__max_distance=ENEMY_RANGE,
                                is_online=True,
                                color__ne=self.color)

        enemies.update(add_to_set__nearby=self)

        allystuff = MapEntity.objects(pos__near=self.pos,
                                      pos__max_distance=ALLIED_RANGE,
                                      team=self.team,
                                      id__ne=self.id,
                                      _cls__ne='MapEntity.Racer')   # ugh

        # and the rest that shows up on global view
        otherstuff = MapEntity.objects(pos__near=self.pos,
                                       pos__max_distance=ALLIED_RANGE,
                                       team__ne=self.team,
                                       teamview_only=False,
                                      _cls__ne='MapEntity.Racer')

        # this will be the new nearby list
        newnearby = list(set(list(allies)+list(enemies)+list(allystuff)+list(otherstuff)))
        # purge the out of range items
        for item in self.nearby:
            if item not in newnearby:
                if hasattr(item, 'nearby'):
                    # remove self from the items nearby list
                    item.modify(pull__nearby=self)

        # now finally update the nearby list
        self.nearby = newnearby
        self.date_lastseen = dt.now()
        self.save()

        return oldnb, self.nearby

    def handle_flags(self):
        """ Pickup enemy flags (dropped or in base), return dropped ally flags
        or score points when returning an enemy flag to base"""

        # TODO: MAKE THIS A TASK
        events = []
        """Pickup enemy flag if not carrying one and return own team flags to base"""
        nearbyflags = Flag.objects(pos__near=self.pos,
                             pos__max_distance=FLAG_PICKUP_RANGE,
                             state__ne='carried')

        for flag in nearbyflags:
            if flag.team == self.color:
                if flag.state == 'dropped':
                    logger.info('%s returned the %s flag!!', self.name, flag.team)
                    flag.return_to_base()
                    lng, lat = flag.pos['coordinates']
                    events.append({'type': 'flag returned', 'name': self.name, 'target': str(flag.id),
                                   'lat': lat, 'lng': lng})
                elif flag.state == 'home':
                    if not self.has_hands_free and isinstance(self.carried_item, Flag):
                        # score points... somehow
                        logger.info('%s scores 5 points for TEAM %s!!', self.name, self.color)
                        stolen_flag = self.carried_item
                        stolen_flag.return_to_base()
                        self.modify(has_hands_free=True, carried_item=None)
                        lng, lat = stolen_flag.base['coordinates']
                        events.append({'type': 'flag scored', 'name': self.name, 'target':str(stolen_flag.id),
                                       'lat': lat, 'lng': lng})
            else:
                # don't pickup flags that are already carried
                if self.has_hands_free and self.is_alive:
                    logger.info('%s grabbed the %s flag!!', self.name, flag.team)
                    # TODO: improve atomic update
                    flag.modify({'state__ne':'carried'}, state='carried', carrier=self)
                    self.modify(has_hands_free=False, carried_item=flag.reload())
                    events.append({'type': 'flag grabbed', 'name': self.name, 'target': str(flag.id)})
        return events

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)

#signals.pre_save.connect(Racer.pre_save, sender=Racer)


class Bomb(MapEntity):
    """ Work like land mines """
    color = db.StringField(default='black')
    team = db.StringField(required=True)
    teamview_only = db.BooleanField(default=True)

    trigger_range = db.IntField(default=BOMB_TRIGGER_RANGE)
    explosion_range = db.IntField(default=BOMB_EXPLOSION_RANGE)
    expire_time = db.IntField(default=BOMB_EXPIRE_TIME)
    trigger_time = db.IntField(default=BOMB_TRIGGER_TIME)
    date_exploded = db.DateTimeField
    is_active = db.BooleanField(default=True)

    owner = db.ReferenceField(Racer)

    meta = {'allow_inheritance': True}

    def __init__(self, **kwargs):
        if 'owner' in kwargs and isinstance(kwargs['owner'], basestring):
            kwargs['owner'] = Racer.objects.get(id=kwargs['owner'])
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
        if not self.is_active:
            return None
        #logger.debug('bomb explodes!')
        """Detonates the bomb and returns a dict with the effects"""
        d = {}
        # get a list of players that see the explosion
        d['spectators'] = Racer.objects(pos__near=self.pos,
                                   pos__max_distance=BOMB_ALLY_VISION)[:100]
        # if you stand too close you get hurt..
        # TODO: extend
        d['victims'] = Racer.objects(pos__near=self.pos,
                                    pos__max_distance=self.explosion_range,
                                     is_online=True)[:100]
        # start a chain reaction of explosions
        d['nearbybombs'] = Bomb.objects(
            pos__near=self.pos,
            pos__max_distance=self.explosion_range,
            id__ne=self.id,
            is_active=True)[:100]
        logger.debug('bomb explodes! - %s others nearby', len(d['nearbybombs']))
        d['explosionrange'] = self.explosion_range
        self.is_active = False
        self.date_exploded = dt.now()
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
            logger.warning('Flag needs a base position')

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


class CopperCoin(MapEntity):
    value = db.IntField()


class Zone(db.Document):
    name = db.StringField()
    geom = db.PolygonField()

    def __repr__(self):
        return '<id {} {}>'.format(self.id, self.name)


class Position(db.Document):
    name = db.StringField()
    pos = db.PointField()
    accuracy = db.IntField()
    time = db.DateTimeField(default=dt.now)

    def __repr__(self):
        return '<{} {} {} {}>'.format(self.time, self.name, self.pos, self.accuracy)
