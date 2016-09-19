from flask import Flask, redirect, request, render_template
from flask_mongoengine import MongoEngine

db = MongoEngine()

app = Flask(__name__)
app.config['MONGODB_SETTTINGS'] = {
    'db':'kingler',
#    'host': xx
#    'port':27017
}
app.config.from_pyfile('kingler.cfg')
db.init_app(app)

@app.route('/', methods=['GET', 'POST'])
def show_main():
    if request.method=='POST':
         return redirect(url_for('show_map'))
    return render_template('index.html')

@app.route('/mapme.html')
def show_map():
    return render_template('mapme.html')



if __name__ == '__main__':
    app.run()
