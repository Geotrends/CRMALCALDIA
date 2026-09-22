define('custom:views/expediente/record/panels/pasos', [
    'views/record/panels/side',
    'custom:helpers/radicacion-fields',
    'custom:helpers/safe-ui-promise',
], function (Dep, RadicacionFields, SafeUiPromise) {

    return Dep.extend({

        template: 'custom:expediente/record/panels/pasos',

        data: function () {
            return {
                loading: !this.timeline,
                timeline: this.timeline || null,
                canAvanzar: this.canAvanzar(),
            };
        },

        setup: function () {
            Dep.prototype.setup.call(this);

            this.timeline = null;

            this.listenTo(this.model, 'change:estado sync', function () {
                this.loadTimeline();
            });
        },

        canAvanzar: function () {
            const user = this.getUser();

            if (user.isAdmin && user.isAdmin()) {
                return true;
            }

            return RadicacionFields.isJuridicaUser(user);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindUi();

            if (!this.timeline && this.model.id) {
                this.loadTimeline();
            }
        },

        loadTimeline: function () {
            const self = this;

            if (!this.model.id) {
                return;
            }

            Espo.Ajax.getRequest('Expediente/action/timeline', {id: this.model.id})
                .then(function (timeline) {
                    if (timeline && Array.isArray(timeline.steps)) {
                        timeline.steps = timeline.steps.map(function (step) {
                            step.isDone = step.state === 'done';
                            step.isCurrent = step.state === 'current';

                            return step;
                        });
                    }

                    self.timeline = timeline;
                    SafeUiPromise.safeReRender(self);
                })
                .catch(function () {
                    self.timeline = null;
                });
        },

        bindUi: function () {
            const self = this;

            this.$el.find('[data-action="avanzarPaso"]').off('click.avanzarPaso')
                .on('click.avanzarPaso', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.actionAvanzarPaso();
                });
        },

        actionAvanzarPaso: function () {
            const self = this;
            const siguiente = this.timeline && this.timeline.siguientePaso;

            Espo.Ui.confirm(
                siguiente
                    ? ('¿Marcar como completado el paso actual y avanzar a "' + siguiente + '"?')
                    : '¿Avanzar el expediente al siguiente paso?',
                {
                    title: 'Avanzar paso del expediente',
                    confirmText: 'Sí, avanzar',
                    cancelText: 'Cancelar',
                    confirmStyle: 'primary',
                },
                function () {
                    Espo.Ui.notify('Guardando...');

                    Espo.Ajax.postRequest('Expediente/action/avanzarPaso', {id: self.model.id})
                        .then(function (response) {
                            Espo.Ui.notify(false);
                            Espo.Ui.success('Expediente actualizado.');

                            if (response && response.estado) {
                                self.model.set('estado', response.estado);
                            }

                            self.model.fetch();
                            self.loadTimeline();
                        })
                        .catch(function (xhr) {
                            Espo.Ui.notify(false);

                            const message = (xhr && xhr.responseText)
                                ? String(xhr.responseText).replace(/^"|"$/g, '')
                                : 'Error';

                            Espo.Ui.error(message);
                        });
                }
            );
        },
    });
});
