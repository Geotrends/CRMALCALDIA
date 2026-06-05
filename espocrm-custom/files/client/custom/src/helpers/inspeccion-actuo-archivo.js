define('custom:helpers/inspeccion-actuo-archivo', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const shouldShowActuoArchivoButton = function (user, model) {
        if (!RadicacionFields.isInspeccionUser(user) || !model) {
            return false;
        }

        return model.get('status') === 'Finalizado';
    };

    const getUnavailableReason = function (user, model) {
        if (!RadicacionFields.isInspeccionUser(user)) {
            return 'Disponible solo para el rol Inspección.';
        }

        if (!model || model.get('status') !== 'Finalizado') {
            return 'Disponible cuando el caso esté en estado Finalizado.';
        }

        return '';
    };

    return {
        shouldShowActuoArchivoButton: shouldShowActuoArchivoButton,
        getUnavailableReason: getUnavailableReason,
    };
});
