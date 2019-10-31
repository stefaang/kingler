# -*- coding: utf-8 -*-
"""
    package.module
    ~~~~~~~~~~~~~~

    A brief description goes here.

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

from celery import Celery
celery = Celery('kingler', config_source='kingler.celeryconfig')