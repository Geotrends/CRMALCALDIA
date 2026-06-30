define('custom:views/party/record/panels/expediente-tercero', ['views/fields/base'], function (Dep) {

        var tipoLabel = function (tipo) {
        var labels = {
            caso: 'Caso',
            acta: 'Acta',
            actuo: 'Actuo',
        };

        return labels[tipo] || tipo;
    };

    return Dep.extend({

        detailTemplate: 'custom:party/record/panels/expediente-tercero',
        editTemplate: 'custom:party/record/panels/expediente-tercero',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.expediente = {
                isLoading: true,
                loadError: false,
                resumen: {
                    totalCasos: 0,
                    infractor: 0,
                    actas: 0,
                    actuos: 0,
                },
                casos: [],
                actuaciones: [],
            };

            this.listenTo(this.model, 'sync', function () {
                if (this.model.id) {
                    this.loadExpediente();
                }
            });

            if (this.model.id) {
                this.loadExpediente();
            }
        },

        data: function () {
            return {
                expediente: this.expediente,
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindActions();
        },

        formatDate: function (value) {
            if (!value) {
                return '—';
            }

            return this.getDateTime().toDisplayDate(value) || '—';
        },

        formatDateTime: function (value) {
            if (!value) {
                return '—';
            }

            return this.getDateTime().toDisplay(value) || '—';
        },

        loadExpediente: function () {
            if (!this.model.id) {
                return;
            }

            var self = this;
            var scope = this.model.entityType;
            var paramName = scope === 'Account' ? 'accountId' : 'contactId';
            var url = scope + '/action/expediente?' + paramName + '=' + encodeURIComponent(this.model.id);

            this.expediente.isLoading = true;
            this.expediente.loadError = false;
            this.reRenderIfNeeded();

            Espo.Ajax.getRequest(url)
                .then(function (response) {
                    self.expediente = {
                        isLoading: false,
                        loadError: false,
                        resumen: response.resumen || {},
                        casos: (response.casos || []).map(function (item) {
                            return {
                                id: item.id,
                                label: item.label || 'Caso',
                                status: item.status || '—',
                                rol: item.rol || '—',
                                expediente: item.expediente || '—',
                                fechaCaso: self.formatDate(item.fechaCaso),
                                href: '#Case/view/' + item.id,
                            };
                        }),
                        actuaciones: (response.actuaciones || []).map(function (item) {
                            return {
                                tipo: item.tipo,
                                tipoLabel: tipoLabel(item.tipo),
                                fecha: self.formatDateTime(item.fecha),
                                titulo: item.titulo || '—',
                                descripcion: item.descripcion || '',
                                caseId: item.caseId,
                                caseLabel: item.caseLabel || 'Caso',
                                caseHref: '#Case/view/' + item.caseId,
                                entityType: item.entityType,
                                entityId: item.entityId,
                                entityHref: item.entityType && item.entityId
                                    ? '#' + item.entityType + '/view/' + item.entityId
                                    : '',
                                rol: item.rol || '—',
                            };
                        }),
                    };

                    self.reRenderIfNeeded();
                    self.bindActions();
                })
                .catch(function () {
                    self.expediente.isLoading = false;
                    self.expediente.loadError = true;
                    self.reRenderIfNeeded();
                    self.bindActions();
                });
        },

        reRenderIfNeeded: function () {
            if (this.isRendered()) {
                this.reRender();
            }
        },

        bindActions: function () {
            var self = this;

            this.$el.find('[data-action="openRecord"]').off('click.partyExpediente');
            this.$el.find('[data-action="openRecord"]').on('click.partyExpediente', function (e) {
                e.preventDefault();

                var href = $(this).attr('data-href');

                if (href) {
                    self.getRouter().navigate(href, {trigger: true});
                }
            });
        },
    });
});
