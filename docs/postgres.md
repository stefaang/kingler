
In case we ever go back to PostGres

- install PostGres
 - a super user is handy as you need extensions, database and tables for this project
- install PostGis
 - CREATE EXTENSION postgis;
- use geoalchemy2 in requirements.txt
 - export DATABASE_URL="postgresql:///kingler" to environment
- use alembic / flask-migrate to migrate databases
 - edit script.py.mako to include geoalchemy2
 - edit your db migrate versions carefully
