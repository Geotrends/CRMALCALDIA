define('custom:helpers/case-role-guidance', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const ESTADOS_VISITA = ['Asignado', 'En gestión técnica', 'Revisión de hallazgos'];

    const escapeHtml = function (value) {
        return $('<span>').text(value || '').html();
    };

    const estadoVisita = function (view) {
        return ESTADOS_VISITA.includes(view.model.get('status'));
    };

    const enVisita = function (view) {
        return !RadicacionFields.isAdminUser(view.getUser()) && estadoVisita(view);
    };

    // Paso del proceso en que va la solicitud y quién debe dar el siguiente: se muestra en todos los
    // banners, para cualquier usuario. «mio» indica que la acción le corresponde a quien mira.
    // Quien puede hacer la revisión técnico-jurídica (la misma regla del panel «Revisión técnico-jurídica»).
    const puedeRevisar = function (view) {
        const user = view.getUser();

        return !RadicacionFields.isAdminUser(user)
            && (RadicacionFields.isInspeccionUser(user)
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user)
                || RadicacionFields.isInspectorAmbientalUser(user)
                || (view._crmRoles || []).includes('Inspector Ambiental'));
    };

    // Con el acta registrada y sin otra visita pendiente, el siguiente paso es la revisión técnico-jurídica.
    const enRevision = function (view) {
        const programaciones = ((view._crmVisitasGuia || {}).programaciones || []).filter(p => p.estado !== 'Cancelada');

        return estadoVisita(view)
            && programaciones.length > 0
            && !programaciones.some(p => !p.actaId || p.actaEstado === 'Pendiente' || p.actaFirmada === false)
            && view.model.get('cDecisionTramite') !== 'Visita complementaria';
    };

    const getEtapa = function (view) {
        const model = view.model;
        const user = view.getUser();
        const status = model.get('status') || '';
        const responsable = model.get('assignedUserName') || 'el responsable asignado';
        const esResponsable = model.get('assignedUserId') === user.id;
        const admin = RadicacionFields.isAdminUser(user);
        const etapa = {estado: status, actor: 'Responsable por definir', accion: 'Revisar el estado de la solicitud', mio: false};

        if (status === 'Pendiente de radicacion') {
            etapa.actor = 'Auxiliar Administrativo · Radicador';
            etapa.accion = 'Radicar la solicitud';
            etapa.mio = !admin && RadicacionFields.isRadicacionUser(user);
        } else if (status === 'Radicado') {
            etapa.actor = 'Director Técnico';
            etapa.accion = model.get('cCompetenciaConfirmada')
                ? 'Asignar la solicitud a un responsable'
                : 'Revisar la competencia y asignar la solicitud';
            etapa.mio = !admin && RadicacionFields.isAsignadorUser(user);
        } else if (estadoVisita(view)) {
            const visitas = view._crmVisitasGuia;
            if (!visitas) {
                etapa.actor = responsable;
                etapa.accion = view._crmVisitasGuiaError
                    ? 'Consulte el panel Visitas para verificar el siguiente paso'
                    : 'Consultando el avance de las visitas…';

                return etapa;
            }
            const programaciones = ((visitas || {}).programaciones || []).filter(p => p.estado !== 'Cancelada');
            const pendiente = programaciones.find(p => !p.actaId || p.actaEstado === 'Pendiente');
            const hayActa = programaciones.length > 0 && !pendiente;
            // El servidor exige el acta firmada para registrar la revisión técnico-jurídica.
            const sinFirma = hayActa && programaciones.some(p => p.actaFirmada === false);

            const complementaria = model.get('cDecisionTramite') === 'Visita complementaria';

            if (hayActa && !complementaria && !sinFirma) {
                etapa.actor = 'Inspector Ambiental';
                etapa.accion = 'Hacer la revisión técnico-jurídica del acta y definir el trámite';
                etapa.mio = puedeRevisar(view);
            } else {
                const quien = pendiente && pendiente.responsableName ? pendiente.responsableName : responsable;

                etapa.actor = quien;
                etapa.accion = sinFirma && !complementaria
                    ? 'Adjuntar el acta de visita firmada'
                    : !programaciones.length || (hayActa && complementaria)
                    ? (complementaria ? 'Programar la visita complementaria' : 'Programar la visita')
                    : 'Realizar la visita y adjuntar el acta';
                etapa.mio = !admin && (pendiente ? !!pendiente.esResponsable : esResponsable);
            }
        } else if (['Pendiente de respuesta final', 'Remitido por competencia'].includes(status)) {
            etapa.actor = responsable;
            etapa.accion = 'Completar el cierre de la solicitud';
            etapa.mio = esResponsable;
        } else if (['Finalizado', 'Proceso cerrado'].includes(status)) {
            etapa.accion = 'Ninguna: la solicitud está cerrada';
            etapa.actor = 'Sin acciones pendientes';
        }

        return etapa;
    };

    // Siguientes pasos del responsable asignado (cualquier rol), según lo que la solicitud ya
    // tiene registrado: programación, acta y evaluación de resultado; luego decide el Director Técnico.
    const getPasosResponsable = function (view) {
        const visitas = view._crmVisitasGuia;

        if (!visitas) {
            return null;
        }

        const programaciones = (visitas.programaciones || []).filter(p => p.estado !== 'Cancelada');
        const pendiente = programaciones.find(p => !p.actaId || p.actaEstado === 'Pendiente');
        const complementaria = view.model.get('cDecisionTramite') === 'Visita complementaria' && !pendiente;
        const pasos = [
            {label: 'Programar la visita', ok: programaciones.length > 0 && !complementaria},
            {label: 'Adjuntar el acta de visita', ok: programaciones.length > 0 && !pendiente && !complementaria},
            {label: 'Revisión técnico-jurídica (Inspector Ambiental)', ok: false},
        ];
        const actual = pasos.findIndex(p => !p.ok);
        const textos = [
            [complementaria ? 'Programe la visita complementaria' : 'Programe la visita', 'En el panel Visitas seleccione «Programar visita». El formulario ya trae el nombre, la intervención técnica y el responsable: confirme la fecha y la hora, o asigne la visita a otra persona.'],
            pendiente && pendiente.actaId
                ? ['Complete el acta de visita', 'En el panel Visitas, en ' + pendiente.name + ', seleccione «Completar acta de visita» y registre los hallazgos.']
                : ['Realice la visita y adjunte el acta', 'En el panel Visitas, en ' + (pendiente ? pendiente.name : 'la visita programada') + ', descargue el acta en blanco para llevarla a campo y, después de la visita, seleccione «Adjuntar acta de visita». El formulario trae los datos de la solicitud y de la visita.'],
            ['Espere la revisión técnico-jurídica', 'El Inspector Ambiental revisa los hallazgos del acta y define si hace falta otra visita o si con esta se cierra. Si pide otra visita, prográmela desde el panel Visitas.'],
        ];

        return {
            role: 'responsable',
            eyebrow: 'Siguientes pasos · Gestión técnica',
            icon: 'fas fa-list-check',
            title: textos[actual][0],
            text: textos[actual][1],
            pasos: pasos.map((p, i) => ({label: p.label, ok: p.ok, actual: i === actual})),
        };
    };

    // Quien recibió una visita delegada (p. ej. el técnico) ve qué le falta de esa visita.
    const getVisitaDelegada = function (view) {
        const programacion = ((view._crmVisitasGuia || {}).programaciones || [])
            .find(p => p.esResponsable && p.puedeAdjuntar && (!p.actaId || p.actaEstado === 'Pendiente'));

        if (!programacion) {
            return null;
        }

        return {
            role: 'responsable',
            eyebrow: 'Siguientes pasos · Visita delegada',
            icon: 'fas fa-list-check',
            title: 'Realice la visita ' + programacion.name + ' y adjunte el acta',
            text: programacion.actaId
                ? 'En el panel Visitas seleccione «Completar acta de visita» y registre los hallazgos.'
                : 'En el panel Visitas descargue el acta en blanco para llevarla a campo y, después de la visita, seleccione «Adjuntar acta de visita». El formulario trae los datos de la solicitud y de la visita.',
        };
    };

    const cargarVisitas = function (view) {
        if (view._crmVisitasGuiaCargando || view._crmVisitasGuiaError || view._crmGuidanceRemoved) {
            return;
        }

        view._crmVisitasGuiaCargando = true;

        Espo.Ajax.getRequest('Case/action/visitas', {id: view.model.id})
            .then(visitas => {
                if (view._crmGuidanceRemoved) {
                    return;
                }
                view._crmVisitasGuia = visitas;
                view._crmVisitasFirma = JSON.stringify([view.model.get('status'), visitas.programaciones]);
                render(view);
            })
            .catch(() => {
                view._crmVisitasGuiaError = true;
                if (!view._crmGuidanceRemoved) {
                    render(view);
                }
            })
            .finally(() => {
                view._crmVisitasGuiaCargando = false;
            });
    };

    const getGuidanceRol = function (view) {
        if (!view || !view.model || view.model.isNew()) {
            return null;
        }

        const user = view.getUser();
        const isRadicado = RadicacionFields.isCaseRadicado(view.model);
        const isAssigned = Boolean(view.model.get('assignedUserId'));

        if (RadicacionFields.isAdminUser(user)) {
            return {
                role: 'gestion',
                eyebrow: 'Acción requerida · Gestión del caso',
                title: 'Administre el caso y controle su trazabilidad',
                text: 'Puede corregir o actualizar cualquier dato del caso. Verifique la información, el término de respuesta y la etapa actual; toda modificación queda registrada en la Historia.',
            };
        }

        if (enRevision(view) && puedeRevisar(view)) {
            return {
                role: 'inspeccion',
                eyebrow: 'Siguientes pasos · Revisión técnico-jurídica',
                icon: 'fas fa-scale-balanced',
                title: 'Haga la revisión técnico-jurídica del acta',
                text: 'En el panel «Revisión técnico-jurídica» revise los hallazgos del acta y defina el trámite: visita complementaria, cierre de la atención, remisión por competencia o apertura de actuación.',
            };
        }

        if (enVisita(view) && view.model.get('assignedUserId') === user.id) {
            return getPasosResponsable(view);
        }

        if (!RadicacionFields.isAdminUser(user) && view.model.get('assignedUserId') === user.id) {
            const status = view.model.get('status');

            if (['Pendiente de respuesta final', 'Remitido por competencia'].includes(status)) {
                return {
                    role: 'responsable',
                    eyebrow: 'Siguientes pasos · Cierre',
                    icon: 'fas fa-list-check',
                    title: 'Complete el cierre de la solicitud',
                    text: 'En el panel lateral revise los requisitos del cierre, cargue lo que falte y seleccione «Finalizar caso» cuando todos estén completos.',
                };
            }

            if (['Finalizado', 'Proceso cerrado'].includes(status)) {
                return {
                    role: 'responsable',
                    eyebrow: 'Solicitud cerrada',
                    icon: 'fas fa-lock',
                    title: 'No hay pasos pendientes',
                    text: 'La solicitud está cerrada: puede consultarla, pero ya no admite nuevos registros.',
                };
            }
        }

        const delegada = enVisita(view) ? getVisitaDelegada(view) : null;

        if (delegada) {
            return delegada;
        }

        if (RadicacionFields.isRadicacionUser(user)) {
            return {
                role: 'radicacion',
                eyebrow: 'Acción requerida · Radicación',
                icon: 'fas fa-pen-to-square',
                title: isRadicado
                    ? 'Revise y, si procede, corrija la radicación'
                    : 'Formalice la radicación de la solicitud',
                text: isRadicado
                    ? 'Para modificar un campo autorizado, ubique el cursor sobre él hasta que aparezca el ícono de lápiz. Haga clic, realice la corrección y seleccione Guardar. Toda modificación queda registrada en la Historia.'
                    : 'Verifique la información. Para diligenciar un campo autorizado, ubique el cursor sobre él hasta que aparezca el ícono de lápiz; haga clic, registre el dato y seleccione Guardar.',
            };
        }

        if (RadicacionFields.isAsignadorUser(user)) {
            return {
                role: 'asignacion',
                eyebrow: 'Acción requerida · Asignación',
                title: isAssigned
                    ? 'Verifique la asignación vigente'
                    : 'Asigne el caso al patrullero competente',
                text: isAssigned
                    ? 'Confirme que el responsable asignado conserva competencia y capacidad para continuar la gestión en campo.'
                    : 'Revise el radicado, el asunto y la ubicación antes de asignar el responsable de la gestión en campo.',
            };
        }

        if (RadicacionFields.isPatrulleroUser(user)) {
            return {
                role: 'patrullaje',
                eyebrow: 'Acción requerida · Gestión en campo',
                title: 'Realice y registre la visita',
                text: 'Consulte los datos del caso, practique la visita cuando corresponda y registre el acta con sus hallazgos.',
            };
        }

        if (RadicacionFields.isJuridicaUser(user)) {
            return {
                role: 'juridica',
                eyebrow: 'Acción requerida · Valoración jurídica',
                title: 'Defina la ruta jurídica aplicable',
                text: 'Valore la competencia y los hechos. Si corresponde, vincule el expediente y defina la actuación administrativa o el Proceso Único de Policía.',
            };
        }

        if (RadicacionFields.isInspeccionUser(user)) {
            return {
                role: 'inspeccion',
                eyebrow: 'Acción requerida · Inspección',
                title: 'Verifique la recepción y el trámite inicial',
                text: 'Confirme la información recibida, la clase de escrito y el régimen de respuesta antes de continuar con la gestión del caso.',
            };
        }

        return null;
    };

    // Banner de seguimiento para quien no tiene una acción propia en esta etapa.
    const getSeguimiento = function (view, etapa) {
        if (!etapa.estado) {
            return null;
        }

        return {
            role: 'seguimiento',
            eyebrow: 'Seguimiento · ' + etapa.estado,
            icon: 'fas fa-route',
            title: etapa.actor ? 'Siguiente acción: ' + etapa.accion : etapa.accion,
            text: etapa.actor
                ? 'Le corresponde a ' + etapa.actor + '. Usted puede consultar la solicitud y su historia.'
                : 'Puede consultar la solicitud y su historia.',
        };
    };

    const getGuidance = function (view) {
        if (!view || !view.model || view.model.isNew()) {
            return null;
        }

        const etapa = getEtapa(view);
        // La etapa manda: un rol que consulta su historial no debe recibir instrucciones
        // para radicar, asignar o visitar cuando el siguiente paso le toca a otra persona.
        const guidance = (etapa.mio ? getGuidanceRol(view) : null) || getSeguimiento(view, etapa);

        if (guidance) {
            guidance.etapa = etapa;
        }

        return guidance;
    };

    const etapaHtml = function (etapa) {
        if (!etapa || !etapa.estado) {
            return '';
        }

        return '<dl class="crm-case-role-guidance__etapa">'
            + '<div><dt>Etapa actual</dt><dd>' + escapeHtml(etapa.estado) + '</dd></div>'
            + '<div><dt>Siguiente acción</dt><dd>' + escapeHtml(etapa.accion) + '</dd></div>'
            + '<div><dt>A cargo de</dt><dd>' + escapeHtml(etapa.actor)
            + (etapa.mio ? ' (usted)' : '') + '</dd></div></dl>';
    };

    const render = function (view) {
        if (!view || !view.$el || view._crmGuidanceRemoved) {
            return;
        }

        view.$el.filter('.crm-case-role-guidance').add(view.$el.find('.crm-case-role-guidance')).remove();

        if (!view.model.isNew() && estadoVisita(view) && !view._crmVisitasGuia) {
            cargarVisitas(view);
        }

        const guidance = getGuidance(view);

        if (!guidance) {
            return;
        }

        const $grid = view.$el.filter('.record-grid').add(view.$el.find('.record-grid')).first();

        if (!$grid.length) {
            return;
        }

        $grid.before(
            '<aside class="crm-case-role-guidance crm-case-role-guidance--' + guidance.role + '" role="status">'
            + '<span class="crm-case-role-guidance__icon ' + (guidance.icon || 'fas fa-circle-check') + '" aria-hidden="true"></span>'
            + '<div class="crm-case-role-guidance__content"><span class="crm-case-role-guidance__eyebrow">' + escapeHtml(guidance.eyebrow) + '</span>'
            + '<strong>' + escapeHtml(guidance.title) + '</strong><p>' + escapeHtml(guidance.text) + '</p>'
            + etapaHtml(guidance.etapa)
            + (guidance.pasos
                ? '<ol class="crm-case-role-guidance__pasos">' + guidance.pasos.map(p => '<li class="'
                    + (p.ok ? 'is-done' : (p.actual ? 'is-current' : '')) + '">' + escapeHtml(p.label) + '</li>').join('') + '</ol>'
                : '')
            + '</div>'
            + '</aside>'
        );
    };

    const schedule = function (view) {
        [0, 180, 700, 1600].forEach(delay => window.setTimeout(() => render(view), delay));
    };

    // Sin recargar la página: si otra persona programa, adjunta o revisa algo, la solicitud se
    // actualiza sola (y con ella el banner y la revisión técnico-jurídica).
    const vigilarCambios = function (view) {
        const revisar = function () {
            if (document.hidden || !view.model.id || view._crmVigilando || view.mode === 'edit') {
                return;
            }

            view._crmVigilando = true;

            Promise.all([
                Espo.Ajax.getRequest('Case/action/visitas', {id: view.model.id}),
                Espo.Ajax.getRequest('Case/' + view.model.id, {select: 'status,cDecisionTramite,expedienteId,assignedUserId,assignedUserName,cCompetenciaConfirmada'}),
            ]).then(([visitas, caso]) => {
                const firma = JSON.stringify([caso.status, visitas.programaciones]);
                const cambio = caso.status !== view.model.get('status')
                    || (caso.assignedUserId || null) !== (view.model.get('assignedUserId') || null)
                    || (caso.assignedUserName || null) !== (view.model.get('assignedUserName') || null)
                    || caso.cCompetenciaConfirmada !== view.model.get('cCompetenciaConfirmada')
                    || (caso.cDecisionTramite || null) !== (view.model.get('cDecisionTramite') || null)
                    || (view._crmVisitasFirma && view._crmVisitasFirma !== firma);

                if (cambio) {
                    view.model.fetch();
                }
            }).catch(() => {}).finally(() => {
                view._crmVigilando = false;
            });
        };
        const timer = window.setInterval(revisar, 20000);

        document.addEventListener('visibilitychange', revisar);
        view.once('remove', () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', revisar);
        });
    };

    const setup = function (view) {
        view.once('remove', () => { view._crmGuidanceRemoved = true; });
        vigilarCambios(view);
        RadicacionFields.ensureProfile(view.getUser()).then(profile => {
            view._crmRoles = (profile && profile.roles) || [];
            render(view);
        }).catch(() => {});
        RadicacionFields.onProfileReady(() => schedule(view));
        view.listenTo(view.model, 'change:status change:cNumeroRadicado change:cExpediente change:assignedUserId change:assignedUserName change:cDecisionTramite change:cCompetenciaConfirmada change:expedienteId', () => render(view));
        // Programar la visita o adjuntar el acta recarga la solicitud: los pasos se recalculan.
        view.listenTo(view.model, 'sync', () => {
            view._crmVisitasGuia = null;
            view._crmVisitasGuiaError = false;
            render(view);
        });
    };

    return {setup: setup, schedule: schedule};
});
