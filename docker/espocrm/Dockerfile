FROM espocrm/espocrm

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        python3 \
        python3-uno \
        libreoffice-writer \
        libreoffice-core \
    && rm -rf /var/lib/apt/lists/*

USER www-data
