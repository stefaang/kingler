A geospatial web app that shows your teammates position in real-time.
Core components:
 
 - [Flask](http://flask.pocoo.org/), the python web app framework
 - [MongoDB](https://www.mongodb.com/) for all persistent data ops
 - socketIO for real-time position updates
 - [leaflet](http://leafletjs.com/) for maps


How to run this?

- Get these packages
```
sudo apt-get install python27 python-virtualenv python-dev build-essential redis libgeos-dev
```
- Setup Virtual environment
```
virtualenv env
source env/bin/activate
pip install -r requirements.txt
```
- Setup some environment vars (autoenv is handy)
```
export APP_SETTINGS="config.DevelopmentConfig"
export REDIS_URL="redis://localhost"
export SECRET_KEY="whysosecret?"
```
- Start the webserver (see Procfile for Heroku version)
```
gunicorn app.app -k eventlet -w 1 -b 0.0.0.0:5000
```


You may want to

- Setup NGINX with SSL to support GeoLocation features on Chrome browser
- Setup an init script in systemd

TODO:

- rework database interaction to use MongoDB iso PostGIS/GeoAlchemy2
  eventually we could support both...
- fix version nrs in requirements.txt
- add license
- add a tutorial for SSL setup (required on Chrome for GeoLocation)
- clean up that messy map.html js
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
