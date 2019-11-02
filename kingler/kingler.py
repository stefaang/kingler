import threading
import time

from flask import Blueprint, render_template, jsonify, current_app, session, escape, request, redirect
from .utils import url_for
from .models import Racer, Bomb, Flag, Beast, CopperCoin
from .events import push_model
from .app import db
from . import stats

main = Blueprint('main', __name__)


@main.before_app_first_request
def before_first_request():
    """Start a background thread that looks for users that leave."""
    # def find_offline_users(app):
    #     with app.app_context():
    #         while True:
    #             users = Racer.find_offline_users()
    #             for user in users:
    #                 push_model(user)
    #             db.session.remove()
    #             time.sleep(5)
    #
    # if not current_app.config['TESTING']:
    #     thread = threading.Thread(target=find_offline_users,
    #                               args=(current_app._get_current_object(),))
    #     thread.start()


@main.before_app_request
def before_request():
    """Update requests per second stats."""
    stats.add_request()


@main.route('/')
def index():
    """Serve client-side application."""
    return render_template('index.html')


@main.route('/stats', methods=['GET'])
def get_stats():
    return jsonify({'requests_per_second': stats.requests_per_second()})

# TODO: sort the mess below


@main.route('/login', methods=['GET','POST'])
def login():
    """"""
    if request.method == 'GET':
        return render_template('login.html', error='')
    # POST to login
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
        return redirect(url_for('main.logout'))
    is_admin = username.startswith('admin')

    r = Racer.objects(name=username)
    if not r:
        # add a new Racer to the db
        r = Racer(name=username, pos=[2.66, 51.073], color=color, is_admin=is_admin)
    else:
        # update the color attribute to the db
        r = r.first()
        r.color = color
    r.is_admin = is_admin
    r.is_online = True
    r.save()
    # keep track of the racer object in this session
    session['racerid'] = str(r.id)
    current_app.logger.debug('id is %s', session['racerid'])
    if session.get('newstyle'):
        return redirect(url_for('main.newstylemap'))
    else:
        return redirect(url_for('main.oldstylemap'))


@main.route('/logout')
def logout():
    # remove the username from the session if it's there
    if 'username' in session:
        Racer.objects(name=session['username']).modify(is_online=False)
    session.pop('username', None)
    return redirect(url_for('main.index'))


@main.route('/mbmap')
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
        return render_template('mbmap.html', flaskData=data, admin=mainracer.is_admin)
    else:
        session['newstyle'] = True
        return redirect(url_for('main.login'))

    # return render_template('mbmap.html', session=session)


@main.route('/map')
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
        return render_template('map.html', flaskData=data, admin=mainracer.is_admin)
    else:
        session['newstyle'] = False
        return redirect(url_for('main.login'))

# TODO: require admin
@main.route('/reset')
def resetgame():
    CopperCoin.objects.update(team='black')
    Racer.objects.update(score='0')
    return redirect(url_for('main.logout'))

