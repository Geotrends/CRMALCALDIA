define('custom:views/acta-visita/fields/formato-mano-adjunto', [
    'views/fields/attachment-multiple',
], function (Dep) {

    // En detalle lista las descargas; en edición es el campo de adjuntos estándar. El layout
    // "detail" también se usa al crear/editar, por eso este campo debe saber adjuntar archivos.
    return Dep.extend({
        detailTemplate: 'custom:acta-visita/fields/formato-mano-adjunto',

        setup: function () {
            Dep.prototype.setup.call(this);
            this.files = [];
            this.loaded = false;
        },

        data: function () {
            const data = Dep.prototype.data.call(this);

            data.files = this.files;

            return data;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.isDetailMode()) {
                return;
            }

            const ids = this.model.get(this.name + 'Ids') || [];
            const list = Array.isArray(ids) ? ids : String(ids || '').split(',').filter(Boolean);
            const self = this;

            if (!list.length || this.loaded) {
                return;
            }

            this.loaded = true;

            Promise.all(list.map(function (id) {
                return Espo.Ajax.getRequest('Attachment/' + encodeURIComponent(id));
            })).then(function (attachments) {
                self.files = attachments.filter(Boolean).map(function (file) {
                    return {
                        id: file.id,
                        name: file.name || 'Archivo adjunto',
                        downloadUrl: 'api/v1/Attachment/file/' + encodeURIComponent(file.id) + '?download=1',
                    };
                });
                self.reRender();
            }).catch(function () {
                self.files = list.map(function (id) {
                    return {
                        id: id,
                        name: 'Descargar archivo adjunto',
                        downloadUrl: 'api/v1/Attachment/file/' + encodeURIComponent(id) + '?download=1',
                    };
                });
                self.reRender();
            });
        },
    });
});
