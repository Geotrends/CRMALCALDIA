define('custom:helpers/acta-visita-from-case', [], function () {

    const AUTO_READONLY_FIELDS = [
        'case',
        'numeroRadicado',
        'expediente',
        'name',
        'anio',
        'estado',
    ];

    const buildDefaultsFromCase = function (caseModel, user) {
        const radicado = String(caseModel.get('cNumeroRadicado') || '').trim();
        const expediente = String(caseModel.get('cExpediente') || '').trim();
        const now = new Date();

        const nameParts = ['Acta visita'];

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
            expediente: expediente,
            name: nameParts.join(' — '),
            anio: now.getFullYear(),
            fechaVisita: now.toISOString().slice(0, 10),
            estado: 'Pendiente',
            autorizacionDatos: false,
            assignedUserId: caseModel.get('assignedUserId') || (user ? user.id : null),
            assignedUserName: caseModel.get('assignedUserName') || (user ? user.get('name') : null),
            direccionAfectacion: caseModel.get('cDireccion') || '',
            telefono: caseModel.get('cTelefono') || '',
            barrio: caseModel.get('cBarrio') || '',
            posibleAfectante: caseModel.get('cPerjudicante') || caseModel.get('cPeticionario') || '',
            funcionarioNombre: user ? user.get('name') : '',
        };
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
        lockAutoFields: lockAutoFields,
    };
});
