define('custom:helpers/direccion-estructurada', [], function () {

    const LETTER_OPTIONS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    const PETICIONARIO = {
        componentFields: [
            'cViaPrincipal',
            'cNumViaPrincipal',
            'cLetraViaPrincipal',
            'cCuadranteViaPrincipal',
            'cGeneradora',
            'cLetraGeneradora',
            'cCuadranteGeneradora',
            'cPlaca',
            'cBloque',
            'cInterior',
        ],
        target: 'cDireccion',
    };

    const PERJUDICANTE = {
        componentFields: [
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
        ],
        target: 'cDireccionPerjudicante',
    };

    const buildFromModel = function (model, config) {
        const parts = [];

        config.componentFields.forEach(function (field) {
            const value = String(model.get(field) || '').trim();

            if (value !== '') {
                parts.push(value);
            }
        });

        return parts.join(' ');
    };

    const applyToModel = function (model, config) {
        model.set(config.target, buildFromModel(model, config), {silent: true});
    };

    const setup = function (recordView) {
        const model = recordView.model;

        [PETICIONARIO, PERJUDICANTE].forEach(function (config) {
            config.componentFields.forEach(function (field) {
                recordView.listenTo(model, 'change:' + field, function () {
                    applyToModel(model, config);
                    recordView.reRenderField(config.target);
                });
            });

            applyToModel(model, config);
        });
    };

    const allComponentFields = function () {
        return PETICIONARIO.componentFields.concat(PERJUDICANTE.componentFields);
    };

    return {
        LETTER_OPTIONS: LETTER_OPTIONS,
        PETICIONARIO: PETICIONARIO,
        PERJUDICANTE: PERJUDICANTE,
        buildFromModel: buildFromModel,
        applyToModel: applyToModel,
        setup: setup,
        allComponentFields: allComponentFields,
    };
});
