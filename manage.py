import mongoengine

me = mongoengine.connect()
db = me.get_database('kingler')
coll = db.get_collection('map_entity')
coll.drop()
cursor = coll.find({'_cls' : 'MapEntity.Racer'})

for doc in cursor:
    print doc

# coll.delete_one({'name' : 'stefaan'})
# coll.delete_many({'_cls' : 'MapEntity.HoldableEntity.Flag'})