define('custom:helpers/acta-visita-autorizacion', [], function () {

    // Campos de «Datos y resultados de la visita» que se habilitan al autorizar el tratamiento de datos.
    const CAMPOS = [
        'posibleAfectante', 'telefono', 'direccionAfectacion', 'barrio', 'zona',
        'objetoVisita', 'situacionEncontrada', 'analisisSituacion', 'registroFotografico',
        'conclusion', 'requerimientos', 'funcionarioNombre', 'funcionarioCedula', 'funcionarioCargo',
        'establecimientoNombre', 'establecimientoCedula', 'establecimientoCargo',
        'fechaAprobacion', 'observacionesRevision',
    ];

    const CAMPO_AUTORIZACION = 'autorizacionDatos';

    const aplicar = function (view) {
        const autorizado = !!view.model.get(CAMPO_AUTORIZACION);

        CAMPOS.forEach((campo) => {
            if (autorizado) {
                view.setFieldNotReadOnly(campo);
            } else {
                view.setFieldReadOnly(campo);
            }
        });
    };

    const avisar = function (view) {
        const $autorizacion = view.$el.find('.cell[data-name="' + CAMPO_AUTORIZACION + '"]').first();
        const etiqueta = view.translate(CAMPO_AUTORIZACION, 'fields', 'ActaVisita');

        Espo.Ui.error(
            'Antes de diligenciar los datos y resultados de la visita, marque la casilla «' + etiqueta + '»'
            + ' al inicio de la sección «Datos y resultados de la visita».'
        );

        if (!$autorizacion.length) {
            return;
        }

        $autorizacion.closest('.panel-body').show();
        $autorizacion.get(0).scrollIntoView({behavior: 'smooth', block: 'center'});
        $autorizacion.addClass('alcaldia-acta-autorizacion-pendiente');

        window.setTimeout(() => $autorizacion.removeClass('alcaldia-acta-autorizacion-pendiente'), 4000);
    };

    // Los campos bloqueados no reciben foco, pero sí clics: el intento de llenarlos muestra el aviso.
    const escucharIntentos = function (view) {
        view.$el.off('click.actaAutorizacion').on('click.actaAutorizacion', '.cell[data-name]', function () {
            const campo = this.getAttribute('data-name');

            if (CAMPOS.indexOf(campo) !== -1 && !view.model.get(CAMPO_AUTORIZACION)) {
                avisar(view);
            }
        });
    };

    return {
        CAMPOS: CAMPOS,

        setup: function (view) {
            view.listenTo(view.model, 'change:' + CAMPO_AUTORIZACION, () => aplicar(view));
            view.listenTo(view, 'after:render', () => {
                aplicar(view);
                escucharIntentos(view);
            });
        },
    };
});
