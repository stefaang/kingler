FROM ubuntu

# Set env
ENV APP_SETTINGS="config.DevelopmentConfig"
ENV REDIS_URL="redis://localhost"
ENV SECRET_KEY="whysosecret?"
ENV CELERY_BROKER="redis://localhost:6379/0"

# Install Python
# Redis is missing
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.2.list
RUN \
  apt-get update && \
  apt-get install -y \
    build-essential \
    git \
    libgeos-dev \
    mongodb-org \
    python-dev \
    python-virtualenv \
    python2.7 \
    redis-server \
  && rm -rf /var/lib/apt/lists/*

# Copy app
# Also includes get-pip
COPY . /app
WORKDIR /app

# Get pip & requirements
RUN python docker-get-pip.py
RUN pip install -r requirements.txt

ENTRYPOINT ["python"]
CMD ["app.py"]

