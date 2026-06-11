define('custom:helpers/actuo-archivo-from-case', [], function () {

    const AUTO_READONLY_FIELDS = [
        'case',
        'numeroRadicado',
        'consecutivoInterno',
        'name',
        'estado',
    ];

    const buildReferencia = function (caseModel) {
        const parts = [];

        const tipo = String(caseModel.get('cRecursoTema') || '').trim();

        if (tipo) {
            parts.push(tipo);
        }

        if (parts.length) {
            return parts.join(' — ');
        }

        return String(caseModel.get('description') || '').trim();
    };

    const buildDefaultsFromCase = function (caseModel, user) {
        const radicado = String(caseModel.get('cNumeroRadicado') || '').trim();
        const expediente = String(caseModel.get('cExpediente') || '').trim();
        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        const nameParts = ['Auto de archivo'];

        if (radicado) {
            nameParts.push('Rad. ' + radicado);
        }

        if (expediente) {
            nameParts.push('Exp. ' + expediente);
        }

        return {
            caseId: caseModel.id,
            caseName: caseModel.get('name'),
            numeroRadicado: radicado,
            consecutivoInterno: expediente,
            name: nameParts.join(' — '),
            fechaAuto: today,
            fechaDada: today,
            estado: 'Pendiente',
            referencia: buildReferencia(caseModel),
            inspectorId: user ? user.id : null,
            inspectorName: user ? user.get('name') : '',
            inspectorCargo: 'Inspector de Policía para Asuntos Ambientales',
        };
    };

    const buildName = function (model) {
        const parts = ['Auto de archivo'];
        const radicado = String(model.get('numeroRadicado') || '').trim();
        const expediente = String(model.get('consecutivoInterno') || '').trim();

        if (radicado) {
            parts.push('Rad. ' + radicado);
        }

        if (expediente) {
            parts.push('Exp. ' + expediente);
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
