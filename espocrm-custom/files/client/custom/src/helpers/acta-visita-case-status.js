define('custom:helpers/acta-visita-case-status', [
    'custom:helpers/silent-ajax',
    'custom:helpers/formato-acta-visita-case-access',
    'custom:helpers/patrullero-acta',
], function (SilentAjax, FormatoActaVisitaCaseAccess, PatrulleroActa) {

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

        return hasText(get('cFormatoActaVisitaPdfId'));
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

    const canFetchActaForCase = function (user, model) {
        if (!user || !model || !model.id) {
            return false;
        }

        if (user.isAdmin()) {
            return true;
        }

        if (FormatoActaVisitaCaseAccess.canDownloadFormatoActaVisitaFromCase(user, model)) {
            return true;
        }

        return PatrulleroActa.shouldShowLlenarActaButton(user, model);
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

    const fetchActaDirect = function (caseId) {
        return SilentAjax.getRequest('ActaVisita', {
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
            if (!response) {
                return null;
            }

            return pickActa(response.list || []);
        });
    };

    const fetchActaForCase = function (caseId, user, model) {
        if (!caseId || !canFetchActaForCase(user, model)) {
            return Promise.resolve(null);
        }

        return fetchActaDirect(caseId);
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActaDiligenciada: isActaDiligenciada,
        isFormatoActaHabilitado: isFormatoActaHabilitado,
        canFetchActaForCase: canFetchActaForCase,
        fetchActaForCase: fetchActaForCase,
    };
});
