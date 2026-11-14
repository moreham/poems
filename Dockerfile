FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
WORKDIR /app

RUN groupadd --gid 10001 poetry \
    && useradd --uid 10001 --gid poetry --no-create-home poetry \
    && mkdir /app/data \
    && chown poetry:poetry /app/data

COPY index.html styles.css app.js interpretations.js likes.js ./
COPY assets/ ./assets/
COPY tools/public-server.py ./tools/public-server.py

USER poetry
EXPOSE 8001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/', timeout=3).read()"
CMD ["python", "tools/public-server.py", "--host", "0.0.0.0", "--port", "8001", "--db", "/app/data/likes.sqlite3"]
