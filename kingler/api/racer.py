from flask import request, abort, jsonify, g, session, redirect, escape, current_app, render_template

from ..app import db
from ..auth import token_auth, token_optional_auth
from ..models import *
from ..utils import url_for

from . import api


@api.route('/racer', methods=['GET'])
def list_racers():
    # TODO: filter what the user is allowed to see
    racers = Racer.objects()
    data = {r.name: {
        'name': r.name,
        'is_alive': r.is_alive,
    } for r in racers}
    return jsonify(data)


@api.route('/racer/<name>', methods=['GET'])
def get_racer(name):
    # TODO: filter what the user is allowed to see
    racers = Racer.objects(name=name)
    data = {r.name: {
        'name': r.name,
        'is_alive': r.is_alive,
    } for r in racers}
    return jsonify(data)


@api.route('/racer/<name>/revive', methods=['POST'])
def revive_racer(name):
    Racer.objects(name=name).update(is_alive=True)
    return get_racer(name)
