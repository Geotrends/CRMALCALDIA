define('custom:helpers/persona-tipo-fields', [], function () {

    const PERSONA_JURIDICA = 'Persona jurídica';
    const PERSONA_NATURAL = 'Persona natural';
    const NO_SE_CONOCE = 'No se conoce';
    const PLACEHOLDER = 'Seleccione una opción';

    const PETICIONARIO = {
        tipo: 'cTipoPersonaPeticionario',
        nombre: 'cPeticionario',
        documento: 'cCedula',
    };

    const PERJUDICANTE = {
        tipo: 'cTipoPersonaPerjudicante',
        nombre: 'cPerjudicante',
        documento: 'cDocumentoPerjudicante',
    };

    const INFRACTOR_DETAIL_FIELDS = [
        'cDocumentoPerjudicante',
        'cPerjudicante',
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

    const applyPartyLabels = function (recordView, config, party) {
        const tipo = recordView.model.get(config.tipo);

        if (party === 'perjudicante' && isInfractorDesconocido(tipo)) {
            return;
        }

        const juridica = isJuridica(tipo);

        if (party === 'peticionario') {
            setFieldLabel(recordView, config.documento, juridica ? 'NIT' : 'Cédula');
            setFieldLabel(
                recordView,
                config.nombre,
                juridica ? 'Razón social' : 'Nombre del peticionario'
            );

            return;
        }

        setFieldLabel(recordView, config.documento, juridica ? 'NIT del infractor' : 'Cédula del infractor');
        setFieldLabel(
            recordView,
            config.nombre,
            juridica ? 'Razón social del infractor' : 'Nombre del infractor'
        );
    };

    const applyLabels = function (recordView) {
        applyPartyLabels(recordView, PETICIONARIO, 'peticionario');
        applyPartyLabels(recordView, PERJUDICANTE, 'perjudicante');
    };

    const clearInfractorFields = function (model) {
        INFRACTOR_DETAIL_FIELDS.forEach(function (field) {
            if (field === 'cBarrioPerjudicante') {
                model.set(field, PLACEHOLDER, {silent: true});

                return;
            }

            model.set(field, '', {silent: true});
        });

        model.set({
            cPerjudicanteContactId: null,
            cPerjudicanteContactName: null,
            cPerjudicanteCuentaId: null,
            cPerjudicanteCuentaName: null,
        }, {silent: true});
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
            clearInfractorFields(recordView.model);
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
    };
});
