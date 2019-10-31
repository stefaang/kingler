import json
from kingler.models import *

from flask import (
    Blueprint, current_app, flash, g, redirect, render_template, request, session, url_for
)
#from werkzeug.security import check_password_hash, generate_password_hash

bp = Blueprint('auth', __name__, url_prefix='/auth')


@bp.route('/')
def index():
    return render_template('index.html', session=session)


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if not request.form['username']:
            return render_template('login.html', error='You must fill in a Username')
        if not all(c.isalnum() or c.isspace() for c in request.form['username']):
            return render_template('login.html', error='Only use letters, numbers and spaces in your Username')
        username = session['username'] = escape(request.form['username'])
        color = session['color'] = request.form['color']

        if username.startswith('clearall'):
            deletables = [(Bomb, 'bombs'), (CopperCoin, 'coins'), (Flag, 'flags')]
            for cls, keyw in deletables:
                if username.endswith(keyw):
                    cls.objects().delete()
            return redirect(url_for('logout'))

        r = Racer.objects(name=username)
        if not r:
            # add a new Racer to the db
            r = Racer(name=username, pos=[3.7, 51], color=color)
        else:
            # update the color attribute to the db
            r = r.first()
            r.color = color
        r.is_online = True
        r.save()
        # keep track of the racer object in this session
        session['racerid'] = str(r.id)
        current_app.logger.debug('id is %s', session['racerid'])
        if session.get('newstyle'):
            return redirect(url_for('newstylemap'))
        else:
            return redirect(url_for('oldstylemap'))
    return render_template('login.html', error='')


@bp.route('/logout')
def logout():
    # remove the username from the session if it's there
    session.pop('username', None)
    return redirect(url_for('index'))


@bp.route('/mbmap')
def newstylemap():
    if 'username' in session:
        admin = False

        # get the main Racer.. you need to be logged in
        session['racer'] = Racer.objects(name=session['username']).first()
        mainracer = session['racer']
        mainracer.modify(is_online=True)
        mainracer.clear_nearby()   # in case it was not done on logout
        current_app.logger.info('loaded %s, of type %s', mainracer, type(mainracer))
        _, stuff = mainracer.get_nearby_stuff()
        racers = [o.get_info() for o in stuff if isinstance(o, Racer)]
        flags = [o.get_info() for o in stuff if isinstance(o, Flag)]
        mainracer.clear_nearby()  # clear again to load all the stuff that I didn't add here on the next move
        myself = mainracer.get_info()
        racers = [myself] + racers
        current_app.logger.info('loading... %s', racers)
        # except Exception as e:
        #     # message to dev
        #     current_app.logger.error("Failed to show map: %s" % e)
        #     # message to user
        #     return "Failed to show map"

        # prepare dict object
        data = {'racers': racers, 'username': session['username'], 'flags': flags}
        if session['username'] == 'Stefaan':    # todo: set party admins
            current_app.logger.info('admin logged in %s', session['username'])
            admin = True
        return render_template('mbmap.html', flaskData=data, admin=admin)
    else:
        session['newstyle'] = True
        return redirect(url_for('login'))

    # return render_template('mbmap.html', session=session)


@bp.route('/map')
def oldstylemap():
    if 'username' in session:
        admin = False
        #try:
        # get the main Racer.. you need to be logged in
        session['racer'] = Racer.objects(name=session['username']).first()
        mainracer = session['racer']
        mainracer.modify(is_online=True)
        mainracer.clear_nearby()   # in case it was not done on logout
        current_app.logger.info('loaded %s, of type %s', mainracer, type(mainracer))
        _, stuff = mainracer.get_nearby_stuff()
        racers = [o.get_info() for o in stuff if isinstance(o, Racer)]
        flags = [o.get_info() for o in stuff if isinstance(o, Flag)]
        mainracer.clear_nearby()  # clear again to load all the stuff that I didn't add here on the next move
        myself = mainracer.get_info()
        racers = [myself] + racers
        current_app.logger.info('loading... %s', racers)
        # #     return "Failed to show map"

        data = {'racers': racers, 'username': session['username'], 'flags': flags}
        # detect admin access
        if session['username'] == 'Stefaan':  # todo: set party admins
            current_app.logger.warn('admin logged in %s', session['username'])
            admin = True
        return render_template('map.html', flaskData=data, admin=admin)
    else:
        session['newstyle'] = False
        return redirect(url_for('login'))


@bp.route('/racer/', methods=['POST'])
def add_racer():
    """ Post """
    data = json.loads(request.get_json())
    name = data['name']
    lat = data['lat']
    lng = data['lng']
    try:
        r = Racer(name=name, color='black')
        r.pos = (float(lng), float(lat))
        r.save()
        return "OK"
    except Exception as e:
        current_app.logger.error("Failed to add racer: %s", repr(e))
        return "Failed to add racer"


@bp.route('/racer/<name>/', methods=['DELETE'])
def del_racer(name):
    if session.get('username') == name:
        # TODO stub
        # delete this racer
        pass


@bp.route('/waypoint', methods=['POST'])
def add_position():
    if request.method == 'POST' and 'username' in session:
        try:
            data = request.get_json(force=True)
            # current_app.logger.info("addpos %s", data)
            name = session['username']
            lat = float(data['coords']['latitude'])
            lng = float(data['coords']['longitude'])
            acc = float(data['coords']['accuracy'])
            pos = Position(name, (lng, lat), acc)
            pos.save()
            current_app.logger.info("successfully added %s", pos)
            return "OK"
        except Exception as e:
            current_app.logger.exception("Failed to add position: %s", repr(e))
            return "Failed to add position"
    else:
        return "Soz bro"


@bp.route('/<name>')
def hello_name(name):
    return "Hello {}!".format(name)
