import random
import math
from celery import Celery
from models import *
from config import ProductionConfig
# from vincenty import vincenty



cfg = ProductionConfig
celery = Celery('kingler', broker=cfg['CELERY_BROKER_URL'])
celery.conf.update(cfg)


@celery.task
def moveBeasts():
    beasts = Beast.objects(trackname__ne=None)
    for b in beasts:
        track = b.track
        i = track.index(b.pos)
        n = len(track)
        if i > 0:
            b.modify(pos=track[(i - 1) % n])
        elif i == 0:
            print 'flip track woohoo'
            b.modify(track=reversed(track))
        else:
            print 'we are off the track uggh'
            b.pos = track[0]
    moveBeasts.apply_async((), countdown=5)


if __name__ == '__main__':
    b = Beast.objects(name='sharky')
    if b:
        b = b.first()
    else:
        b = Beast(name='sharky', pos=[3.755, 51], species='shark')
        b.save()

    track = Beast.objects(trackname='the shark road').only(['trackname', 'track'])
    if track:
        track = track.first()
        b.modify(track=track, trackname='the shark road')
    else:
        track = [[3.755, 51], [3.75, 51.006], [3.752, 51.01]]

        b.modify(track=track, trackname='the shark road')

    moveBeasts.apply_async((), countdown=5)
