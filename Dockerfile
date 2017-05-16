FROM phusion/baseimage:0.9.19

# Use baseimage-docker's init system.
CMD ["/sbin/my_init"]

# Install dependencies via apt
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN apt-get update
RUN apt-get install -y python2.7 python-virtualenv python-dev build-essential libgeos-dev redis-server mongodb-org git

# Clean up APT when done.
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Get pip & requirements
COPY requirements.txt /app/
COPY docker-get-pip.py /app/
WORKDIR /app
RUN python docker-get-pip.py
RUN pip install -r requirements.txt

# Set env
ENV APP_SETTINGS="config.DevelopmentConfig"
ENV REDIS_URL="redis://localhost"
ENV SECRET_KEY="whysosecret?"
ENV CELERY_BROKER="redis://localhost:6379/0"

# Copy app
ADD . /app

ENTRYPOINT ["python"]
CMD ["kingler/app.py"]
