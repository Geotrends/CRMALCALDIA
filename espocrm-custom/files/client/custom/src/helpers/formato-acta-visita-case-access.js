define('custom:helpers/formato-acta-visita-case-access', [
    'custom:helpers/patrullero-acta',
], function (PatrulleroActa) {

    const canDownloadFormatoActaVisitaFromCase = function (user, model) {
        if (!user || !model) {
            return false;
        }

        return PatrulleroActa.canPrintManualActa(user, model);
    };

    return {
        canDownloadFormatoActaVisitaFromCase: canDownloadFormatoActaVisitaFromCase,
    };
});
