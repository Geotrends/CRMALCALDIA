define('custom:helpers/party-document-lookup', [
    'custom:helpers/persona-tipo-fields',
], function (PersonaTipoFields) {

    var DEBOUNCE_MS = 400;
    var MIN_DOCUMENT_LENGTH = 4;

    var runLookup = function (recordView, config, party) {
        var tipo = String(recordView.model.get(config.tipo) || '').trim();
        var $input = recordView.$el.find('[data-name="' + config.documento + '"] input, [data-name="' + config.documento + '"] textarea');
        var documento = String(
            ($input.length ? $input.val() : null) || recordView.model.get(config.documento) || ''
        ).trim();

        if (party === 'perjudicante' && !PersonaTipoFields.isInfractorKnown(tipo)) {
            return;
        }

        if (!PersonaTipoFields.isTipoSelected(tipo)) {
            Espo.Ui.notify(
                party === 'peticionario'
                    ? 'Seleccione primero el tipo de peticionario (persona natural o jurídica).'
                    : 'Seleccione primero el tipo de perjudicante (persona natural o jurídica).',
                'warning',
                3500
            );

            return;
        }

        if (documento.length < MIN_DOCUMENT_LENGTH) {
            return;
        }

        if (documento !== String(recordView.model.get(config.documento) || '').trim()) {
            recordView.model.set(config.documento, documento, {silent: true});
        }

        var key = party + '|' + tipo + '|' + documento;

        if (recordView._partyLookupCache && recordView._partyLookupCache[key]) {
            return;
        }

        if (!recordView._partyLookupRequests) {
            recordView._partyLookupRequests = {};
        }

        if (recordView._partyLookupRequests[party]) {
            var pending = recordView._partyLookupRequests[party];

            if (pending && typeof pending.abort === 'function') {
                pending.abort();
            }
        }

        var url = 'Case/action/buscarParte'
            + '?party=' + encodeURIComponent(party)
            + '&tipo=' + encodeURIComponent(tipo)
            + '&documento=' + encodeURIComponent(documento);

        recordView._partyLookupRequests[party] = Espo.Ajax.getRequest(url);

        recordView._partyLookupRequests[party].then(function (response) {
            recordView._partyLookupRequests[party] = null;

            if (!response || !response.found || !response.data) {
                if (recordView._partyLookupCache) {
                    delete recordView._partyLookupCache[key];
                }

                return;
            }

            if (!recordView._partyLookupCache) {
                recordView._partyLookupCache = {};
            }

            recordView._partyLookupCache[key] = true;
            recordView.model.set(response.data);
            Espo.Ui.warning(
                response.message || 'Ya existe este registro. Se cargaron los datos registrados.'
            );
        }).catch(function (xhr) {
            recordView._partyLookupRequests[party] = null;

            if (xhr && xhr.status === 403) {
                Espo.Ui.error('No tiene permiso para consultar personas registradas.');
            }
        });
    };

    var bindParty = function (recordView, config, party) {
        var timer = null;

        var schedule = function () {
            clearTimeout(timer);
            timer = setTimeout(function () {
                runLookup(recordView, config, party);
            }, DEBOUNCE_MS);
        };

        recordView.listenTo(recordView.model, 'change:' + config.documento, schedule);

        recordView.listenTo(recordView.model, 'change:' + config.tipo, function () {
            if (recordView._partyLookupCache) {
                Object.keys(recordView._partyLookupCache).forEach(function (cacheKey) {
                    if (cacheKey.indexOf(party + '|') === 0) {
                        delete recordView._partyLookupCache[cacheKey];
                    }
                });
            }

            schedule();
        });
    };

    var bindDom = function (recordView) {
        var handler = function (e) {
            var $field = $(e.currentTarget).closest('[data-name]');
            var fieldName = $field.attr('data-name');

            if (fieldName === PersonaTipoFields.PETICIONARIO.documento) {
                runLookup(recordView, PersonaTipoFields.PETICIONARIO, 'peticionario');
            }

            if (fieldName === PersonaTipoFields.PERJUDICANTE.documento) {
                runLookup(recordView, PersonaTipoFields.PERJUDICANTE, 'perjudicante');
            }
        };

        recordView.$el
            .off('blur.partyLookup change.partyLookup', '[data-name="cDocumentoPeticionario"] input, [data-name="cDocumentoPeticionario"] textarea')
            .off('blur.partyLookup change.partyLookup', '[data-name="cDocumentoPerjudicante"] input, [data-name="cDocumentoPerjudicante"] textarea')
            .on('blur.partyLookup change.partyLookup', '[data-name="cDocumentoPeticionario"] input, [data-name="cDocumentoPeticionario"] textarea', handler)
            .on('blur.partyLookup change.partyLookup', '[data-name="cDocumentoPerjudicante"] input, [data-name="cDocumentoPerjudicante"] textarea', handler);
    };

    var setup = function (recordView) {
        if (!recordView._partyLookupSetup) {
            recordView._partyLookupSetup = true;
            bindParty(recordView, PersonaTipoFields.PETICIONARIO, 'peticionario');
            bindParty(recordView, PersonaTipoFields.PERJUDICANTE, 'perjudicante');
        }
    };

    return {
        setup: setup,
        bindDom: bindDom,
        runLookup: runLookup,
    };
});
