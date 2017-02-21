-----
Model Descriptions and other brainfarts will go here...
-----


The Server
----------

app.py
- receives client events (both flask/socketio) and creates tasks to process them
- flask session management (login etc)

tasks.py
- handles the socketio events
- allows to plan cronlike tasks (example: explode bomb after 10 sec)
- emits socketio events to clients
- TODO: task replacement for same task, same client? example moveToB replaces moveToA when moveToB didn't start yet

model.py
- defines the mongo models
- provides some basic query functions and formatters (get_info)


MapEntity
  Racer - moving MapEntity, real life player
    Roles:
      Soldier
      Medic
  Flag - capture enemy flag and bring it to yours to score points
  Bomb - static, explodes after short timeout.. or user remote trigger?
  Mine - static, explodes when enemy is near (Mine), expires after long timeout
  Station - base race, capture stations to get income of points
  Chest - give bonus.. points or items

manage.py
- contains some db cleanup functions to facilitate migration


The Client
----------

classic-app.js
- reusable modules would be nice

CustomMap
- socketIO integrated

CustomLayers:
- RacerMarker
  - MainRacerMarker
- FlagMarker
- BombMarker
- ChestMarker

CustomControls
- Actions
  - DropBombButton
  - DropFlagButton
- SettingsButton
  - FullScreen

- AdminSettings
  - LocatorButton
  - AddFlag / MoveFlag / RemoveFlag --> on FlagMarker
  - DefineZones
  - Change Team Color --> on RacerMarker


CustomMap options as plugins?
Requires a server side party setup.. and a lot of extra checkers in tasks
- CTF plugin:
  - add admin flag setup buttons
  - add client dropflag button
  - add tasks
  - add MainRacerMarker listeners to modify icons
- Chest plugin:
  - add 'chest added' listener
- BaseRace plugin
  - add stations
  - add buttons to capture stations
  -
- Pokemon Mode plugin



Party Setup
- new party login is admin. gets into setup mode with a start / reset button