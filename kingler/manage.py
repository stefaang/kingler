# -*- coding: utf-8 -*-
"""
    kingler.manage
    ~~~~~~~~~~~~~~

    Some quick and dirty routines to prepare the database.

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

import random
from models import *


def deleteAllFlags():
    Flag.objects.delete()

def deleteAllRacers():
    Racer.objects.delete()

def resetRacers():
    Racer.objects.update(score=0)

def rainRandomCoins(n):
    # add 100 new coins to the database with random value 5 - 10 - 15 - 20
    for i in range(n):
        randpos = [3.72 + .04*random.random(), 51.0 + .025*random.random()]
        c = CopperCoin(pos=randpos, value=5*random.randint(1,5))
        c.save()

def setBeastAtBottles():
    from math import cos, sin, radians, pi
    coins = CopperCoin.objects()
    rand = random.random
    for coin in coins:
        if str(coin.id).endswith('0'):
            print coin
            lng, lat = coin.pos['coordinates']
            b = Beast(pos=[lng, lat],
                      species='whale' if rand() > .3 else 'kraken',
                      name=str(coin.id)[:6])

            # a LineString needs 2 coordinates!!! OMG. Use MultiPoint next time

            # let the beast circle the bottle, N points at radius R, offset K
            R = 0.002 * rand() + 0.001   # this is about 120m
            # larger radius requires more points. about 50 points for 0.002...
            N = int(25000 * R)
            K = rand() * 2*pi
            b.track = []

            for i in range(N):
                v = (rand() - 0.5) * 3 / N      # add some extra variance
                _lng = lng + R * (1-v)                     * cos(i*2*pi/N+K)
                _lat = lat + R * (1-v) * cos(radians(lat)) * sin(i*2*pi/N+K)
                b.track.append([_lng, _lat ])

            b.save()


def deleteAllCoins():
    CopperCoin.objects.delete()

def resetCoins():
    """Reset the team on all coins back to black"""
    c = CopperCoin.objects()
    c.update(team='black', value=10)

def dumpCoinsToFile(fname='coindump.txt'):
    """Dump all the coin position to a file"""
    import json
    coins = CopperCoin.objects()
    # add rounding to increase readability
    positions = [[round(lng, 5), round(lat, 5)] for c in coins for lng, lat in c.pos['coordinates']]

    with open(fname, 'wb') as f:
        f.write(json.dumps(positions))

def loadCoinsFromFile(fname='coindump.txt'):
    """Load a bunch of coin positions into the db"""
    import json
    with open(fname, 'rb') as f:
        data = f.read()
    positions = json.loads(data)
    for pos in positions:
        CopperCoin(pos=pos, value=10).save()
    print CopperCoin.objects.count(), 'coins in database'

if __name__ == '__main__':
    deleteAllFlags()
    # reset coins
    c = CopperCoin.objects()
    c.update(team='black', value=10)

    #dumpCoinsToFile()
