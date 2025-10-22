# syntax=docker/dockerfile:1.7

FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OCR_PORT=9000 \
    APP_HOME=/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgl1 \
        poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR ${APP_HOME}

RUN pip install --upgrade pip setuptools wheel
RUN pip install paddlepaddle paddleocr fastapi uvicorn[standard]

COPY . ${APP_HOME}

EXPOSE ${OCR_PORT}

CMD ["uvicorn", "service:app", "--host", "0.0.0.0", "--port", "9000"]

