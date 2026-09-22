define('custom:helpers/peticion-plazo-fields', [], function () {
    const ESPECIAL = 'Término legal especial';
    const DIAS_HABILES = {
        'Petición general, queja o reclamo': 15,
        'Solicitud de información o documentos': 10,
        'Consulta a la autoridad': 30,
    };

    const FUNDAMENTO_PLAZO = {
        'Petición general, queja o reclamo': '15 días hábiles — Ley 1755 de 2015, art. 14',
        'Solicitud de información o documentos': '10 días hábiles — Ley 1755 de 2015, art. 14',
        'Consulta a la autoridad': '30 días hábiles — Ley 1755 de 2015, art. 14',
        'Término legal especial': 'término definido por norma especial',
    };

    const calculateDeadline = function (fechaCaso, modalidad) {
        const total = DIAS_HABILES[modalidad];
        const datePart = String(fechaCaso || '').slice(0, 10);

        if (!total || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return null;
        }

        const parts = datePart.split('-').map(Number);
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        let counted = 0;

        while (counted < total) {
            date.setDate(date.getDate() + 1);

            if (date.getDay() !== 0 && date.getDay() !== 6) {
                counted++;
            }
        }

        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    };

    const syncDeadline = function (recordView) {
        const modalidad = recordView.model.get('cModalidadPeticion');

        if (modalidad === ESPECIAL) {
            recordView.model.set('cFechaVencimiento', null);

            return;
        }

        const deadline = calculateDeadline(recordView.model.get('cFechaCaso'), modalidad);

        if (deadline) {
            recordView.model.set('cFechaVencimiento', deadline);
        }
    };

    const apply = function (recordView) {
        if (!recordView || !recordView.model || !recordView.$el) {
            return;
        }

        const showFundamento = recordView.model.get('cModalidadPeticion') === ESPECIAL;

        recordView.$el
            .find('.cell[data-name="cFundamentoPlazoEspecial"], .field[data-name="cFundamentoPlazoEspecial"]')
            .closest('.cell')
            .toggle(showFundamento);

        const fundamento = FUNDAMENTO_PLAZO[recordView.model.get('cModalidadPeticion')]
            || FUNDAMENTO_PLAZO['Petición general, queja o reclamo'];
        const label = 'Fecha límite de respuesta (' + fundamento + ')';

        recordView.$el
            .find('.cell[data-name="cFechaVencimiento"], .field[data-name="cFechaVencimiento"]')
            .find('.control-label')
            .text(label);
    };

    const setup = function (recordView) {
        recordView.listenTo(recordView.model, 'change:cModalidadPeticion', function () {
            syncDeadline(recordView);
            apply(recordView);
        });

        if (recordView.model.isNew()) {
            syncDeadline(recordView);
        }
    };

    return {
        setup: setup,
        schedule: view => [0, 180, 600].forEach(delay => window.setTimeout(() => apply(view), delay)),
    };
});
