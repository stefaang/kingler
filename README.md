Play a mix of Pacman and other classics in real life on your mobile device.

![pcparty-screen1](https://cloud.githubusercontent.com/assets/974800/23187523/6806561a-f88b-11e6-9453-6d1fc8f6c594.png)

Core components:

Backend:

 - [Flask](http://flask.pocoo.org/), the python web app framework
 - [MongoDB](https://www.mongodb.com/) for all persistent data ops
 - [Celery](https://docs.celeryproject.org/en/latest/), distributed task queue, the backend worker

Frontend - Classic:

 - [leaflet](https://leafletjs.com/) for maps
 - [socketIO](https://flask-socketio.readthedocs.io/en/latest/) for real-time position updates

Frontend - Fancy:

 - [MapBoxGL](https://www.mapbox.com/mapbox-gl-js/) iso Leaflet
 - ES2015 javascript and [Vue](https://vuejs.org/)


How to run this?

- Get these packages
```
sudo apt-get install python3 python3-virtualenv python3-dev build-essential redis-server libgeos-dev mongodb-server
```

- Make sure you have MongoDB 2.6+
```
mongod --version
```
  [Instructions](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-16-04)

- Setup Virtual environment
```
virtualenv -p python3 env
source env/bin/activate
pip install -r requirements.txt
```

- Setup some environment vars (add them to env/bin/activate script) - see config.py
```
export APP_SETTINGS="config.DevelopmentConfig"
export REDIS_URL="redis://localhost"
export SECRET_KEY="whysosecret?"
export CELERY_BROKER="redis://localhost:6379/0"
```

- Start the webserver (see Procfile for Heroku version)
```
gunicorn app:app --chdir kingler -k eventlet -w 1 -b 0.0.0.0:5000
```

- Start Celery worker in another terminal (but with the same venv). Enable the beat to run with bots.
```
celery worker -A app.celery --loglevel=info -B
```

You may want to

- Setup NGINX with SSL to support GeoLocation features on Chrome browser
- Setup an init script in systemd

TODO:

- fix version nrs in requirements.txt
- add license
- add a tutorial for SSL setup (required on Chrome for GeoLocation)
- rework database interaction to be compatible both with MongoDB and PostGIS/GeoAlchemy2
- ...



In case we ever go back to PostGres (I hope not)

- install PostGres
 - a super user is handy as you need extensions, database and tables for this project
- install PostGis
 - CREATE EXTENSION postgis;
- use geoalchemy2 in requirements.txt
 - export DATABASE_URL="postgresql:///kingler" to environment
- use alembic / flask-migrate to migrate databases
 - edit script.py.mako to include geoalchemy2
 - edit your db migrate versions carefully
