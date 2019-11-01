# -*- coding: utf-8 -*-
"""
Configure Celery. See the configuration guide at ->
http://docs.celeryproject.org/en/master/userguide/configuration.html#configuration
"""

## Broker settings.
broker_url = 'redis://localhost:6379/0'
broker_heartbeat=0

# List of modules to import when the Celery worker starts.
imports = ('kingler.tasks.workers',)

## Using the database to store task state and results.
result_backend = 'rpc'
#result_persistent = False

accept_content = ['json', 'application/text']

result_serializer = 'json'
timezone = "UTC"

# define periodic tasks / cron here
beat_schedule = {
    'move-beasts': {
      'task': 'kingler.tasks.workers.move_beasts',
      'schedule': 10.0,
    },
}
