define('custom:views/modals/acta-visita-detalle', ['views/modals/detail'], function (Dep) {

    // Consulta de solo lectura de un acta de visita, con la descarga del formato generado por el sistema.
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

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
