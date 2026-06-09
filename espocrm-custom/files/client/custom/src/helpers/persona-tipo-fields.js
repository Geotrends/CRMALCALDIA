define('custom:helpers/persona-tipo-fields', [], function () {

    var PERSONA_NATURAL = 'Persona natural';
    var PERSONA_JURIDICA = 'Persona jurídica';

    var documentoLabel = function (tipo) {
        return tipo === PERSONA_JURIDICA ? 'NIT' : 'Cédula';
    };

    var nombreLabel = function (tipo, rol) {
        if (tipo === PERSONA_JURIDICA) {
            return rol === 'peticionario' ? 'Razón social' : 'Nombre de la empresa';
        }

        return rol === 'peticionario' ? 'Nombre del peticionario' : 'Nombre del perjudicante';
    };

    var applyDefaults = function (model) {
        if (!model.get('cTipoPersonaPeticionario')) {
            model.set('cTipoPersonaPeticionario', PERSONA_NATURAL, {silent: true});
        }

        if (!model.get('cTipoPersonaPerjudicante')) {
            model.set('cTipoPersonaPerjudicante', PERSONA_NATURAL, {silent: true});
        }
    };

    var updateFieldLabel = function (recordView, field, label) {
        var view = recordView.getFieldView(field);

        if (view) {
            view.params = view.params || {};
            view.params.label = label;
        }

        var $label = recordView.$el.find('.field[data-name="' + field + '"] .field-label');

        if ($label.length) {
            $label.text(label);
        }
    };

    var hidePartyLinks = function (recordView) {
        [
            'contact',
            'account',
            'cPerjudicanteContact',
            'cPerjudicanteCuenta',
        ].forEach(function (field) {
            recordView.$el.find('.field[data-name="' + field + '"]').closest('.cell, .field').hide();
        });
    };

    var toggle = function (recordView) {
        var model = recordView.model;
        var tipoPet = model.get('cTipoPersonaPeticionario') || PERSONA_NATURAL;
        var tipoPerj = model.get('cTipoPersonaPerjudicante') || PERSONA_NATURAL;

        updateFieldLabel(recordView, 'cCedula', documentoLabel(tipoPet));
        updateFieldLabel(recordView, 'cPeticionario', nombreLabel(tipoPet, 'peticionario'));
        updateFieldLabel(recordView, 'cDocumentoPerjudicante', documentoLabel(tipoPerj));
        updateFieldLabel(recordView, 'cPerjudicante', nombreLabel(tipoPerj, 'perjudicante'));
        hidePartyLinks(recordView);
    };

    return {
        PERSONA_NATURAL: PERSONA_NATURAL,
        PERSONA_JURIDICA: PERSONA_JURIDICA,
        applyDefaults: applyDefaults,
        toggle: toggle,
    };
});
