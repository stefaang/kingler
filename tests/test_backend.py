# -*- coding: utf-8 -*-
"""
    Kingler Tests
    ~~~~~~~~~~~~
    Tests the Kingler Flask backend.
    :copyright: (c) 2017 by Stefaan Ghysels.
    :license: BSD, see LICENSE for more details.
"""

import os

import tempfile
import unittest
from kingler.app import app, socketio
import redis

# import coverage
#
#
# cov = coverage.coverage(branch=True)
# cov.start()

disconnected = None

class KinglerTestCase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        pass

    @classmethod
    def tearDownClass(cls):
        # cov.stop()
        # cov.report(include='flask-socketio/*', show_missing=True)
        pass

    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        with app.app_context():
            app.logger.info('haaalp')

    def tearDown(self):
        pass

    def test_main_page(self):
        rv = self.app.get('/')
        self.assertIn('Retro Leaflet', rv.data)

    def test_socket_connect_missing_session(self):
        client = socketio.test_client(app)
        received = client.get_received()
        self.assertEquals(len(received), 0)
        client.disconnect()
        self.assertEquals(len(received), 0)

if __name__ == '__main__':
    # unittest.main()

    # redis scratchpad
    r = redis.StrictRedis()
    # r.execute_command("racers, 51.00, 3.75, 'stefaan', 51.00, 3.76, 'karen',
    #          51.01, 3.74, 'thomas',
    #          51.02, 3.76, 'dirkjan'")
    r.geoadd('racers',
             51.00, 3.75, 'stefaan',
             51.00, 3.76, 'karen',
             51.01, 3.74, 'thomas',
             51.02, 3.76, 'dirkjan')
    nearby = r.georadius('racers', 51.01, 3.74, 2000, withdist=True)

    print nearby
    r.geoadd('racers',
             51.03, 3.75, 'stefaan')
    nearby = r.georadius('racers', 51.01, 3.74, 2000, withdist=True)

    print nearby