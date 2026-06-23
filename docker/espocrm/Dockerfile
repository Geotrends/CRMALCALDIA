FROM espocrm/espocrm

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postgresql-client \
        python3 \
        python3-openpyxl \
        python3-pymupdf \
        python3-uno \
        libreoffice-calc \
        libreoffice-writer \
        libreoffice-core \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/bootstrap/repo

COPY espocrm-custom /opt/bootstrap/repo/espocrm-custom
COPY scripts /opt/bootstrap/repo/scripts
COPY formatos /opt/bootstrap/repo/formatos
COPY sql /opt/bootstrap/repo/sql
COPY excelAlcaldia.xlsx /opt/bootstrap/repo/excelAlcaldia.xlsx
COPY docker/espocrm/run-custom-init.sh /usr/local/bin/run-custom-init.sh

RUN chmod +x /usr/local/bin/run-custom-init.sh
