FROM phusion/baseimage:0.9.19

# Use baseimage-docker's init system.
CMD ["/sbin/my_init"]

# Install dependencies via apt
RUN apt-get update &&
    apt-get install -y python3 python3-virtualenv python-dev build-essential libgeos-dev redis-server mongodb-server

# Copy app
# Also includes get-pip
COPY . /app
WORKDIR /app

# Get pip & requirements
RUN python docker-get-pip.py
RUN pip install -r requirements.txt

# Set env
ENV APP_SETTINGS="config.DevelopmentConfig"
ENV REDIS_URL="redis://localhost"
ENV SECRET_KEY="whysosecret?"
ENV CELERY_BROKER="redis://localhost:6379/0"

ENTRYPOINT ["python"]
CMD ["app.py"]

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
