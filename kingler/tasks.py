# -*- coding: utf-8 -*-
"""
    kingler.tasks
    ~~~~~~~~~~~~~~

    Tasks and routines, some of them using Celery, are defined here

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""
import time
import datetime
import random
from app import app, socketio
from celery import Celery
from models import *

celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
celery.conf.update(app.config)


@celery.task
def do_bomb_explode(bombid):
    app.logger.debug('bomb %s is exploding', bombid)
    """task to explode a bomb can be planned in advance"""
    bomb = Bomb.objects.get(id=bombid)

    if not bomb.is_active:
        # this bomb already exploded earlier (due to chain reaction)
        return None

    explosion = bomb.explode()
    if explosion is None:
        # this scenario is very unlikely as we just checked if it already blew
        return
    spectators = explosion['spectators']
    victims = explosion['victims']

    for b in explosion['nearbybombs']:
        do_bomb_explode.delay(str(b.id))

    data = bomb.get_info()
    data['range'] = explosion['explosionrange']
    # show the bomb explosion
    for racer in explosion['spectators']:
        socketio.emit('bomb exploded', data, room=racer.name)

    # update scores and alive setting... do this here on in Bomb.explode?
    for victim in explosion['victims']:
        if victim.color == bomb.team:
            app.logger.debug('set victim %s score', victim.name)
            victim.modify(dec__score=1)
        else:
            if bomb.owner:
                if not victim.has_hands_free:
                    bomb.owner.modify(inc__score=2)     # increase score by 2
                    app.logger.debug('%s\'bomb killed a flag carrier, new score %s', bomb.owner.name, bomb.owner.score)
                else:
                    bomb.owner.modify(inc__score=1)  # increase score by 1
                    app.logger.debug('%s\'bomb killed a Racer, new score %s', bomb.owner.name, bomb.owner.score)

        # the victims are dead for a while, dropping their items (flag)
        victim.modify(is_alive=False)
        if not victim.has_hands_free:
            flag = victim.carried_item
            flag.drop_on_ground(victim.pos)
            app.logger.info('%s dropped the %s flag!!', victim.name, flag.team)
            victim.modify(has_hands_free=True, carried_item=None)
            data = {'name': victim.name, 'target': str(flag.id)}
            for racer in spectators:
                socketio.emit('flag dropped', data, room=racer.name)

        # but they will revive
        revive_racer.apply_async((str(victim.id),), countdown=victim.deathduration)

    # show new scores to spectators
    # TODO: put this in a separate task.. update_scores around pos
    if victims:
        update_scores(spectators)
    else:
        app.logger.debug('no score changes')


@celery.task
def adjust_score(racerid, points):
    Racer.objects.get(id=racerid).modify(inc__score=points)


@celery.task
def revive_racer(racerid):
    Racer.objects.get(id=racerid, is_alive=False).modify(is_alive=True)


########################
# tasks that do not require celery (yet)

def update_racer_pos(data):
    """Update Racer position
    Update the vision of the Racer and everybody who sees him
    Trigger nearby bombs, traps, flags, etc..
    """
    emit = socketio.emit

    # parse the json data
    name = data.get('name')
    lng, lat = float(data.get('lng', 0)), float(data.get('lat', 0))

    # lookup the moved racer and update its position
    movedracer = Racer.objects(name=name).first()
    movedracer.modify(pos={"type": "Point", "coordinates": [lng, lat]})

    movedracer = movedracer.reload()

    # get all the new nearby stuff for the new position
    before, after = movedracer.get_nearby_stuff()   # todo: move nearby stuff to cache memory?
    #app.logger.info('NearbyStuff went from %s to %s', before, after)
    mr = movedracer.get_info()

    # A. Communication to both nearby Racers and the Moving Racer
    # A.1 Create markers for the new racers in range
    racers = (o.get_info() for o in set(after) - set(before) if isinstance(o, Racer))
    for racer in racers:
        emit('marker added', mr, room=racer['name'])
        emit('marker added', racer, room=mr['name'])

    # A.2 Move the position of known racers in range
    racers = (o.get_info() for o in set(after) | set(before) if isinstance(o, Racer))
    for racer in racers:
        emit('marker moved', mr, room=racer['name'])
        emit('marker moved', racer, room=mr['name'])

    # A.3 Remove the racers who are out of range
    racers = (o.get_info() for o in set(before) - set(after) if isinstance(o, Racer))
    for racer in racers:
        emit('marker removed', mr, room=racer['name'])
        emit('marker removed', racer, room=mr['name'])

    # A.4
    beasts = (o.get_info() for o in set(after) - set(before) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker added', beast, room=mr['name'])

    # A.5 Move the position of known racers in range
    beasts = (o.get_info() for o in set(after) | set(before) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker moved', beast, room=mr['name'])

    # A.6 Remove the beasts who are out of range
    beasts = (o.get_info() for o in set(before) - set(after) if isinstance(o, Beast))
    for beast in beasts:
        emit('marker removed', beast, room=mr['name'])

    # B. Show new bombs (we don't remove bombs.. they disappear after explosion) TODO: but do they see the explosion??
    # bombs = (o for o in set(after) - set(before) if isinstance(o, Bomb))
    # for bomb in bombs:
    #     emit('bomb added', bomb.get_info(), room=mr['name'])
    #     # trigger enemy bombs
    #     if bomb.team != movedracer.color:
    #         do_bomb_explode.apply_async((str(bomb.id),), countdown=bomb.trigger_time)

    # C. Show new flags (we don't remove flags)
    # flags = (o for o in set(after) - set(before) if isinstance(o, Flag))
    # for flag in flags:
    #     emit('flag added', flag.get_info(), room=mr['name'])
    #     # trigger enemy bombs
    #
    # # C.2 Interact with existing flags
    # events = movedracer.handle_flags()
    #
    # # get nearby racers
    spectators = Racer.objects(pos__near=movedracer.pos,
                               pos__max_distance=GLOBAL_RANGE )
    # for event in events:
    #     eventtype = event['type']
    #     # let them update their flags (TODO: broadcast in cell)
    #     app.logger.info('WUP, i have to send %s', event)
    #     for racer in spectators:
    #         emit(eventtype, event, room=racer['name'])
    #
    #     # adjust scores if necessary
    #     if eventtype == 'flag scored':
    #         movedracer.modify(inc__score=5) # TODO: check for more atoms
    #         update_scores(spectators)

    # D. Show new coins
    coins = (o for o in set(after) - set(before) if isinstance(o, CopperCoin) and o.active)
    for coin in coins:
        # app.logger.info('%s coin, %s racer' % (coin.team, movedracer.color))
        lng, lat = coin.pos['coordinates']
        emit('coin added', coin.get_info(), room=mr['name'])

    # D.2 Pickup nearby coins, set the team
    coins = CopperCoin.objects(pos__near=movedracer.pos,
                               pos__max_distance=PICKUP_RANGE,
                               team__ne=movedracer.color)
    for coin in coins:
        app.logger.info('racer %s picks up a %sp %s coin' % (movedracer.name, coin.value, coin.team))
        info = {'value': coin.value, 'id': str(coin.id), 'racer': str(movedracer.id)}
        if coin.secret:
            info.update({'secret': True})

        for racer in spectators:
            emit('coin pickup', info, room=racer['name'])

        # ON COIN PICKUP (TODO: improve)
        # * When playing this game in a tour, with people doing the tour in 2 ways
        # Change the team of the coin to prevent this team from taking the coin until another team takes it.
        # Ensure atomicity by checking for no lock on the coin
        # Also disable coin for x minutes
        # if coin.modify({'active':True}, team=movedracer.color, active=False)
        #   *** task to enable the coin again ***
        #   revive_coin.apply_async((str(coin.id),), countdown=x)

        # * When it is not a tour, coins are just deleted or disabled on pickup.
        coin.modify({'active':True}, team='black', active=False)

        # The racer scores points
        movedracer.modify(inc__score=coin.value)

        app.logger.info('racer %s scores %s points for coin', movedracer.name, coin.value)
        update_scores(spectators)

    if movedracer.is_alive:
        # E. Touch beasts
        beasts = Beast.objects(pos__near=movedracer.pos,
                               pos__max_distance=BEAST_EAT_RANGE)
        if beasts:
            movedracer.modify(is_alive=False)
            revive_racer.apply_async((str(movedracer.id),), countdown=movedracer.deathduration)
        for beast in beasts:
            app.logger.info('racer %s hits up a %s beast' % (movedracer.name, beast.species))
            info = {'beast': str(beast.id), 'racer': str(movedracer.id)}
            emit('beast hit', info, room=mr['name'])
            # todo: warn others
            movedracer.modify(dec__score=50)
            update_scores(spectators)


def update_scores(racers):
    app.logger.info('calculate new scores for %s', racers)
    data = {'individual': {}, 'team': {}}
    for racer in racers:
        racer.reload('score')
        data['individual'][racer.name] = racer.score

        # this can be done client side..
        if racer.color not in data['team']:
            data['team'][racer.color] = sum(r.score for r in racers if r.color == racer.color)

    for racer in racers:
        socketio.emit('new score', data, room=racer.name)



@celery.task
def move_beasts():
    beasts = Beast.objects(active=True)
    for b in beasts:
        # unpack geojson linestring
        track = b.track['coordinates']
        oldpos = pos = b.pos['coordinates']
        if oldpos in track:
            i = track.index(pos)
            n = len(track)
            newpos = track[(i + 1) % n]
            app.logger.info('move %s to index %s at %s' % (b.name, (i+1)%n, newpos))
            b.modify(pos=newpos)
        else:
            app.logger.warn('Beast %s is off the track uggh', b.id)
            b.modify(pos=track[0])
            return

        # update the racers
        before = Racer.objects(pos__near=oldpos,
                               pos__max_distance=VISION_RANGE,
                               is_online=True)
        after = Racer.objects(pos__near=newpos,
                              pos__max_distance=VISION_RANGE,
                              is_online=True)

        # racers that have to add the beast
        racers = set(after) - set(before)
        for racer in racers:
            app.logger.info('hello racer %s, beast added %s', racer.name, b.get_info())
            socketio.emit('marker added', b.get_info(), room=racer.name)

        # racers that have to move the beast
        racers = set(after) | set(before)
        for racer in racers:
            app.logger.info('hello racer %s, beast moved %s', racer.name, b.get_info())
            socketio.emit('marker moved', b.get_info(), room=racer.name)

        # racers that have to remove the beast (out of range)
        racers = set(before) - set(after)
        for racer in racers:
            app.logger.info('hello racer %s, beast removed %s', racer.name, b.get_info())
            socketio.emit('marker removed', b.get_info(), room=racer.name)


@celery.task
def rain_coins():
    coins = CopperCoin.objects(active=False)
    app.logger.info('Found %s deactivated coins', coins.count())
    for c in coins:
        # TODO: add debug config
        if datetime.datetime.now() > c.date_modified + datetime.timedelta(minutes=10):
            if random.random() < 0.08:
                app.logger.info('turn on coin %s', c)
                c.modify(active=True)


@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(3.0, move_beasts.s(), name='move beasts every 3 seconds')
    # sender.add_periodic_task(4.0, move_racers.s(), name='move racers every 3 seconds')
    sender.add_periodic_task(15.0, rain_coins.s(), name='rain coins over the map')