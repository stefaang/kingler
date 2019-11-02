from flask import Blueprint, current_app

api = Blueprint('api', __name__)

from . import racer, beast  # noqa
