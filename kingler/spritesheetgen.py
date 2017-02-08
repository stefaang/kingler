import json

# generate spritesheet at https://www.leshylabs.com/apps/sstool/ and get the PNG and JSON output
with open('static/img/flaticons/pirates.json', 'r+') as f:
    sprites = json.loads(f.read())
    sprites = {s['name'] : {
        'x': s['x'],
        'y': s['y'],
        'width': s['width'],
        'height': s['height'],
        'pixelratio': 1
    } for s in sprites}
    data = json.dumps(sprites)

    f.seek(0)
    f.write(data)