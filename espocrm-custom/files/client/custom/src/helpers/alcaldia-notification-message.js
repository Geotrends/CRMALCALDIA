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
        const label = escapeHtml(String(name || '').trim() || 'Usuario');

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
     * Referencia del caso en notificaciones: radicado si existe; si no, peticionario.
     */
    const resolveCaseReferenceLabel = function (data) {
        const radicadoRaw = String(data.cNumeroRadicado || data.numeroRadicacion || '').trim();
        const radicadoNumero = radicadoRaw === 'sin número' ? '' : radicadoRaw;
        const entityName = String(data.entityName || '').trim();

        return radicadoNumero || entityName || 'Caso';
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
        const linkLabel = resolveCaseReferenceLabel(data);

        const isActaVisita = !!data.isActaVisita
            || /realizó la visita|se ha realizado la visita/i.test(rawMessage);
        const isVisitaAprobada = !!data.isVisitaAprobada
            || /aprobó la visita/i.test(rawMessage);
        const isNuevaSolicitud = !!data.isNuevaSolicitud;
        const isPendienteRadicacion = !!data.isPendienteRadicacion;
        const isRadicado = !!data.isRadicado;
        const isPatrulleroAsignacion = !!data.isPatrulleroAsignacion
            || /te asignó el caso/i.test(rawMessage);
        const isAsignacion = !!data.isAsignacion
            || (/asignó el caso/i.test(rawMessage)
                && / a /i.test(rawMessage)
                && !isPatrulleroAsignacion);
        const isListoParaDecision = data.eventKey === 'case.visita.aprobada.juridica';
        const isActaPendienteRevision = data.eventKey === 'acta.diligenciada.pendiente';
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

        if (hasHtmlLinks(rawMessage) && !isNuevaSolicitud && !isRadicado
            && !isVencimientoAlert && !isFinalizadoAlert) {
            return {
                message: rawMessage,
                style: resolveStyle(styleFlags),
                userId: userId,
            };
        }

        // Alertas de plazo (AlertaProceso): el mensaje ya viene redactado por el servidor.
        if (data.isAlertaProcesoNotification) {
            const alertaId = data.alertaProcesoId || model.get('relatedId') || '';
            const vencida = String(data.fase || '').indexOf('vencida') === 0;

            return {
                message: escapeHtml(rawMessage.replace(/<[^>]+>/g, ''))
                    + (alertaId ? ' · <a href="#AlertaProceso/view/' + encodeURIComponent(alertaId) + '">Ver alerta</a>' : ''),
                style: vencida ? 'text-danger' : 'text-warning',
                userId: null,
            };
        }

        let message = '';
        const motivoText = data.motivo ? ' Motivo: ' + escapeHtml(data.motivo) : '';

        if (isVencimientoAlert) {
            const fechaVenc = data.fechaVencimiento || '';
            const diasRest = data.diasRestantes;

            if (alertTipo === 'vencido' || /está vencido/i.test(rawMessage)) {
                message = 'El caso ' + caseLink(href, linkLabel)
                    + ' está vencido'
                    + (fechaVenc ? ' (vencía ' + escapeHtml(fechaVenc) + ')' : '');
            } else {
                const diasText = diasRest === 0
                    ? 'hoy'
                    : ('en ' + escapeHtml(String(diasRest)) + ' día(s)');

                message = 'El caso ' + caseLink(href, linkLabel)
                    + ' vence ' + diasText
                    + (fechaVenc ? ' (' + escapeHtml(fechaVenc) + ')' : '');
            }
        } else if (isFinalizadoAlert) {
            message = (userId ? userLink(userId, userName) : escapeHtml(userName || 'El CRM'))
                + ' finalizó el caso ' + caseLink(href, linkLabel);
        } else if (isActaVisita) {
            message = userLink(userId, userName)
                + ' realizó la visita en el caso ' + caseLink(href, linkLabel)
                + '. Revise el acta de visita.';
        } else if (isVisitaAprobada) {
            message = userLink(userId, userName)
                + ' aprobó la visita del caso ' + caseLink(href, linkLabel) + '.';
        } else if (isActaPendienteRevision) {
            message = 'Hay un acta de visita lista para revisar en el caso '
                + caseLink(href, linkLabel) + '.';
        } else if (isListoParaDecision) {
            message = 'El caso ' + caseLink(href, linkLabel)
                + ' está listo para decidir: cerrar sin proceso o abrir Auto de Inicio.';
        } else if (isPendienteRadicacion) {
            message = userLink(userId, userName)
                + ' registró el caso ' + caseLink(href, linkLabel)
                + '. Requiere radicación.';
        } else if (isNuevaSolicitud) {
            message = userLink(userId, userName)
                + ' creó una solicitud de queja: '
                + caseLink(href, linkLabel);
        } else if (data.isProcesoAviso) {
            message = userLink(userId, userName) + ' ' + escapeHtml(data.textoAviso || '') + ' (caso ' + caseLink(href, linkLabel) + ').'
                + (data.indicacion ? ' ' + escapeHtml(data.indicacion) : '');
        } else if (data.isAperturaPendiente) {
            message = userLink(userId, userName) + ' definió la apertura de actuación en el caso ' + caseLink(href, linkLabel)
                + '. Decida si se abre un expediente nuevo o se incorpora a uno existente.';
        } else if (data.isAperturaPreparar || data.isAperturaDecidida || data.isAperturaIncorporado
            || data.isAutoInicioParaFirma || data.isAutoInicioDevuelto || data.isExpedienteAbierto) {
            const exp = data.expedienteNumero ? ' ' + escapeHtml(data.expedienteNumero) : '';
            const quien = userLink(userId, userName);
            const caso = caseLink(href, linkLabel);

            message = data.isAperturaPreparar
                ? quien + ' decidió la apertura de actuación del caso ' + caso + '. Prepare el Auto de Inicio del expediente' + exp + ' y envíelo a firma.'
                : data.isAperturaDecidida
                ? quien + ' decidió la apertura de actuación del caso ' + caso + ' (expediente' + exp + ' en preparación).'
                : data.isAperturaIncorporado
                ? quien + ' incorporó el caso ' + caso + ' al expediente' + exp + '.'
                : data.isAutoInicioParaFirma
                ? quien + ' envió a firma el Auto de Inicio del expediente' + exp + ' (caso ' + caso + '). Descargue el formato prellenado en Word, fírmelo y cargue el PDF.'
                : data.isAutoInicioDevuelto
                ? quien + ' devolvió el Auto de Inicio del expediente' + exp + ' (caso ' + caso + ').' + motivoText
                : quien + ' firmó el Auto de Inicio: expediente' + exp + ' abierto (caso ' + caso + ').'
                    + (data.esAccionable ? ' Proceda con la citación y notificación.' : '');
        } else if (data.isRespuestaFinalPendiente) {
            message = userLink(userId, userName) + ' cerró la atención del caso ' + caseLink(href, linkLabel)
                + (data.esAccionable
                    ? ' sin abrir proceso. Proyecte la respuesta final al peticionario (Comunicaciones, marcada como respuesta final) y finalice el caso.'
                    : ' sin abrir proceso. Queda pendiente la respuesta final al peticionario.');
        } else if (data.isVisitaComplementaria) {
            const numeroVisita = data.numeroVisita ? ' N° ' + escapeHtml(String(data.numeroVisita)) : '';
            const plazoText = data.plazo ? ' Plazo: ' + escapeHtml(data.plazo) + '.' : '';

            message = data.esResponsable
                ? userLink(userId, userName) + ' solicitó que realices la visita complementaria' + numeroVisita
                    + ' del caso ' + caseLink(href, linkLabel) + '.' + motivoText + plazoText
                : userLink(userId, userName) + ' solicitó la visita complementaria' + numeroVisita
                    + ' del caso ' + caseLink(href, linkLabel)
                    + (data.assignedUserId
                        ? ', a cargo de ' + userLink(data.assignedUserId, data.assignedUserName)
                        : ' (sin responsable asignado)')
                    + '.' + motivoText + plazoText;
        } else if (data.isRemisionCompetencia) {
            message = userLink(userId, userName)
                + (data.competencia === 'Hallazgos'
                    ? ' definió remitir por competencia, tras la revisión de hallazgos, el caso '
                    : ' confirmó competencia ' + escapeHtml(String(data.competencia || '').toLowerCase()) + ' en el caso ')
                + caseLink(href, linkLabel)
                + '. Prepare el oficio de remisión'
                + (data.autoridadDestino ? ' a ' + escapeHtml(data.autoridadDestino) : '') + '.';
        } else if (data.isPendienteAsignacion) {
            message = 'El caso ' + caseLink(href, linkLabel)
                + ' fue radicado: revise la competencia y asigne el responsable.';
        } else if (data.isDesasignacion) {
            message = userLink(userId, userName)
                + ' reasignó el caso ' + caseLink(href, linkLabel)
                + ' a ' + userLink(data.assignedUserId, data.assignedUserName || 'otro responsable')
                + '; ya no está a tu cargo.' + motivoText;
        } else if (isPatrulleroAsignacion) {
            message = userLink(userId, userName)
                + (data.isReasignacion ? ' te reasignó el caso ' : ' te asignó el caso ')
                + caseLink(href, linkLabel) + (data.isReasignacion ? '.' + motivoText : '');
        } else if (isAsignacion) {
            message = userLink(userId, userName)
                + (data.isReasignacion ? ' reasignó el caso ' : ' asignó el caso ')
                + caseLink(href, linkLabel)
                + (data.isReasignacion && data.previousUserId
                    ? ' de ' + userLink(data.previousUserId, data.previousUserName || 'responsable anterior')
                    : '')
                + ' a ' + userLink(data.assignedUserId, data.assignedUserName || 'patrullero')
                + (data.isReasignacion ? '.' + motivoText : '');
        } else if (isRadicado || /radicó el caso|radicó un caso/i.test(rawMessage)) {
            message = userLink(userId, userName)
                + ' radicó el caso '
                + caseLink(href, linkLabel);
        } else if (data.isAsignador) {
            message = userLink(userId, userName)
                + ' radicó un caso para asignar: ' + caseLink(href, linkLabel);
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
        resolveCaseReferenceLabel: resolveCaseReferenceLabel,
    };
});
