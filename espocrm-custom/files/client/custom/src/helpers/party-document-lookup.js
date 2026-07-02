define('custom:helpers/party-document-lookup', [
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/direccion-estructurada',
    'custom:helpers/safe-ui-promise',
], function (PersonaTipoFields, DireccionEstructurada, SafeUiPromise) {

    var DEBOUNCE_MS = 400;
    var MIN_DOCUMENT_LENGTH = 4;

    var PETICIONARIO_LINKED_FIELDS = [
        'cDocumentoPeticionario',
        'cNombrePeticionario',
        'cApellidoPeticionario',
        'cViaPrincipalPeticionario',
        'cNumViaPrincipalPeticionario',
        'cLetraViaPrincipalPeticionario',
        'cCuadranteViaPrincipalPeticionario',
        'cGeneradoraPeticionario',
        'cLetraGeneradoraPeticionario',
        'cCuadranteGeneradoraPeticionario',
        'cPlacaPeticionario',
        'cBloquePeticionario',
        'cInteriorPeticionario',
        'cDireccionPeticionario',
        'cTelefonoPeticionario',
        'cBarrioPeticionario',
        'cCorreoPeticionario',
        'cCanalDeReportePeticionario',
        'cMunicipioPeticionario',
        'cZonaAlcaldiaPeticionario',
    ];

    var PERJUDICANTE_LINKED_FIELDS = PersonaTipoFields.INFRACTOR_DETAIL_FIELDS.slice();

    var getLinkedFields = function (party) {
        return party === 'peticionario' ? PETICIONARIO_LINKED_FIELDS : PERJUDICANTE_LINKED_FIELDS;
    };

    var setPartyLinkedState = function (recordView, party, linked) {
        if (!recordView.$el || !recordView.$el.length) {
            return;
        }

        getLinkedFields(party).forEach(function (field) {
            var $field = recordView.$el.find('[data-name="' + field + '"]');

            if (!$field.length) {
                return;
            }

            $field.toggleClass('party-registry-linked', !!linked);
        });
    };

    var getPartyConfig = function (party) {
        return party === 'peticionario'
            ? PersonaTipoFields.PETICIONARIO
            : PersonaTipoFields.PERJUDICANTE;
    };

    var refreshLinkedAppearance = function (recordView, party, options) {
        options = options || {};

        var config = getPartyConfig(party);
        var tipo = String(recordView.model.get(config.tipo) || '').trim();
        var documento = String(recordView.model.get(config.documento) || '').trim();
        var key = party + '|' + tipo + '|' + documento;

        if (party === 'perjudicante' && !PersonaTipoFields.isInfractorKnown(tipo)) {
            setPartyLinkedState(recordView, party, false);

            return;
        }

        if (!PersonaTipoFields.isTipoSelected(tipo) || documento.length < MIN_DOCUMENT_LENGTH) {
            setPartyLinkedState(recordView, party, false);

            return;
        }

        if (recordView._partyLookupCache && recordView._partyLookupCache[key]) {
            setPartyLinkedState(recordView, party, true);

            return;
        }

        if (options.skipLookup) {
            setPartyLinkedState(recordView, party, false);

            return;
        }

        runLookup(recordView, config, party, {silent: true});
    };

    var refreshAddressFields = function (recordView, party) {
        var config = party === 'peticionario'
            ? DireccionEstructurada.PETICIONARIO
            : DireccionEstructurada.PERJUDICANTE;

        DireccionEstructurada.applyToModel(recordView.model, config);

        if (!recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        config.componentFields.forEach(function (field) {
            var fieldView = recordView.getFieldView(field);

            SafeUiPromise.safeReRender(fieldView);
        });

        var direccionView = recordView.getFieldView(config.target);

        SafeUiPromise.safeReRender(direccionView);
    };

    var runLookup = function (recordView, config, party, options) {
        options = options || {};
        var tipo = String(recordView.model.get(config.tipo) || '').trim();
        var $input = recordView.$el.find('[data-name="' + config.documento + '"] input, [data-name="' + config.documento + '"] textarea');
        var documento = String(
            ($input.length ? $input.val() : null) || recordView.model.get(config.documento) || ''
        ).trim();

        if (party === 'perjudicante' && !PersonaTipoFields.isInfractorKnown(tipo)) {
            setPartyLinkedState(recordView, party, false);

            return;
        }

        if (!PersonaTipoFields.isTipoSelected(tipo)) {
            if (!options.silent) {
                Espo.Ui.notify(
                    party === 'peticionario'
                        ? 'Seleccione primero el tipo de peticionario (persona natural o jurídica).'
                        : 'Seleccione primero el tipo de perjudicante (persona natural o jurídica).',
                    'warning',
                    3500
                );
            }

            setPartyLinkedState(recordView, party, false);

            return;
        }

        if (documento.length < MIN_DOCUMENT_LENGTH) {
            setPartyLinkedState(recordView, party, false);

            return;
        }

        if (documento !== String(recordView.model.get(config.documento) || '').trim()) {
            recordView.model.set(config.documento, documento, {silent: true});
        }

        var key = party + '|' + tipo + '|' + documento;

        if (recordView._partyLookupCache && recordView._partyLookupCache[key]) {
            setPartyLinkedState(recordView, party, true);

            return;
        }

        if (!recordView._partyLookupRequests) {
            recordView._partyLookupRequests = {};
        }

        if (recordView._partyLookupRequests[party]) {
            var pending = recordView._partyLookupRequests[party];

            SafeUiPromise.abortAjaxRequest(pending);
            recordView._partyLookupRequests[party] = null;
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

                setPartyLinkedState(recordView, party, false);

                return;
            }

            if (!recordView._partyLookupCache) {
                recordView._partyLookupCache = {};
            }

            recordView._partyLookupCache[key] = true;
            recordView.model.set(response.data);
            refreshAddressFields(recordView, party);
            setPartyLinkedState(recordView, party, true);

            if (!options.silent) {
                Espo.Ui.warning(
                    response.message || 'Ya existe este registro. Se cargaron los datos registrados.'
                );
            }
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

            setPartyLinkedState(recordView, party, false);
            schedule();
        });
    };

    var bindDom = function (recordView) {
        refreshLinkedAppearance(recordView, 'peticionario');
        refreshLinkedAppearance(recordView, 'perjudicante');

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
        refreshLinkedAppearance: refreshLinkedAppearance,
    };
});
