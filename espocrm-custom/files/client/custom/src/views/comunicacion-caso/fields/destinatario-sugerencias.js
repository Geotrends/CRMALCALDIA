define('custom:views/comunicacion-caso/fields/destinatario-sugerencias', [
    'views/fields/base',
    'custom:helpers/safe-ui-promise',
], function (Dep, SafeUiPromise) {

    return Dep.extend({

        detailTemplate: 'custom:comunicacion-caso/fields/destinatario-sugerencias',
        editTemplate: 'custom:comunicacion-caso/fields/destinatario-sugerencias',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.partes = [];
            this.loadError = false;

            this.listenTo(this.model, 'change:caseId', function () {
                this.loadPartes();
            });

            this.listenTo(this.model, 'change:tipo', function () {
                this.applySuggestedParte();
            });

            this.loadPartes();
        },

        data: function () {
            return {
                partes: this.partes || [],
                loadError: this.loadError,
                hasPartes: !!(this.partes && this.partes.length),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindButtons();
        },

        loadPartes: function () {
            var caseId = this.model.get('caseId');

            if (!caseId) {
                this.partes = [];
                this.reRenderIfNeeded();

                return;
            }

            var self = this;

            Espo.Ajax.getRequest('ComunicacionCaso/action/partesCaso', {
                caseId: caseId,
            }).then(function (response) {
                self.partes = response.list || [];
                self.loadError = false;
                self.applySuggestedParte();
                self.reRenderIfNeeded();
                self.bindButtons();
            }).catch(function () {
                self.partes = [];
                self.loadError = true;
                self.reRenderIfNeeded();
                self.bindButtons();
            });
        },

        applySuggestedParte: function () {
            if (this.model.get('destinatarioTerceroId') || this.model.get('destinatario')) {
                return;
            }

            var tipo = String(this.model.get('tipo') || '').trim();
            var role = null;

            if (tipo === 'Respuesta al peticionario') {
                role = 'peticionario';
            } else if (tipo === 'Notificación al infractor' || tipo === 'Citación') {
                role = 'perjudicante';
            }

            if (!role) {
                return;
            }

            var parte = (this.partes || []).find(function (item) {
                return item.role === role;
            });

            if (parte) {
                this.applyParte(parte);
            }
        },

        applyParte: function (parte) {
            if (!parte) {
                return;
            }

            if (parte.entityType && parte.id) {
                this.model.set({
                    destinatarioTerceroType: parte.entityType,
                    destinatarioTerceroId: parte.id,
                    destinatarioTerceroName: parte.name,
                    destinatario: parte.name,
                });
            } else {
                this.model.set({
                    destinatarioTerceroType: null,
                    destinatarioTerceroId: null,
                    destinatarioTerceroName: null,
                    destinatario: parte.name,
                });
            }
        },

        bindButtons: function () {
            var self = this;

            this.$el.find('[data-action="pickDestinatarioParte"]').off('click.destinatario');
            this.$el.find('[data-action="pickDestinatarioParte"]').on('click.destinatario', function (e) {
                e.preventDefault();

                var index = parseInt($(this).data('index'), 10);

                if (isNaN(index) || !self.partes[index]) {
                    return;
                }

                self.applyParte(self.partes[index]);
            });
        },

        reRenderIfNeeded: function () {
            SafeUiPromise.safeReRender(this);
        },
    });
});
