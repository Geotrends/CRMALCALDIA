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

    const buildEntryPointUrl = function (basePath, entryPoint, caseId, options) {
        const opts = options || {};
        const format = opts.format || 'pdf';
        const modo = opts.modo || '';
        const inline = !!opts.inline;

        let url = basePath
            + '?entryPoint=' + encodeURIComponent(entryPoint)
            + '&id=' + encodeURIComponent(caseId)
            + '&format=' + encodeURIComponent(format);

        if (modo) {
            url += '&modo=' + encodeURIComponent(modo);
        }

        if (inline) {
            url += '&inline=1';
        }

        return url;
    };

    const buildDocumentEntry = function (config) {
        const downloadUrl = buildEntryPointUrl(config.basePath, config.entryPoint, config.caseId, {
            format: config.format || 'pdf',
            modo: config.modo || '',
            inline: false,
        });

        return {
            key: config.key,
            labelKey: config.labelKey,
            name: config.name,
            downloadUrl: downloadUrl,
            previewUrl: buildEntryPointUrl(config.basePath, config.entryPoint, config.caseId, {
                format: config.format || 'pdf',
                modo: config.modo || '',
                inline: true,
            }),
            icon: config.icon || 'fas fa-file-pdf text-danger',
        };
    };

    const canShowSolicitudDocument = function (user, model) {
        return !!user
            && !!model
            && FormatoSolicitudAccess.isFormatoSolicitudHabilitado(model);
    };

    const pushSolicitudDocument = function (docs, user, model, basePath) {
        if (!canShowSolicitudDocument(user, model)) {
            return;
        }

        docs.push(buildDocumentEntry({
            key: 'solicitud',
            labelKey: 'formatoGeneradoSolicitud',
            name: model.get('cFormatoSolicitudPdfName') || 'FormatoSolicitud.pdf',
            basePath: basePath,
            entryPoint: 'FormatoSolicitud',
            caseId: model.id,
        }));
    };

    const pushActaDocument = function (docs, user, model, basePath, acta) {
        if (!FormatoActaVisitaCaseAccess.canDownloadFormatoActaVisitaFromCase(user, model)
            || !ActaVisitaCaseStatus.isVisitaRealizadaForFormatos(model, acta)) {
            return;
        }

        const fileName = getValue(acta, 'cFormatoActaVisitaPdfName') || 'ActaVisita.pdf';

        docs.push(buildDocumentEntry({
            key: 'acta',
            labelKey: 'formatoGeneradoActa',
            name: fileName,
            basePath: basePath,
            entryPoint: 'FormatoActaVisitaCaso',
            caseId: model.id,
        }));
    };

    const pushActuoDocuments = function (docs, user, model, basePath, actuo) {
        if (!user || !model) {
            return;
        }

        const radicado = String(getValue(model, 'cNumeroRadicado') || '').trim();
        const status = String(getValue(model, 'status') || '').trim();
        const isFinalizado = status === 'Finalizado';

        if (isFinalizado
            && actuo
            && FormatoActuoArchivoCaseAccess.canDownloadFormatoActuoArchivoFromCase(user, model)
            && ActuoArchivoCaseStatus.isFormatoActuoHabilitado(actuo)) {
            const fileName = getValue(actuo, 'cFormatoActuoArchivoPdfName') || 'AutoArchivo.pdf';

            docs.push(buildDocumentEntry({
                key: 'actuo',
                labelKey: 'formatoGeneradoActuo',
                name: fileName,
                basePath: basePath,
                entryPoint: 'FormatoActuoArchivoCaso',
                caseId: model.id,
                modo: 'digital',
            }));

            return;
        }

        if (!FormatoActuoArchivoCaseAccess.isCaseReadyForActuo(model)) {
            return;
        }

        const fileName = radicado
            ? 'AutoArchivo-' + radicado + '.pdf'
            : 'AutoArchivo.pdf';

        docs.push(buildDocumentEntry({
            key: 'actuo-manual',
            labelKey: 'formatoGeneradoActuo',
            name: fileName,
            basePath: basePath,
            entryPoint: 'FormatoActuoArchivoCaso',
            caseId: model.id,
            modo: 'manual',
        }));
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

            pushSolicitudDocument(docs, user, model, basePath);
            pushActaDocument(docs, user, model, basePath, acta);
            pushActuoDocuments(docs, user, model, basePath, actuo);

            return docs;
        }).catch(function () {
            pushSolicitudDocument(docs, user, model, basePath);

            return docs;
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
