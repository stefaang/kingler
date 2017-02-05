# -*- coding: utf-8 -*-
"""
    kingler.config
    ~~~~~~~~~~~~~~

    Definition of the main application configurations

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

import os
basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = os.environ['SECRET_KEY']
    MONGODB_SETTINGS = {
        'db': 'kingler',
        # 'host': os.environ['MONGODB_URL']
    }
    REDIS_URL = os.environ['REDIS_URL']
    REDIS_CHAN = 'chat'

    CELERY_BROKER_URL = os.environ['CELERY_BROKER']
    CELERY_RESULT_BACKEND = os.environ['CELERY_BROKER']



class ProductionConfig(Config):
    DEBUG = False


class StagingConfig(Config):
    DEVELOPMENT = True
    DEBUG = True


class DevelopmentConfig(Config):
    DEVELOPMENT = True
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
