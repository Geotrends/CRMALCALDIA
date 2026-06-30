define('custom:views/case/record/panels/comunicaciones-caso', [
    'views/record/panels/side',
    'custom:helpers/comunicacion-caso-modal',
], function (Dep, ComunicacionCasoModal) {

    return Dep.extend({

        template: 'custom:case/record/panels/comunicaciones-caso',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.items = [];
            this.canCreate = this.getAcl().check('ComunicacionCaso', 'create');
            this.canEdit = this.getAcl().check('ComunicacionCaso', 'edit');

            this.listenTo(this.model, 'sync', function () {
                if (this.model.id) {
                    this.loadComunicaciones();
                }
            });

            if (this.model.id) {
                this.loadComunicaciones();
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindActions();
        },

        loadComunicaciones: function () {
            if (!this.model.id) {
                this.items = [];
                this.reRenderIfNeeded();

                return;
            }

            var self = this;
            var userId = this.getUser().id;

            this.getCollectionFactory().create('ComunicacionCaso', function (collection) {
                collection.maxSize = 50;
                collection.orderBy = 'fecha';
                collection.order = 'desc';
                collection.where = [
                    {
                        type: 'equals',
                        attribute: 'caseId',
                        value: self.model.id,
                    },
                    {
                        type: 'equals',
                        attribute: 'createdById',
                        value: userId,
                    },
                ];

                collection.fetch()
                    .then(function () {
                        self.items = collection.models.map(function (model) {
                            return {
                                id: model.id,
                                fecha: model.get('fecha') || '—',
                                tipo: model.get('tipo') || '—',
                                destinatario: model.get('destinatario') || '—',
                                asunto: model.get('asunto') || '—',
                                esRespuestaFinal: !!model.get('esRespuestaFinal'),
                            };
                        });

                        self.reRenderIfNeeded();
                        self.bindActions();
                    })
                    .catch(function () {
                        self.items = [];
                        self.loadError = true;
                        self.reRenderIfNeeded();
                        self.bindActions();
                    });
            });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
            }
        },

        bindActions: function () {
            var self = this;

            this.$el.find('[data-action="registrarComunicacion"]').off('click.comunicacion');
            this.$el.find('[data-action="registrarComunicacion"]').on('click.comunicacion', function (e) {
                e.preventDefault();
                e.stopPropagation();

                ComunicacionCasoModal.openCreate(self, self.model, {
                    onAfterSave: function () {
                        self.loadComunicaciones();
                    },
                }).catch(function () {});
            });

            this.$el.find('[data-action="verComunicacion"]').off('click.comunicacion');
            this.$el.find('[data-action="verComunicacion"]').on('click.comunicacion', function (e) {
                e.preventDefault();
                e.stopPropagation();

                var id = $(this).data('id');

                if (!id) {
                    return;
                }

                ComunicacionCasoModal.openEdit(self, id, {
                    onAfterSave: function () {
                        self.loadComunicaciones();
                    },
                }).catch(function () {});
            });
        },

        data: function () {
            return {
                canCreate: this.canCreate,
                items: this.items || [],
                loadError: !!this.loadError,
                isEmpty: !this.items || !this.items.length,
                helpText: 'Registre citaciones, respuestas, oficios y otras comunicaciones vinculadas a este caso.',
            };
        },
    });
});
