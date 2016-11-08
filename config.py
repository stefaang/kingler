import os
import geoalchemy2
basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = 'wiehoudternietvanwortels??!?'
    #SQLALCHEMY_DATABASE_URI = os.environ['DATABASE_URL']
    #SQLALCHEMY_TRACK_MODIFICATIONS = False
    MONGODB_SETTINGS = {
        'db': '',
        # 'host': os.environ['MONGODB_URL']
    }
    REDIS_URL = os.environ['REDIS_URL']
    REDIS_CHAN = 'chat'


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
