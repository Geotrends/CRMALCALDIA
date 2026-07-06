define('custom:helpers/case-documentos', [
    'custom:helpers/formato-solicitud-access',
    'custom:helpers/formato-acta-visita-case-access',
    'custom:helpers/formato-actuo-archivo-case-access',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/actuo-archivo-case-status',
], function (
    FormatoSolicitudAccess,
    FormatoActaVisitaCaseAccess,
    FormatoActuoArchivoCaseAccess,
    ActaVisitaCaseStatus,
    ActuoArchivoCaseStatus
) {

    const getValue = function (entity, field) {
        if (!entity) {
            return '';
        }

        if (typeof entity.get === 'function') {
            return entity.get(field);
        }

        return entity[field];
    };

    const hasText = function (value) {
        return String(value || '').trim() !== '';
    };

    const buildEntryPointUrl = function (basePath, entryPoint, caseId, format, modo) {
        let url = basePath
            + '?entryPoint=' + encodeURIComponent(entryPoint)
            + '&id=' + encodeURIComponent(caseId)
            + '&format=' + encodeURIComponent(format || 'pdf');

        if (modo) {
            url += '&modo=' + encodeURIComponent(modo);
        }

        return url;
    };

    const canShowSolicitudDocument = function (user, model) {
        return !!user
            && !!model
            && FormatoSolicitudAccess.isFormatoSolicitudHabilitado(model);
    };

    const pushSolicitudDocument = function (docs, user, model, basePath, acta) {
        if (!canShowSolicitudDocument(user, model)) {
            return;
        }

        docs.push({
            key: 'solicitud',
            labelKey: 'formatoGeneradoSolicitud',
            name: model.get('cFormatoSolicitudPdfName') || 'FormatoSolicitud.pdf',
            url: buildEntryPointUrl(basePath, 'FormatoSolicitud', model.id, 'pdf'),
            icon: 'fas fa-file-pdf text-danger',
        });
    };

    const pushActaDocument = function (docs, user, model, basePath, acta) {
        if (!FormatoActaVisitaCaseAccess.canDownloadFormatoActaVisitaFromCase(user, model)
            || !ActaVisitaCaseStatus.isVisitaRealizadaForFormatos(model, acta)) {
            return;
        }

        const fileName = getValue(acta, 'cFormatoActaVisitaPdfName') || 'ActaVisita.pdf';

        docs.push({
            key: 'acta',
            labelKey: 'formatoGeneradoActa',
            name: fileName,
            url: buildEntryPointUrl(basePath, 'FormatoActaVisitaCaso', model.id, 'pdf'),
            icon: 'fas fa-file-pdf text-danger',
        });
    };

    const pushActuoDocument = function (docs, user, model, basePath, actuo) {
        if (!actuo
            || !FormatoActuoArchivoCaseAccess.canDownloadFormatoActuoArchivoFromCase(user, model)
            || !ActuoArchivoCaseStatus.isFormatoActuoHabilitado(actuo)) {
            return;
        }

        const fileName = getValue(actuo, 'cFormatoActuoArchivoPdfName') || 'AutoArchivo.pdf';

        docs.push({
            key: 'actuo',
            labelKey: 'formatoGeneradoActuo',
            name: fileName,
            url: buildEntryPointUrl(basePath, 'FormatoActuoArchivoCaso', model.id, 'pdf'),
            icon: 'fas fa-file-pdf text-danger',
        });
    };

    const pushActuoWordDocument = function (docs, user, model, basePath) {
        if (!FormatoActuoArchivoCaseAccess.canDownloadManualWordFromCase(user, model)) {
            return;
        }

        const radicado = String(getValue(model, 'cNumeroRadicado') || '').trim();
        const fileName = radicado
            ? 'AutoArchivo-' + radicado + '-editable.docx'
            : 'AutoArchivo-editable.docx';

        docs.push({
            key: 'actuo-word',
            labelKey: 'formatoGeneradoActuoWord',
            name: fileName,
            url: buildEntryPointUrl(basePath, 'FormatoActuoArchivoCaso', model.id, 'docx', 'manual'),
            icon: 'fas fa-file-word text-primary',
        });
    };

    const fetchDocumentos = function (model, user, basePath) {
        const docs = [];

        if (!model || !model.id) {
            return Promise.resolve(docs);
        }

        return Promise.all([
            ActaVisitaCaseStatus.fetchActaForCase(model.id, user, model),
            ActuoArchivoCaseStatus.fetchActuoForCase(model.id, user, model),
        ]).then(function (results) {
            const acta = results[0];
            const actuo = results[1];

            pushSolicitudDocument(docs, user, model, basePath, acta);
            pushActaDocument(docs, user, model, basePath, acta);
            pushActuoWordDocument(docs, user, model, basePath);
            pushActuoDocument(docs, user, model, basePath, actuo);

            return docs;
        }).catch(function () {
            return [];
        });
    };

    const hasVisibleDocumentos = function (model, user, basePath) {
        return fetchDocumentos(model, user, basePath || '').then(function (docs) {
            return docs.length > 0;
        });
    };

    return {
        fetchDocumentos: fetchDocumentos,
        hasVisibleDocumentos: hasVisibleDocumentos,
    };
});
