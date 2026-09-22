# EspoCRM 10 requiere montajes persistentes separados para data, custom y
# client/custom; la configuración está definida en docker-compose.yml.
FROM espocrm/espocrm:10.0.6

USER root

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        postgresql-client \
        python3 \
        python3-openpyxl \
        python3-pymupdf \
        python3-uno \
        libreoffice-calc-nogui \
        libreoffice-writer-nogui \
        libreoffice-core \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod proxy proxy_http proxy_wstunnel

RUN mkdir -p /opt/bootstrap/repo

ARG DEPLOY_VERSION=unknown
ARG SOURCE_COMMIT=

COPY espocrm-custom /opt/bootstrap/repo/espocrm-custom
COPY scripts /opt/bootstrap/repo/scripts
COPY formatos /opt/bootstrap/repo/formatos
COPY sql /opt/bootstrap/repo/sql
COPY .deploy-version /opt/bootstrap/repo/.deploy-version
RUN mkdir -p /opt/bootstrap/repo/exports \
    && if [ -n "${SOURCE_COMMIT}" ]; then \
         printf '%s\n' "${SOURCE_COMMIT}" > /opt/bootstrap/repo/.deploy-version; \
       elif [ "${DEPLOY_VERSION}" != "unknown" ] && [ "${DEPLOY_VERSION}" != "local" ]; then \
         printf '%s\n' "${DEPLOY_VERSION}" > /opt/bootstrap/repo/.deploy-version; \
       fi

COPY docker/espocrm/run-custom-init.sh /usr/local/bin/run-custom-init.sh
COPY docker/espocrm/entrypoint-with-deploy.sh /usr/local/bin/entrypoint-with-deploy.sh
COPY docker/espocrm/apache-websocket-proxy.conf /etc/apache2/conf-available/websocket-proxy.conf
RUN a2enconf websocket-proxy

RUN chmod +x /usr/local/bin/run-custom-init.sh /usr/local/bin/entrypoint-with-deploy.sh

# Producción: auto-deploy activo sin variables extra en Dokploy.
ENV REPO_ROOT=/opt/bootstrap/repo
ENV ESPO_RUN_AUTO_DEPLOY=1
