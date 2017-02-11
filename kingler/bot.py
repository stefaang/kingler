from tasks import *
from config import ProductionConfig
# from vincenty import vincenty
from random import random

# todo: add beast to client
# beast.on click: (beast.stop) + beast.showTrack + currentBeast=this
#    map.on click: currentBeast.addWayPoint
#    waypoint.on click: currentBeast.removeWayPoint
#    currentBeast.on click: (beast.startMoving) + beast.hideTrack


cfg = ProductionConfig()
celery = Celery('kingler', broker=cfg.CELERY_BROKER_URL)
celery.conf.update({
    'CELERY_RESULT_BACKEND': cfg.CELERY_RESULT_BACKEND,
    'REDIS_URL': cfg.REDIS_URL
})



if __name__ == '__main__':
    b = Beast.objects(name='sharky')
    if b:
        b = b.first()
    else:
        b = Beast(name='sharky', pos=[3.755, 51], species='shark')
        b.save()

    print b.id
    track = Beast.objects(trackname='the shark road').only('trackname', 'track')
    if track:
        track = track.first().track
        b.modify(track=track, trackname='the shark road')
    else:
        track = [[3.7477+0.005*random(), 51.990+0.004*random()] for i in range(30)]

        b.modify(track=track, trackname='the shark road')

    moveBeasts.apply_async((), countdown=10)
