#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
    manage.py
    ~~~~~~~~~

    Some quick and dirty routines to prepare the database.

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

import click
import random
from kingler.models import *

@click.group()
def cli():
    pass

@cli.command()
@click.argument('model')
def reset(model):
    if model == 'racer':
        Racer.objects.update(score=0)
    elif model == 'coin':
        CopperCoin.objects.update(team='black', value=10, icon='')
    elif model == 'flag':
        # TODO
        Flag.objects.count()



def rain_coins(n):
    # add 100 new coins to the database with random value 5 - 10 - 15 - 20
    for i in range(n):
        randpos = [3.72 + .04*random.random(), 51.0 + .025*random.random()]
        c = CopperCoin(pos=randpos, value=5*random.randint(1,5))
        c.save()


def set_beasts_at_bottles():
    """distribute beasts around the coin track"""
    from math import cos, sin, radians, pi
    coins = CopperCoin.objects()
    rand = random.random
    for coin in coins:
        if str(coin.id).endswith('0'):
            print(coin)
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
                v = (rand() - 0.5) * 10/N      # add some extra variance
                _lng = lng + R * (1-v)                     * cos(i*2*pi/N+K)
                _lat = lat + R * (1-v) * cos(radians(lat)) * sin(i*2*pi/N+K)
                b.track.append([_lng, _lat ])

            b.save()


def reset_coins():
    """Reset the team on all coins back to black"""
    CopperCoin.objects.update(team='black', value=10, icon='')


def shuffle_coins():
    coins = list(CopperCoin.objects.all())

    items = {
      'compass': 2, 'hook': 2, 'rum': 15, 'barrel': 8, 'chest': 4, 'leg': 1, 'spy': 1,
      'bottle': 1, 'sword': 8, 'helm': 5, 'map': 5, 'anchor': 4, 'sabre': 8
    }
    random.shuffle(coins)
    for item, amount in items.items():
        for i in range(amount):
            coin = coins.pop()
            coin.update(icon=item)


def muffle_coins():
    coins = list(CopperCoin.objects.all())

    items = {('chest', 8, 50), ('letter', 8, 0), ('star', 16, 25)}
    secrets = ['bonanza', 'barbossa', 'scheve schuit', 'heyo captain jack', 'duizend bommen en granaten', 'tuizentfloot',
               'how much is the fish', 'tafelpoot']

    random.shuffle(coins)
    for item, amount, value in items:
        for i in range(amount):
            coin = coins.pop()
            if item == 'letter':
                coin.update(icon=item, value=value, secret=secrets.pop())
            else:
                coin.update(icon=item, value=value)


def dump_coins(fname='coindump.txt'):
    """Dump all the coin position to a file"""
    import json
    coins = CopperCoin.objects()
    # add rounding to increase readability
    positions = [[round(lng, 5), round(lat, 5)] for c in coins for lng, lat in c.pos['coordinates']]

    with open(fname, 'wb') as f:
        f.write(json.dumps(positions))


def load_coins(fname='coindump.txt'):
    """Load a bunch of coin positions into the db"""
    import json
    with open(fname, 'rb') as f:
        data = f.read()
    positions = json.loads(data)
    for pos in positions:
        CopperCoin(pos=pos, value=10).save()
    print(CopperCoin.objects.count(), 'coins in database')


if __name__ == '__main__':
    cli()
