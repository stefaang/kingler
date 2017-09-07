
// extend icon set
icons.spider = L.divIcon({className: 'bparty spider', iconSize: [120, 120],});
icons.terminator = L.divIcon({className: 'bparty terminator', iconSize: [120, 120],});

for (var i=1; i<10; i++){
    var pimp = 'pimp' + i;
    icons[pimp] = L.divIcon({className: 'bparty pimp'+i, iconSize: [50, 120],});
}

console.log('Update PIMP icons: ' + mrm.icon);
if (mrm.icon in icons) {
    console.log('Updated mrm PIMP icons');
    mrm.setIcon(icons[mrm.icon]);
}

// add moan sounds
var moanSounds = new Howl({
    'src': ['static/sound/moans.mp3'],
    'sprite': {
        'its_him': [0, 1200],
        'hes_so_sexy': [1300, 2400],
        'yes_sir': [3800, 1500],
        'id_do_anything': [5300, 2000],
        'i_submit': [7400, 1900],
        'control_me': [9300, 1400],
        'please_sir': [11200, 1600],
        'ow_sir': [12800, 1400],
        'its_him2': [15700, 3700],
        'random_moaning1': [33200, 9700],
        'random_moaning2': [44700, 5400],
        'fake_laugh': [55300, 2900]
    }
});
// keep track of which sound to play next
moanSounds.index = 0;

function playRandomCoinSound() {
    var moan = ['its_him', 'hes_so_sexy', 'yes_sir', 'id_do_anything', 'i_submit', 'control_me', 'please_sir', 'ow_sir',
            'its_him2', 'random_moaning1', 'random_moaning2', 'fake_laugh'][moanSounds.index];
    moanSounds.index = (moanSounds.index + 1) % 12;
    moanSounds.play(moan);
};

// replace coin markers
var BabeMarker = CoinMarker.extend({
    counter: 0,
    setupIcon: function(icon) {
        // TODO: setup random babe
        this.bindTooltip(icon, {direction:'bottom', offset:[0,20]});
        if (icon in icons) {
            //
            if (icon == 'coin') {

            }
            this.setIcon(icons[icon]);
        } else {
            console.warn('icon missing!! ' + icon);
        }
    }
});

function coinMarker(babe) {
    return new BabeMarker(babe);
}