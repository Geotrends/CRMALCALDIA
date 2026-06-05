define('custom:helpers/acta-visita-case-status', [], function () {

    const CONTENT_FIELDS = [
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
    ];

    const hasText = function (value) {
        return String(value || '').trim() !== '';
    };

    const isActaDiligenciada = function (acta) {
        if (!acta) {
            return false;
        }

        const estado = String(acta.estado || acta.get?.('estado') || '').trim();

        if (estado === 'Diligenciada' || estado === 'Aprobada') {
            return true;
        }

        const get = function (field) {
            if (typeof acta.get === 'function') {
                return acta.get(field);
            }

            return acta[field];
        };

        if (CONTENT_FIELDS.some((field) => hasText(get(field)))) {
            return true;
        }

        return !!get('id');
    };

    const pickActa = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            if (isActaDiligenciada(list[i])) {
                return list[i];
            }
        }

        return list[0];
    };

    const isFormatoActaHabilitado = function (acta) {
        return isActaDiligenciada(acta);
    };

    const ACTA_SELECT = [
        'id',
        'estado',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
        'cFormatoActaVisitaPdfId',
        'modifiedAt',
    ].join(',');

    const fetchActaForCase = function (caseId) {
        if (!caseId) {
            return Promise.resolve(null);
        }

        return Espo.Ajax.getRequest('Case/' + encodeURIComponent(caseId) + '/actasVisita', {
            select: ACTA_SELECT,
            orderBy: 'modifiedAt',
            order: 'desc',
            maxSize: 10,
        }).then(function (response) {
            return pickActa(response.list || []);
        }).catch(function () {
            return Espo.Ajax.getRequest('ActaVisita', {
                where: [
                    {
                        type: 'equals',
                        attribute: 'caseId',
                        value: caseId,
                    },
                ],
                select: ACTA_SELECT,
                orderBy: 'modifiedAt',
                order: 'desc',
                maxSize: 10,
            }).then(function (response) {
                return pickActa(response.list || []);
            });
        });
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActaDiligenciada: isActaDiligenciada,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
        fetchActaForCase: fetchActaForCase,
    };
});
