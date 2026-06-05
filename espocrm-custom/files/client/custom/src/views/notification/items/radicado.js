define('custom:views/notification/items/radicado', [
    'views/notification/items/base',
    'handlebars',
], function (Dep, Handlebars) {

    var escapeHtml = function (value) {
        return Handlebars.Utils.escapeExpression(String(value || ''));
    };

    var normalizeData = function (raw) {
        if (!raw) {
            return {};
        }

        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw) || {};
            } catch (e) {
                return {};
            }
        }

        return raw;
    };

    return Dep.extend({

        templateContent:
            '<div class="stream-head-container">' +
                '<div class="pull-left">{{{avatar}}}</div>' +
                '<div class="stream-head-text-container">' +
                    '<span class="{{style}} message">{{{message}}}</span>' +
                '</div>' +
            '</div>' +
            '<div class="stream-date-container">' +
                '<span class="text-muted small">{{{createdAt}}}</span>' +
            '</div>',

        setup: function () {
            var data = normalizeData(this.model.get('data'));
            var rawMessage = String(this.model.get('message') || '');

            var entityType = data.entityType || this.model.get('relatedType') || 'Case';
            var entityId = data.entityId || this.model.get('relatedId') || '';
            var href = data.recordUrl || ('#' + entityType + '/view/' + entityId);
            var userName = data.userName || this.model.get('createdByName') || '';
            var entityName = data.entityName || '';
            var numero = data.numeroRadicacion || '';
            var expediente = String(data.expediente || '').trim();
            var linkLabel = numero && numero !== 'sin número'
                ? numero
                : (entityName || 'Caso');

            if (!expediente && rawMessage) {
                var expMatch = rawMessage.match(/expediente[:\s]+([^·<]+)/i);

                if (expMatch) {
                    expediente = expMatch[1].trim();
                }
            }

            var isActaVisita = !!data.isActaVisita
                || /realizó la visita|se ha realizado la visita/i.test(rawMessage);
            var isNuevaSolicitud = !!data.isNuevaSolicitud;
            var isPatrulleroAsignacion = !!data.isPatrulleroAsignacion
                || /te asignó el caso/i.test(rawMessage);
            var isAsignacion = !!data.isAsignacion
                || (/asignó el caso/i.test(rawMessage)
                    && / a /i.test(rawMessage)
                    && !isPatrulleroAsignacion);

            this.userId = data.userId || this.model.get('createdById');
            this.style = data.style || 'text-muted';

            if (isActaVisita) {
                this.message = escapeHtml(userName)
                    + ' realizó la visita en el caso <a href="' + href + '">'
                    + escapeHtml(entityName || linkLabel) + '</a>'
                    + (expediente ? ' (expediente ' + escapeHtml(expediente) + ')' : '')
                    + '. Revise el acta de visita.';
            } else if (isNuevaSolicitud) {
                this.message = escapeHtml(userName)
                    + ' creó una solicitud de queja: <a href="' + href + '">'
                    + escapeHtml(entityName || linkLabel) + '</a>';
            } else if (isPatrulleroAsignacion) {
                this.message = escapeHtml(userName)
                    + ' te asignó el caso <a href="' + href + '">'
                    + escapeHtml(linkLabel) + '</a>'
                    + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
            } else if (isAsignacion) {
                this.message = escapeHtml(userName)
                    + ' asignó el caso <a href="' + href + '">'
                    + escapeHtml(linkLabel) + '</a>'
                    + ' a ' + escapeHtml(data.assignedUserName || 'patrullero')
                    + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
            } else if (data.isAsignador) {
                this.message = escapeHtml(userName)
                    + ' radicó un caso para asignar: <a href="' + href + '">'
                    + escapeHtml(linkLabel) + '</a>'
                    + (expediente ? ' · Expediente ' + escapeHtml(expediente) : '');
            } else if (data.isRadicado || /radicó el caso|radicó un caso/i.test(rawMessage)) {
                this.message = escapeHtml(userName)
                    + ' radicó el caso <a href="' + href + '">'
                    + escapeHtml(linkLabel) + '</a>'
                    + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
            } else if (entityId) {
                this.message = escapeHtml(userName)
                    + ' · <a href="' + href + '">'
                    + escapeHtml(linkLabel) + '</a>';
            } else {
                this.message = escapeHtml(rawMessage.replace(/<[^>]+>/g, ''));
            }
        },

        data: function () {
            return {
                avatar: this.getAvatarHtml(),
                message: this.message,
                style: this.style,
                createdAt: this.getCreatedAtHtml(),
            };
        },

        getCreatedAtHtml: function () {
            var createdAt = this.model.get('createdAt');

            if (!createdAt) {
                return '';
            }

            return this.getDateTime().toDisplay(createdAt);
        },
    });
});
