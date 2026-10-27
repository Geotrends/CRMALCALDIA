define('custom:helpers/programacion-visita-campos', [], function () {

    // Una programación ya creada solo se modifica con "Reprogramar" (hook ProtegerReprogramacion);
    // si se abre el formulario de edición, todo queda de solo lectura.
    const CAMPOS = [
        'name', 'estado', 'responsable', 'fechaObjetivo', 'fechaProgramada',
        'horaInicio', 'horaFin', 'motivoReprogramacion',
    ];

    return {
        bloquearReprogramables: function (view) {
            if (view.model.isNew()) {
                return;
            }

            CAMPOS.forEach(campo => view.setFieldReadOnly(campo));
        },
    };
});
