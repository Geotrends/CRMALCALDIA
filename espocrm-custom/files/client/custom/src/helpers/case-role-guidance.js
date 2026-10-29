define('custom:helpers/case-role-guidance', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const ESTADOS_VISITA = ['Asignado', 'En gestión técnica', 'Revisión de hallazgos'];

    const escapeHtml = function (value) {
        return $('<span>').text(value || '').html();
    };

    const enVisita = function (view) {
        return !RadicacionFields.isAdminUser(view.getUser()) && ESTADOS_VISITA.includes(view.model.get('status'));
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
        const pasos = [
            {label: 'Programar la visita', ok: programaciones.length > 0},
            {label: 'Adjuntar el acta de visita', ok: programaciones.length > 0 && !pendiente},
            {label: 'Registrar la evaluación de resultado', ok: !!visitas.tieneEvaluacion},
            {label: 'Definición del trámite (Director Técnico)', ok: false},
        ];
        const actual = pasos.findIndex(p => !p.ok);
        const textos = [
            ['Programe la visita', 'En el panel Visitas seleccione «Programar visita». El formulario ya trae el nombre, la intervención técnica y el responsable: confirme la fecha y la hora, o asigne la visita a otra persona.'],
            pendiente && pendiente.actaId
                ? ['Complete el acta de visita', 'En el panel Visitas, en ' + pendiente.name + ', seleccione «Completar acta de visita» y registre los hallazgos.']
                : ['Realice la visita y adjunte el acta', 'En el panel Visitas, en ' + (pendiente ? pendiente.name : 'la visita programada') + ', descargue el acta en blanco para llevarla a campo y, después de la visita, seleccione «Adjuntar acta de visita». El formulario trae los datos de la solicitud y de la visita.'],
            ['Registre la evaluación de resultado', 'Con el acta adjunta, registre la evaluación de resultado de la visita en el menú Evaluaciones de resultado. Es requisito para definir el trámite.'],
            ['Hallazgos en revisión', 'El Director Técnico revisa los hallazgos y define el trámite. Si hace falta otra visita, prográmela desde el panel Visitas.'],
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
        if (view._crmVisitasGuiaCargando) {
            return;
        }

        view._crmVisitasGuiaCargando = true;

        Espo.Ajax.getRequest('Case/action/visitas', {id: view.model.id})
            .then(visitas => {
                view._crmVisitasGuia = visitas;
                render(view);
            })
            .catch(() => {})
            .finally(() => {
                view._crmVisitasGuiaCargando = false;
            });
    };

    const getGuidance = function (view) {
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

    const render = function (view) {
        if (!view || !view.$el) {
            return;
        }

        view.$el.filter('.crm-case-role-guidance').add(view.$el.find('.crm-case-role-guidance')).remove();

        if (!view.model.isNew() && enVisita(view) && !view._crmVisitasGuia) {
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
            + '<div><span class="crm-case-role-guidance__eyebrow">' + guidance.eyebrow + '</span>'
            + '<strong>' + guidance.title + '</strong><p>' + escapeHtml(guidance.text) + '</p>'
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

    const setup = function (view) {
        RadicacionFields.ensureProfile(view.getUser());
        RadicacionFields.onProfileReady(() => schedule(view));
        view.listenTo(view.model, 'change:status change:cNumeroRadicado change:cExpediente change:assignedUserId', () => render(view));
        // Programar la visita o adjuntar el acta recarga la solicitud: los pasos se recalculan.
        view.listenTo(view.model, 'sync', () => {
            view._crmVisitasGuia = null;
            render(view);
        });
    };

    return {setup: setup, schedule: schedule};
});
