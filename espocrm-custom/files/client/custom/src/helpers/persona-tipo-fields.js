define('custom:helpers/persona-tipo-fields', [
    'custom:helpers/safe-ui-promise',
], function (SafeUiPromise) {

    const PERSONA_JURIDICA = 'Persona jurídica';
    const PERSONA_NATURAL = 'Persona natural';
    const NO_SE_CONOCE = 'No se conoce';
    const PLACEHOLDER = 'Seleccione una opción';

    const PETICIONARIO = {
        tipo: 'cTipoPersonaPeticionario',
        nombre: 'cNombrePeticionario',
        apellido: 'cApellidoPeticionario',
        documento: 'cDocumentoPeticionario',
    };

    const PERJUDICANTE = {
        tipo: 'cTipoPersonaPerjudicante',
        nombre: 'cNombrePerjudicante',
        apellido: 'cApellidoPerjudicante',
        documento: 'cDocumentoPerjudicante',
    };

    const INFRACTOR_DETAIL_FIELDS = [
        'cDocumentoPerjudicante',
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cTelefonoPerjudicante',
        'cViaPrincipalPerjudicante',
        'cNumViaPrincipalPerjudicante',
        'cLetraViaPrincipalPerjudicante',
        'cCuadranteViaPrincipalPerjudicante',
        'cGeneradoraPerjudicante',
        'cLetraGeneradoraPerjudicante',
        'cCuadranteGeneradoraPerjudicante',
        'cPlacaPerjudicante',
        'cBloquePerjudicante',
        'cInteriorPerjudicante',
        'cDireccionPerjudicante',
        'cBarrioPerjudicante',
    ];

    const findCell = function (recordView, field) {
        const $cell = recordView.$el.find('.cell[data-name="' + field + '"]');

        if ($cell.length) {
            return $cell;
        }

        return recordView.$el.find('[data-name="' + field + '"]').closest('.cell');
    };

    const isJuridica = function (tipo) {
        const value = String(tipo || '').trim();

        return value === PERSONA_JURIDICA;
    };

    const isInfractorDesconocido = function (tipo) {
        return String(tipo || '').trim() === NO_SE_CONOCE;
    };

    const isInfractorKnown = function (tipo) {
        const value = String(tipo || '').trim();

        return value === PERSONA_NATURAL || value === PERSONA_JURIDICA;
    };

    const isTipoSelected = function (tipo) {
        const value = String(tipo || '').trim();

        return value !== '' && value !== PLACEHOLDER;
    };

    const setFieldLabel = function (recordView, field, label) {
        const $cell = findCell(recordView, field);

        if (!$cell.length) {
            return;
        }

        $cell.find('label').first().text(label);
    };

    const toggleApellidoField = function (recordView, config, party) {
        const tipo = recordView.model.get(config.tipo);
        const juridica = isJuridica(tipo);
        const $cell = findCell(recordView, config.apellido);

        if (!$cell.length) {
            return;
        }

        if (party === 'perjudicante' && isInfractorDesconocido(tipo)) {
            $cell.hide();

            return;
        }

        if (juridica) {
            $cell.hide();

            if (typeof recordView.model.unset === 'function') {
                recordView.model.unset(config.apellido, {silent: true});
            } else {
                recordView.model.set(config.apellido, null, {silent: true});
            }

            return;
        }

        $cell.show();
    };

    const applyPartyLabels = function (recordView, config, party) {
        const tipo = recordView.model.get(config.tipo);

        if (party === 'perjudicante' && isInfractorDesconocido(tipo)) {
            return;
        }

        const juridica = isJuridica(tipo);

        if (party === 'peticionario') {
            setFieldLabel(recordView, config.documento, juridica ? 'NIT del peticionario' : 'Documento del peticionario');
            setFieldLabel(
                recordView,
                config.nombre,
                juridica ? 'Razón social del peticionario' : 'Nombre(s) del peticionario'
            );
            setFieldLabel(recordView, config.apellido, 'Apellido(s) del peticionario');
            toggleApellidoField(recordView, config, party);

            return;
        }

        setFieldLabel(recordView, config.documento, juridica ? 'NIT del perjudicante' : 'Documento del perjudicante');
        setFieldLabel(
            recordView,
            config.nombre,
            juridica ? 'Razón social del perjudicante' : 'Nombre(s) del perjudicante'
        );
        setFieldLabel(recordView, config.apellido, 'Apellido(s) del perjudicante');
        toggleApellidoField(recordView, config, party);
    };

    const applyPeticionarioFieldLabels = function (recordView) {
        const labels = {
            cTipoPersonaPeticionario: 'Tipo de peticionario',
            cDocumentoPeticionario: 'Documento del peticionario',
            cTelefonoPeticionario: 'Teléfono del peticionario',
            cCorreoPeticionario: 'Correo del peticionario',
            cCanalDeReportePeticionario: 'Canal de reporte del peticionario',
            cMunicipioPeticionario: 'Municipio del peticionario',
            cDireccionPeticionario: 'Dirección del peticionario',
            cBarrioPeticionario: 'Barrio del peticionario',
            cZonaAlcaldiaPeticionario: 'Zona del peticionario',
            cViaPrincipalPeticionario: 'Vía principal del peticionario',
            cNumViaPrincipalPeticionario: 'N° vía principal del peticionario',
            cLetraViaPrincipalPeticionario: 'Letra del peticionario',
            cCuadranteViaPrincipalPeticionario: 'Cuadrante del peticionario',
            cGeneradoraPeticionario: 'Generadora del peticionario',
            cLetraGeneradoraPeticionario: 'Letra generadora del peticionario',
            cCuadranteGeneradoraPeticionario: 'Cuadrante del peticionario',
            cPlacaPeticionario: 'Placa del peticionario',
            cBloquePeticionario: 'Bloque del peticionario',
            cInteriorPeticionario: 'Interior del peticionario',
        };

        Object.keys(labels).forEach(function (field) {
            setFieldLabel(recordView, field, labels[field]);
        });
    };

    const applyLabels = function (recordView) {
        applyPartyLabels(recordView, PETICIONARIO, 'peticionario');
        applyPartyLabels(recordView, PERJUDICANTE, 'perjudicante');
        applyPeticionarioFieldLabels(recordView);
    };

    const ENUM_PLACEHOLDER_FIELDS = [
        'cCanalDeReportePeticionario',
        'cBarrioPeticionario',
        'cBarrioPerjudicante',
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldiaPeticionario',
        'cUltimaActuacion',
        'cProximaActuacion',
        'cRadicadoSiglas',
        'cTipoPersonaPeticionario',
        'cTipoPersonaPerjudicante',
    ];

    const clearOptionalEnumPlaceholders = function (model) {
        ENUM_PLACEHOLDER_FIELDS.forEach(function (field) {
            const value = String(model.get(field) || '').trim();

            if (value === '' || value === PLACEHOLDER) {
                if (typeof model.unset === 'function') {
                    model.unset(field, {silent: true});
                } else {
                    model.set(field, null, {silent: true});
                }
            }
        });
    };

    const clearInfractorFields = function (recordView) {
        const model = recordView.model || recordView;

        INFRACTOR_DETAIL_FIELDS.forEach(function (field) {
            if (typeof model.unset === 'function') {
                model.unset(field, {silent: true});
            } else {
                model.set(field, null, {silent: true});
            }

            if (recordView.model && recordView.isRendered && recordView.isRendered()) {
                const fieldView = recordView.getFieldView(field);

                if (fieldView) {
                    if (typeof fieldView.model.unset === 'function') {
                        fieldView.model.unset(field, {silent: true});
                    } else {
                        fieldView.model.set(field, null, {silent: true});
                    }

                    if (fieldView.isRendered()) {
                        SafeUiPromise.safeReRender(fieldView);
                    }
                }
            }
        });

        [
            'cPerjudicanteContactId',
            'cPerjudicanteContactName',
            'cPerjudicanteCuentaId',
            'cPerjudicanteCuentaName',
        ].forEach(function (field) {
            if (typeof model.unset === 'function') {
                model.unset(field, {silent: true});
            } else {
                model.set(field, null, {silent: true});
            }
        });
    };

    const toggleInfractorFields = function (recordView) {
        const tipo = recordView.model.get(PERJUDICANTE.tipo);
        const hidden = isInfractorDesconocido(tipo);

        INFRACTOR_DETAIL_FIELDS.forEach(function (field) {
            const $cell = findCell(recordView, field);

            if (!$cell.length) {
                return;
            }

            if (hidden) {
                $cell.hide();
            } else {
                $cell.show();
            }
        });

        if (hidden) {
            clearInfractorFields(recordView);
        } else {
            applyPartyLabels(recordView, PERJUDICANTE, 'perjudicante');
        }
    };

    const hidePartyLinks = function (recordView) {
        [
            'contact',
            'account',
            'cPerjudicanteContact',
            'cPerjudicanteCuenta',
        ].forEach(function (field) {
            findCell(recordView, field).hide();
        });
    };

    const setup = function (recordView) {
        recordView.listenTo(recordView.model, 'change:' + PETICIONARIO.tipo, function () {
            applyPartyLabels(recordView, PETICIONARIO, 'peticionario');
        });

        recordView.listenTo(recordView.model, 'change:' + PERJUDICANTE.tipo, function () {
            toggleInfractorFields(recordView);
        });
    };

    return {
        PETICIONARIO: PETICIONARIO,
        PERJUDICANTE: PERJUDICANTE,
        INFRACTOR_DETAIL_FIELDS: INFRACTOR_DETAIL_FIELDS,
        PERSONA_JURIDICA: PERSONA_JURIDICA,
        PERSONA_NATURAL: PERSONA_NATURAL,
        NO_SE_CONOCE: NO_SE_CONOCE,
        PLACEHOLDER: PLACEHOLDER,
        isJuridica: isJuridica,
        isInfractorDesconocido: isInfractorDesconocido,
        isInfractorKnown: isInfractorKnown,
        isTipoSelected: isTipoSelected,
        setup: setup,
        applyLabels: applyLabels,
        hidePartyLinks: hidePartyLinks,
        toggleInfractorFields: toggleInfractorFields,
        clearInfractorFields: clearInfractorFields,
        clearOptionalEnumPlaceholders: clearOptionalEnumPlaceholders,
    };
});
