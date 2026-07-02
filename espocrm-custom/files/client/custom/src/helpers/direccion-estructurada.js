define('custom:helpers/direccion-estructurada', [
    'custom:helpers/safe-ui-promise',
], function (SafeUiPromise) {

    const LETTER_OPTIONS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

    const PETICIONARIO = {
        componentFields: [
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
        ],
        target: 'cDireccionPeticionario',
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

    const PLACEHOLDER_VALUES = [
        '',
        'Seleccione una opción',
        'Seleccione una opcion',
        '-',
        '—',
    ];

    const getTrimmed = function (model, field) {
        const value = String(model.get(field) || '').trim();

        if (PLACEHOLDER_VALUES.indexOf(value) !== -1) {
            return '';
        }

        return value;
    };

    const joinParts = function (parts) {
        return parts.filter(function (part) {
            return part !== '';
        }).join(' ');
    };

    const buildFromModel = function (model, config) {
        const fields = config.componentFields;
        const via = joinParts([
            getTrimmed(model, fields[0]),
            getTrimmed(model, fields[1]),
            getTrimmed(model, fields[2]),
            getTrimmed(model, fields[3]),
        ]);
        const generadora = joinParts([
            getTrimmed(model, fields[4]),
            getTrimmed(model, fields[5]),
            getTrimmed(model, fields[6]),
        ]);
        const placa = getTrimmed(model, fields[7]);
        const bloque = getTrimmed(model, fields[8]);
        const interior = getTrimmed(model, fields[9]);
        const extras = joinParts([bloque, interior]);

        let result = via;

        if (generadora !== '') {
            result = result !== '' ? result + ' # ' + generadora : generadora;
        }

        if (placa !== '') {
            if (result !== '') {
                result += ' - ' + placa;
            } else {
                result = placa;
            }
        }

        if (extras !== '') {
            result = result !== '' ? result + ' ' + extras : extras;
        }

        return result;
    };

    const applyToModel = function (model, config) {
        model.set(config.target, buildFromModel(model, config), {silent: true});
    };

    const refreshTargetField = function (recordView, target) {
        if (!recordView.isRendered || !recordView.isRendered()) {
            return;
        }

        const fieldView = recordView.getFieldView(target);

        SafeUiPromise.safeReRender(fieldView);
    };

    const setup = function (recordView) {
        const model = recordView.model;

        [PETICIONARIO, PERJUDICANTE].forEach(function (config) {
            config.componentFields.forEach(function (field) {
                recordView.listenTo(model, 'change:' + field, function () {
                    applyToModel(model, config);
                    refreshTargetField(recordView, config.target);
                });
            });

            applyToModel(model, config);
        });

        recordView.once('after:render', function () {
            [PETICIONARIO, PERJUDICANTE].forEach(function (config) {
                applyToModel(model, config);
                refreshTargetField(recordView, config.target);
            });
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
