# -*- coding: utf-8 -*-
"""
    kingler.manage
    ~~~~~~~~~~~~~~

    Some quick and dirty routines to prepare the database.

    :copyright: (c) 2017 by Stefaan Ghysels
    :license: BSD, see LICENSE for more details.
"""

if 0:
    # use this part of the script if you cannot import models
    import mongoengine

    me = mongoengine.connect()
    db = me.get_database('kingler')
    coll = db.get_collection('map_entity')
    cursor = coll.find({'_cls' : 'MapEntity.Racer'})

    for doc in cursor:
        print doc

    # coll.delete_one({'name' : 'stefaan'})
    # coll.delete_many({'_cls' : 'MapEntity.HoldableEntity.Flag'})

    # Delete all Racers
    #coll.delete_many({'_cls' : 'MapEntity.Racer'})

from models import *
import random


def rainRandomCoins(n):
    # add 100 new coins to the database with random value 5 - 10 - 15 - 20
    for i in range(n):
        randpos = [3.72 + .04*random.random(), 51.0 + .025*random.random()]
        c = CopperCoin(pos=randpos, value=5*random.randint(1,5))
        c.save()

def resetCoins():
    c = CopperCoin.objects()
    c.update(team='black')

def dumpCoinsToFile():
    import json
    coins = CopperCoin.objects()
    lst = [c.pos['coordinates'] for c in coins]

    with open('coindump.txt', 'wb') as f:
        f.write(json.dumps(lst))

if __name__ == '__main__':
    resetCoins()
    dumpCoinsToFile()