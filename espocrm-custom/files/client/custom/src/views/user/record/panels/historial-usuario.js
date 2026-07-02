define('custom:views/user/record/panels/historial-usuario', ['views/fields/base'], function (Dep) {

    var tipoLabel = function (tipo) {
        var labels = {
            caso: 'Caso',
            acta: 'Acta',
            actuo: 'Actuo',
            asignacion: 'Asignación',
            comunicacion: 'Comunicación',
        };

        return labels[tipo] || tipo;
    };

    return Dep.extend({

        detailTemplate: 'custom:user/record/panels/historial-usuario',
        editTemplate: 'custom:user/record/panels/historial-usuario',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.historial = {
                isLoading: true,
                loadError: false,
                resumen: {
                    totalCasos: 0,
                    activos: 0,
                    actas: 0,
                    asignaciones: 0,
                },
                casos: [],
                actuaciones: [],
            };

            if (this.model.id) {
                this.loadHistorial();
            }
        },

        data: function () {
            return {
                historial: this.historial,
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

        loadHistorial: function () {
            if (!this.model.id) {
                return;
            }

            var self = this;
            var url = 'User/action/historialActuaciones?userId=' + encodeURIComponent(this.model.id);

            this.historial.isLoading = true;
            this.historial.loadError = false;
            this.reRenderIfNeeded();

            Espo.Ajax.getRequest(url)
                .then(function (response) {
                    self.historial = {
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
                    self.historial.isLoading = false;
                    self.historial.loadError = true;
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

            this.$el.find('[data-action="openRecord"]').off('click.userHistorial');
            this.$el.find('[data-action="openRecord"]').on('click.userHistorial', function (e) {
                e.preventDefault();

                var href = $(this).attr('data-href');

                if (href) {
                    self.getRouter().navigate(href, {trigger: true});
                }
            });
        },
    });
});
