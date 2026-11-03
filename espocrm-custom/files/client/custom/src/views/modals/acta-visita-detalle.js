define('custom:views/modals/acta-visita-detalle', ['views/modals/detail'], function (Dep) {

    // Consulta de un acta de visita, con la descarga del formato generado por el sistema.
    // Si quien la consulta puede diligenciarla (options.onEditar), también ofrece «Editar».
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (typeof this.options.onEditar === 'function') {
                this.addButton({
                    name: 'editarActa',
                    label: 'Editar',
                    style: 'default',
                    position: 'right',
                    onClick: () => {
                        this.close();
                        this.options.onEditar();
                    },
                }, true);
            }

            this.addButton({
                name: 'descargarActa',
                label: 'Descargar acta generada',
                style: 'primary',
                position: 'right',
                onClick: () => this.descargarActa(),
            }, true);
        },

        descargarActa: function () {
            const caseId = this.options.caseId || this.model.get('caseId');

            if (!caseId) {
                Espo.Ui.error('No se pudo identificar la solicitud del acta.');

                return;
            }

            window.location.assign(this.getBasePath()
                + '?entryPoint=FormatoActaVisitaCaso'
                + '&id=' + encodeURIComponent(caseId)
                + '&actaId=' + encodeURIComponent(this.options.id || this.model.id)
                + '&format=pdf');
        },
    });
});
