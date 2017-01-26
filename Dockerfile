FROM python:2.7

RUN \
  apt-get update && \
  apt-get install -y \
    libgeos-dev \
  && rm -rf /var/lib/apt/lists/*

# Get pip & requirements
COPY requirements.txt /code/
WORKDIR /code
RUN pip install -r requirements.txt

# env
ENV APP_SETTINGS="config.DevelopmentConfig"
ENV REDIS_URL="redis://localhost"
ENV SECRET_KEY="whysosecret?"
ENV CELERY_BROKER="redis://localhost:6379/0"

ADD . /code
