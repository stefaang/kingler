FROM ubuntu

# Install Python
# Redis is missing
RUN \
  apt-get update && \
  apt-get install -y python2.7 python-virtualenv python-dev build-essential libgeos-dev && \
  rm -rf /var/lib/apt/lists/*

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
