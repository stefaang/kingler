import os
basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    CSRF_ENABLED = True
    SECRET_KEY = os.environ['SECRET_KEY']
    MONGODB_SETTINGS = {
        'db': 'kingler',
        # Host ip address also works
        # 'host': '172.18.0.2',
        'host': 'db_1'
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
