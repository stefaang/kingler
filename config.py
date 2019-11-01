import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config(object):
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY',
                           '51f52814-0071-11e6-a247-000ec6c2372c')
    REQUEST_STATS_WINDOW = 15
    CELERY_CONFIG = {}
    SOCKETIO_MESSAGE_QUEUE = os.getenv('SOCKETIO_MESSAGE_QUEUE',
                                       os.getenv('CELERY_BROKER_URL', 'redis://'))

    MONGODB_SETTINGS = {
        'db': 'kingler',
        # 'host': os.environ['MONGODB_URL']
    }
    REDIS_URL = os.environ['REDIS_URL']
    REDIS_CHAN = 'chat'
    CORS_ORIGIN = os.getenv('CORS_ORIGIN', '*')

class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    pass


class TestingConfig(Config):
    TESTING = True
    CELERY_CONFIG = {'CELERY_ALWAYS_EAGER': True}
    SOCKETIO_MESSAGE_QUEUE = None


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}
