define('custom:helpers/persona-tipo-fields', [], function () {

    const PERSONA_JURIDICA = 'Persona jurídica';
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
            applyPartyLabels(recordView, PERJUDICANTE, 'perjudicante');
        });
    };

    return {
        PETICIONARIO: PETICIONARIO,
        PERJUDICANTE: PERJUDICANTE,
        PERSONA_JURIDICA: PERSONA_JURIDICA,
        PLACEHOLDER: PLACEHOLDER,
        isJuridica: isJuridica,
        isTipoSelected: isTipoSelected,
        setup: setup,
        applyLabels: applyLabels,
        hidePartyLinks: hidePartyLinks,
    };
});
