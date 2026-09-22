define('custom:helpers/auto-inicio-from-case', [], function () {

    const AUTO_READONLY_FIELDS = [
        'case',
        'expediente',
        'numeroRadicado',
        'consecutivoInterno',
        'name',
        'estado',
    ];

    const buildReferencia = function (caseModel) {
        const parts = [];

        const tema = String(caseModel.get('cRecursoTema') || '').trim();
        const asunto = String(caseModel.get('cAsunto') || '').trim();

        if (tema && tema !== 'Seleccione una opción') {
            parts.push(tema);
        }

        if (asunto && asunto !== 'Seleccione una opción') {
            parts.push(asunto);
        }

        if (parts.length) {
            return parts.join(' — ');
        }

        return String(caseModel.get('description') || '').trim();
    };

    const buildDefaultsFromCase = function (caseModel, user) {
        const radicado = String(caseModel.get('cNumeroRadicado') || '').trim();
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        const nameParts = ['Auto de inicio'];

        if (radicado) {
            nameParts.push('Rad. ' + radicado);
        }

        return {
            caseId: caseModel.id,
            caseName: caseModel.get('name'),
            numeroRadicado: radicado,
            name: nameParts.join(' — '),
            fechaAuto: today,
            fechaDada: today,
            estado: 'Pendiente',
            referencia: buildReferencia(caseModel),
            inspectorId: user ? user.id : null,
            inspectorName: user ? user.get('name') : '',
            inspectorCargo: 'Profesional Universitario - Área Jurídica',
        };
    };

    const buildName = function (model) {
        const parts = ['Auto de inicio'];
        const radicado = String(model.get('numeroRadicado') || '').trim();

        if (radicado) {
            parts.push('Rad. ' + radicado);
        }

        if (parts.length === 1 && model.get('caseId')) {
            parts.push(model.get('caseId'));
        }

        return parts.join(' — ');
    };

    const ensureNameBeforeSave = function (model, user) {
        if (!model) {
            return;
        }

        if (user && !model.get('assignedUserId')) {
            model.set({
                assignedUserId: user.id,
                assignedUserName: user.get('name'),
            });
        }

        if (!String(model.get('name') || '').trim()) {
            model.set('name', buildName(model));
        }
    };

    const lockAutoFields = function (recordView) {
        AUTO_READONLY_FIELDS.forEach((field) => {
            const view = recordView.getFieldView(field);

            if (view && typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        });
    };

    return {
        AUTO_READONLY_FIELDS: AUTO_READONLY_FIELDS,
        buildDefaultsFromCase: buildDefaultsFromCase,
        buildName: buildName,
        ensureNameBeforeSave: ensureNameBeforeSave,
        lockAutoFields: lockAutoFields,
    };
});
