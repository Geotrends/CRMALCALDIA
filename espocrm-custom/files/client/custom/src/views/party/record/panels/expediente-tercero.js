define('custom:views/party/record/panels/expediente-tercero', ['view'], function (Dep) {

    var formatDate = function (value) {
        if (!value) {
            return '—';
        }

        var date = new Date(String(value).replace(' ', 'T'));

        if (isNaN(date.getTime())) {
            return String(value).substring(0, 10);
        }

        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    var formatDateTime = function (value) {
        if (!value) {
            return '—';
        }

        var date = new Date(String(value).replace(' ', 'T'));

        if (isNaN(date.getTime())) {
            return String(value).substring(0, 16).replace('T', ' ');
        }

        return date.toLocaleString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    var tipoLabel = function (tipo) {
        var labels = {
            caso: 'Caso',
            acta: 'Acta',
            comunicacion: 'Comunicación',
            actuo: 'Actuo',
        };

        return labels[tipo] || tipo;
    };

    return Dep.extend({

        template: 'custom:party/record/panels/expediente-tercero',

        setup: function () {
            this.expediente = {
                isLoading: true,
                loadError: false,
                resumen: {
                    totalCasos: 0,
                    peticionario: 0,
                    infractor: 0,
                    actas: 0,
                    comunicaciones: 0,
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
            this.bindActions();
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
                                fechaCaso: formatDate(item.fechaCaso),
                                href: '#Case/view/' + item.id,
                            };
                        }),
                        actuaciones: (response.actuaciones || []).map(function (item) {
                            return {
                                tipo: item.tipo,
                                tipoLabel: tipoLabel(item.tipo),
                                fecha: formatDateTime(item.fecha),
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
