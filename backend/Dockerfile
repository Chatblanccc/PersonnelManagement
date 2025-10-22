# syntax=docker/dockerfile:1.7

FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    UVICORN_WORKERS=2 \
    APP_HOME=/app \
    VENV_PATH=/opt/venv

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        libjpeg-dev \
        zlib1g-dev \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        poppler-utils \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${APP_HOME}

COPY requirements.txt ./requirements.txt

RUN python -m venv ${VENV_PATH} \
    && ${VENV_PATH}/bin/pip install --upgrade pip setuptools wheel \
    && ${VENV_PATH}/bin/pip install -r requirements.txt

COPY app ./app
COPY main.py ./main.py

RUN mkdir -p /data/contracts ${APP_HOME}/logs \
    && groupadd --system appgroup \
    && useradd --system --gid appgroup --home ${APP_HOME} appuser \
    && chown -R appuser:appgroup ${APP_HOME} ${VENV_PATH} /data/contracts

ENV PATH="${VENV_PATH}/bin:${PATH}" \
    PYTHONPATH=${APP_HOME}

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl --fail http://127.0.0.1:8000/health || exit 1

USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

