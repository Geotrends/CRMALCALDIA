define('custom:helpers/alcaldia-notification-message', [
    'handlebars',
], function (Handlebars) {

    const escapeHtml = function (value) {
        return Handlebars.Utils.escapeExpression(String(value || ''));
    };

    const normalizeData = function (raw) {
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

    const userLink = function (userId, name) {
        const label = escapeHtml(name || 'Usuario');

        if (!userId) {
            return label;
        }

        return '<a href="#User/view/' + encodeURIComponent(userId) + '">' + label + '</a>';
    };

    const caseLink = function (href, label) {
        return '<a href="' + escapeHtml(href) + '">' + escapeHtml(label || 'Caso') + '</a>';
    };

    const hasHtmlLinks = function (message) {
        return /<a\s+href=/i.test(String(message || ''));
    };

    const resolveStyle = function (flags) {
        if (flags.isFinalizadoAlert) {
            return 'text-success';
        }

        if (!flags.isVencimientoAlert) {
            return flags.style || 'text-muted';
        }

        if (flags.alertTipo === 'vencido' || /está vencido/i.test(flags.rawMessage || '')) {
            return 'text-danger';
        }

        return 'text-warning';
    };

  /**
   * Mensaje HTML con enlaces para cualquier notificación de casos (todos los roles).
   *
   * @return {{message: string, style: string, userId: string|null}}
   */
    const buildFromNotificationModel = function (model) {
        const data = normalizeData(model.get('data'));
        const rawMessage = String(model.get('message') || '');

        const entityType = data.entityType || model.get('relatedType') || 'Case';
        const entityId = data.entityId || model.get('relatedId') || '';
        const href = data.recordUrl || ('#' + entityType + '/view/' + entityId);
        const userId = data.userId || model.get('createdById') || null;
        const userName = data.userName || model.get('createdByName') || '';
        const entityName = data.entityName || '';
        const radicadoNumero = String(data.cNumeroRadicado || data.numeroRadicacion || '').trim();
        let expediente = String(data.expediente || data.cExpediente || '').trim();
        const linkLabel = radicadoNumero || entityName || 'Caso';

        if (!expediente && rawMessage) {
            const expMatch = rawMessage.match(/expediente[:\s]+([^·<]+)/i);

            if (expMatch) {
                expediente = expMatch[1].trim();
            }
        }

        const expSuffix = expediente
            ? ' · Expediente: ' + escapeHtml(expediente)
            : '';
        const expSuffixAsignador = expediente
            ? ' · Expediente ' + escapeHtml(expediente)
            : '';

        const isActaVisita = !!data.isActaVisita
            || /realizó la visita|se ha realizado la visita/i.test(rawMessage);
        const isNuevaSolicitud = !!data.isNuevaSolicitud;
        const isRadicado = !!data.isRadicado;
        const isPatrulleroAsignacion = !!data.isPatrulleroAsignacion
            || /te asignó el caso/i.test(rawMessage);
        const isAsignacion = !!data.isAsignacion
            || (/asignó el caso/i.test(rawMessage)
                && / a /i.test(rawMessage)
                && !isPatrulleroAsignacion);
        const isVencimientoAlert = !!data.isVencimientoAlert
            || /está vencido|vence en|vence hoy/i.test(rawMessage);
        const isFinalizadoAlert = !!data.isFinalizadoAlert
            || /finalizó el caso/i.test(rawMessage);
        const alertTipo = data.alertTipo || '';
        const styleFlags = {
            isVencimientoAlert: isVencimientoAlert,
            isFinalizadoAlert: isFinalizadoAlert,
            alertTipo: alertTipo,
            rawMessage: rawMessage,
            style: data.style || 'text-muted',
        };

        if (hasHtmlLinks(rawMessage) && !isNuevaSolicitud && !isRadicado) {
            return {
                message: rawMessage,
                style: resolveStyle(styleFlags),
                userId: userId,
            };
        }

        let message = '';

        if (isVencimientoAlert) {
            const fechaVenc = data.fechaVencimiento || '';
            const diasRest = data.diasRestantes;

            if (alertTipo === 'vencido' || /está vencido/i.test(rawMessage)) {
                message = 'El caso ' + caseLink(href, linkLabel)
                    + ' está vencido'
                    + (fechaVenc ? ' (vencía ' + escapeHtml(fechaVenc) + ')' : '')
                    + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
            } else {
                const diasText = diasRest === 0
                    ? 'hoy'
                    : ('en ' + escapeHtml(String(diasRest)) + ' día(s)');

                message = 'El caso ' + caseLink(href, linkLabel)
                    + ' vence ' + diasText
                    + (fechaVenc ? ' (' + escapeHtml(fechaVenc) + ')' : '')
                    + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
            }
        } else if (isFinalizadoAlert) {
            message = (userId ? userLink(userId, userName) : escapeHtml(userName || 'El CRM'))
                + ' finalizó el caso ' + caseLink(href, linkLabel)
                + (expediente ? ' · Expediente: ' + escapeHtml(expediente) : '');
        } else if (isActaVisita) {
            message = userLink(userId, userName)
                + ' realizó la visita en el caso ' + caseLink(href, entityName || linkLabel)
                + (expediente ? ' (expediente ' + escapeHtml(expediente) + ')' : '')
                + '. Revise el acta de visita.';
        } else if (isNuevaSolicitud) {
            message = userLink(userId, userName)
                + ' creó una solicitud de queja: '
                + caseLink(href, entityName || 'Caso');
        } else if (isPatrulleroAsignacion) {
            message = userLink(userId, userName)
                + ' te asignó el caso ' + caseLink(href, linkLabel)
                + expSuffix;
        } else if (isAsignacion) {
            message = userLink(userId, userName)
                + ' asignó el caso ' + caseLink(href, linkLabel)
                + ' a ' + userLink(data.assignedUserId, data.assignedUserName || 'patrullero')
                + expSuffix;
        } else if (isRadicado || /radicó el caso|radicó un caso/i.test(rawMessage)) {
            message = userLink(userId, userName)
                + ' radicó el caso '
                + caseLink(href, radicadoNumero || linkLabel)
                + expSuffix;
        } else if (data.isAsignador) {
            message = userLink(userId, userName)
                + ' radicó un caso para asignar: ' + caseLink(href, linkLabel)
                + expSuffixAsignador;
        } else if (entityId) {
            message = userLink(userId, userName)
                + ' · ' + caseLink(href, linkLabel);
        } else {
            message = escapeHtml(rawMessage.replace(/<[^>]+>/g, ''));
        }

        return {
            message: message,
            style: resolveStyle(styleFlags),
            userId: userId,
        };
    };

    return {
        buildFromNotificationModel: buildFromNotificationModel,
        userLink: userLink,
        caseLink: caseLink,
    };
});
