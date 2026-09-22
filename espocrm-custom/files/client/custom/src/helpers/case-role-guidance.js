define('custom:helpers/case-role-guidance', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

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
            + '<strong>' + guidance.title + '</strong><p>' + guidance.text + '</p></div>'
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
    };

    return {setup: setup, schedule: schedule};
});
