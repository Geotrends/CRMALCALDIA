define('custom:helpers/programacion-visita-campos', [], function () {

    // Fechas y horas ya diligenciadas solo cambian con "Reprogramar" (hook ProtegerReprogramacion);
    // al editar quedan de solo lectura. El motivo tampoco se edita fuera de Reprogramar.
    const CAMPOS_FECHA = ['fechaObjetivo', 'fechaProgramada', 'horaInicio', 'horaFin'];

    return {
        bloquearReprogramables: function (view) {
            if (view.model.isNew()) {
                return;
            }

            CAMPOS_FECHA.forEach(campo => {
                if (view.model.get(campo)) {
                    view.setFieldReadOnly(campo);
                }
            });

            view.setFieldReadOnly('motivoReprogramacion');
        },
    };
});
