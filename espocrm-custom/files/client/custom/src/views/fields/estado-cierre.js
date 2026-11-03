define('custom:views/fields/estado-cierre', ['views/fields/enum'], function (Dep) {

    // Pasar al estado de cierre bloquea el registro para siempre: se pide confirmación al elegirlo
    // (formulario o edición en línea) y, si se cancela, vuelve al estado anterior.
    const ESTADO_CIERRE = {
        IntervencionTecnica: {estado: 'Completa documentalmente', nombre: 'la intervención técnica'},
        GestionTecnica: {estado: 'Cerrada', nombre: 'la gestión técnica'},
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.cierre = ESTADO_CIERRE[this.model.entityType] || null;

            this.on('change', () => this.confirmarCierre());
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.isEditMode()) {
                this.valorAnterior = this.model.get(this.name);
            }
        },

        confirmarCierre: function () {
            const valor = this.fetch()[this.name];

            if (!this.cierre || valor !== this.cierre.estado || this.valorAnterior === this.cierre.estado) {
                this.valorAnterior = valor;

                return;
            }

            this.confirm({
                message: 'Al guardar ' + this.cierre.nombre + ' como «' + this.cierre.estado + '» quedará cerrada ' +
                    'y no se podrá volver a editar. ¿Continuar?',
                confirmText: 'Sí, cerrar',
                cancelCallback: () => {
                    this.model.set(this.name, this.valorAnterior, {ui: true});
                    this.reRender();
                },
            }, () => {
                this.valorAnterior = valor;
            });
        },
    });
});
