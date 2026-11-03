define('custom:helpers/programacion-visita-campos', [], function () {

    // Una programación ya creada solo se modifica con "Reprogramar" (hook ProtegerReprogramacion);
    // si se abre el formulario de edición, todo queda de solo lectura.
    const CAMPOS = [
        'name', 'estado', 'responsable', 'fechaObjetivo', 'fechaProgramada',
        'horaInicio', 'horaFin', 'motivoReprogramacion',
    ];

    // Mientras se confirma qué es la fecha objetivo, al crear siempre vale lo mismo que la fecha programada
    // (el servidor lo vuelve a fijar en ProtegerReprogramacion).
    const sincronizarFechaObjetivo = function (view) {
        const copiar = () => view.model.set('fechaObjetivo', view.model.get('fechaProgramada') || null);

        copiar();
        view.setFieldReadOnly('fechaObjetivo');
        view.listenTo(view.model, 'change:fechaProgramada', copiar);
    };

    return {
        bloquearReprogramables: function (view) {
            if (view.model.isNew()) {
                sincronizarFechaObjetivo(view);

                return;
            }

            CAMPOS.forEach(campo => view.setFieldReadOnly(campo));
        },
    };
});
