define('custom:helpers/actuo-archivo-case-status', [], function () {

    const CONTENT_FIELDS = [
        'referencia',
        'motivoArchivo',
    ];

    const hasText = function (value) {
        return String(value || '').trim() !== '';
    };

    const isActuoDiligenciado = function (actuo) {
        if (!actuo) {
            return false;
        }

        const estado = String(actuo.estado || actuo.get?.('estado') || '').trim();

        if (estado === 'Diligenciada') {
            return true;
        }

        const get = function (field) {
            if (typeof actuo.get === 'function') {
                return actuo.get(field);
            }

            return actuo[field];
        };

        return CONTENT_FIELDS.every((field) => hasText(get(field)));
    };

    const pickActuo = function (list) {
        if (!list || !list.length) {
            return null;
        }

        for (let i = 0; i < list.length; i++) {
            if (isActuoDiligenciado(list[i])) {
                return list[i];
            }
        }

        return list[0];
    };

    const isFormatoActuoHabilitado = function (actuo) {
        return isActuoDiligenciado(actuo);
    };

    const ACTUO_SELECT = [
        'id',
        'estado',
        'referencia',
        'motivoArchivo',
        'cFormatoActuoArchivoPdfId',
        'modifiedAt',
    ].join(',');

    const fetchActuoForCase = function (caseId) {
        if (!caseId) {
            return Promise.resolve(null);
        }

        return Espo.Ajax.getRequest('Case/' + encodeURIComponent(caseId) + '/actuosArchivo', {
            select: ACTUO_SELECT,
            orderBy: 'modifiedAt',
            order: 'desc',
            maxSize: 10,
        }).then(function (response) {
            return pickActuo(response.list || []);
        }).catch(function () {
            return Espo.Ajax.getRequest('ActuoArchivo', {
                where: [
                    {
                        type: 'equals',
                        attribute: 'caseId',
                        value: caseId,
                    },
                ],
                select: ACTUO_SELECT,
                orderBy: 'modifiedAt',
                order: 'desc',
                maxSize: 10,
            }).then(function (response) {
                return pickActuo(response.list || []);
            });
        });
    };

    return {
        CONTENT_FIELDS: CONTENT_FIELDS,
        isActuoDiligenciado: isActuoDiligenciado,
        isFormatoActuoHabilitado: isFormatoActuoHabilitado,
        fetchActuoForCase: fetchActuoForCase,
    };
});
