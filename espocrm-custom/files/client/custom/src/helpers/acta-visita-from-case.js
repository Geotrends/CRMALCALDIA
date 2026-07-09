define('custom:helpers/acta-visita-from-case', ['custom:helpers/case-party-name'], function (CasePartyName) {

    const AUTO_READONLY_FIELDS = [
        'case',
        'numeroRadicado',
        'expediente',
        'name',
        'fecha',
        'estado',
    ];

    const buildDefaultsFromCase = function (caseModel, user, visitNumber) {
        const radicado = String(caseModel.get('cNumeroRadicado') || '').trim();
        const expediente = String(caseModel.get('cExpediente') || '').trim();
        const now = new Date();
        const visitNum = parseInt(visitNumber, 10) || 1;

        const nameParts = ['Acta visita'];

        if (radicado) {
            nameParts.push('Rad. ' + radicado);
        }

        if (expediente) {
            nameParts.push('Exp. ' + expediente);
        }

        if (visitNum > 1) {
            nameParts.push('Visita ' + visitNum);
        }

        const perjudicante = CasePartyName.perjudicanteFromModel(caseModel);
        const peticionario = CasePartyName.peticionarioFromModel(caseModel);
        const caseReference = radicado || peticionario || caseModel.get('name');

        return {
            caseId: caseModel.id,
            caseName: caseReference,
            numeroRadicado: radicado,
            expediente: expediente,
            name: nameParts.join(' — '),
            numeroVisita: visitNum,
            fecha: now.toISOString().slice(0, 10),
            fechaVisita: now.toISOString().slice(0, 10),
            estado: 'Pendiente',
            modoDiligenciamiento: 'Digital',
            autorizacionDatos: false,
            direccionAfectacion: caseModel.get('cDireccionPeticionario') || '',
            telefono: caseModel.get('cTelefonoPeticionario') || '',
            barrio: caseModel.get('cBarrioPeticionario') || '',
            posibleAfectante: perjudicante || peticionario || '',
            funcionarioNombre: user ? user.get('name') : '',
        };
    };

    const buildName = function (model) {
        const parts = ['Acta visita'];
        const radicado = String(model.get('numeroRadicado') || '').trim();
        const expediente = String(model.get('expediente') || '').trim();

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
