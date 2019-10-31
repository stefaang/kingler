from flask.helpers import get_debug_flag
from kingler.config import DevelopmentConfig, ProductionConfig
from kingler import celery
from kingler.app import create_app
from kingler.utils.celery_util import init_celery
CONFIG = DevelopmentConfig if get_debug_flag() else ProductionConfig
app = create_app(CONFIG)
init_celery(app, celery)