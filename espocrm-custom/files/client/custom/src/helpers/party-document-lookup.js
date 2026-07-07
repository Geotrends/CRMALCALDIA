define('custom:helpers/party-document-lookup', [
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/direccion-estructurada',
    'custom:helpers/safe-ui-promise',
    'custom:helpers/nit-input',
], function (PersonaTipoFields, DireccionEstructurada, SafeUiPromise, NitInput) {

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

    var PETICIONARIO_LINK_IDS = [
        'contactId',
        'contactName',
        'accountId',
        'accountName',
    ];

    var PERJUDICANTE_LINK_IDS = [
        'cPerjudicanteContactId',
        'cPerjudicanteContactName',
        'cPerjudicanteCuentaId',
        'cPerjudicanteCuentaName',
    ];

    var getLinkedFields = function (party) {
        return party === 'peticionario' ? PETICIONARIO_LINKED_FIELDS : PERJUDICANTE_LINKED_FIELDS;
    };

    var normalizeDocumento = function (documento, tipo) {
        var raw = String(documento || '').trim();

        if (!raw) {
            return '';
        }

        if (PersonaTipoFields.isJuridica(tipo)) {
            return NitInput.format(raw) || raw;
        }

        var digits = raw.replace(/[^\d]/g, '');

        return digits || raw;
    };

    var readDocumentFromDom = function (recordView, config) {
        var $input = recordView.$el.find(
            '[data-name="' + config.documento + '"] input, [data-name="' + config.documento + '"] textarea'
        );

        if (!$input.length) {
            return String(recordView.model.get(config.documento) || '').trim();
        }

        var tipo = String(recordView.model.get(config.tipo) || '').trim();

        return normalizeDocumento($input.val(), tipo);
    };

    var syncDocumentToModel = function (recordView, config) {
        var documento = readDocumentFromDom(recordView, config);
        var current = String(recordView.model.get(config.documento) || '').trim();

        if (documento === current) {
            return documento;
        }

        recordView.model.set(config.documento, documento || null, {silent: true});

        return documento;
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

    var refreshPartyFields = function (recordView, party) {
        if (!recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        var config = getPartyConfig(party);

        getLinkedFields(party).forEach(function (field) {
            if (field === config.documento) {
                return;
            }

            SafeUiPromise.safeReRender(recordView.getFieldView(field));
        });
    };

    var refreshPartyUi = function (recordView, party) {
        PersonaTipoFields.applyLabels(recordView);

        [DireccionEstructurada.PETICIONARIO, DireccionEstructurada.PERJUDICANTE].forEach(function (config) {
            DireccionEstructurada.applyToModel(recordView.model, config);
        });

        refreshPartyFields(recordView, party);

        setTimeout(function () {
            if (!recordView.isRendered || !recordView.isRendered()) {
                return;
            }

            PersonaTipoFields.applyLabels(recordView);
            refreshPartyFields(recordView, party);

            var target = party === 'peticionario'
                ? DireccionEstructurada.PETICIONARIO.target
                : DireccionEstructurada.PERJUDICANTE.target;

            SafeUiPromise.safeReRender(recordView.getFieldView(target));
        }, 80);
    };

    var applyPartyData = function (recordView, party, data) {
        var patch = {};
        var fields = getLinkedFields(party).concat(
            party === 'peticionario' ? PETICIONARIO_LINK_IDS : PERJUDICANTE_LINK_IDS
        );

        fields.forEach(function (field) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                return;
            }

            patch[field] = data[field];
        });

        if (Object.keys(patch).length) {
            recordView.model.set(patch);
        }
    };

    var getLookupMessage = function (party, tipo) {
        var roleLabel = party === 'peticionario' ? 'peticionario' : 'infractor';
        var docLabel = PersonaTipoFields.isJuridica(tipo) ? 'NIT' : 'cédula';

        return 'Ya existe este ' + docLabel + ' como ' + roleLabel
            + '. Se cargaron los datos de ese rol; puede editarlos si es necesario.';
    };

    var refreshLinkedAppearance = function (recordView, party, options) {
        options = options || {};

        var config = getPartyConfig(party);
        var tipo = String(recordView.model.get(config.tipo) || '').trim();
        var documento = normalizeDocumento(recordView.model.get(config.documento), tipo);
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

    var runLookup = function (recordView, config, party, options) {
        options = options || {};
        var tipo = String(recordView.model.get(config.tipo) || '').trim();
        var documento = syncDocumentToModel(recordView, config);

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
            applyPartyData(recordView, party, response.data);
            refreshPartyUi(recordView, party);
            setPartyLinkedState(recordView, party, true);

            if (!options.silent) {
                Espo.Ui.warning(
                    response.message || getLookupMessage(party, tipo)
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
        recordView.listenTo(recordView.model, 'change:' + config.tipo, function () {
            if (recordView._partyLookupCache) {
                Object.keys(recordView._partyLookupCache).forEach(function (cacheKey) {
                    if (cacheKey.indexOf(party + '|') === 0) {
                        delete recordView._partyLookupCache[cacheKey];
                    }
                });
            }

            setPartyLinkedState(recordView, party, false);
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
            .off('blur.partyLookup', '[data-name="cDocumentoPeticionario"] input, [data-name="cDocumentoPeticionario"] textarea')
            .off('blur.partyLookup', '[data-name="cDocumentoPerjudicante"] input, [data-name="cDocumentoPerjudicante"] textarea')
            .on('blur.partyLookup', '[data-name="cDocumentoPeticionario"] input, [data-name="cDocumentoPeticionario"] textarea', handler)
            .on('blur.partyLookup', '[data-name="cDocumentoPerjudicante"] input, [data-name="cDocumentoPerjudicante"] textarea', handler);
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
