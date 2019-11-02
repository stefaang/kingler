from flask import request, abort, jsonify, g, session, redirect, escape, current_app, render_template

from ..app import db, socketio
# from ..auth import token_auth, token_optional_auth
from ..models import *
from ..utils import url_for

from . import api


@api.route('/movebeasts')
def movebeasts():
    beasts = Beast.objects(active=True)
    for b in beasts:
        # unpack geojson linestring
        track = b.track['coordinates']
        oldpos = pos = b.pos['coordinates']
        if oldpos in track:
            i = track.index(pos)
            n = len(track)
            newpos = track[(i + 1) % n]
            logger.info('move %s to index %s at %s' % (b.name, (i + 1) % n, newpos))
            b.modify(pos=newpos)
        else:
            logger.warn('Beast %s is off the track uggh', b.id)
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
            logger.info('hello racer %s, beast added %s', racer.name, b.get_info())
            socketio.emit('marker added', b.get_info(), room=racer.name)

        # racers that have to move the beast
        racers = set(after) | set(before)
        for racer in racers:
            logger.info('hello racer %s, beast moved %s', racer.name, b.get_info())
            socketio.emit('marker moved', b.get_info(), room=racer.name)

        # racers that have to remove the beast (out of range)
        racers = set(before) - set(after)
        for racer in racers:
            logger.info('hello racer %s, beast removed %s', racer.name, b.get_info())
            socketio.emit('marker removed', b.get_info(), room=racer.name)
    response_data = {
        "result": Beast.objects.count(),
        "success": True,
        "status_code": 200,
    }
    return jsonify(response_data)
