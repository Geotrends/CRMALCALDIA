define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/acta-visita-modal',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, ActaVisitaModal) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this._actaVisitaButtonAdded = false;

            this.listenTo(this.model, 'change', function () {
                this.toggleActaPanels();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente', function () {
                if (this.isRendered()) {
                    this.updateActaVisitaButton();
                }
            });
        },

        updateActaVisitaButton: function () {
            const show = PatrulleroActa.shouldShowLlenarActaButton(this.getUser(), this.model);

            if (show) {
                if (!this._actaVisitaButtonAdded) {
                    this.addMenuItem('buttons', {
                        label: 'Llenar acta de visita',
                        name: 'llenarActaVisita',
                        action: 'llenarActaVisita',
                        style: 'primary',
                    });
                    this._actaVisitaButtonAdded = true;
                }
            } else if (this._actaVisitaButtonAdded) {
                this.removeMenuItem('llenarActaVisita');
                this._actaVisitaButtonAdded = false;
            }
        },

        actionLlenarActaVisita: function () {
            ActaVisitaModal.open(this, this.model, this.getUser());
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.updateActaVisitaButton();
            this.toggleActaPanels();
            this.setActaFieldsReadOnlyForReview();
            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        toggleActaPanels: function () {
            const user = this.getUser();
            const model = this.model;

            const $acta = this.findPanel('actaVisita');
            const $revision = this.findPanel('actaRevision');

            const showPatrullero = PatrulleroActa.shouldShowLlenarActaButton(user, model);
            const showForReview = InspeccionActa.shouldShowActaVisitaReadOnly(user, model);
            const showRevision = InspeccionActa.shouldShowActaRevision(user, model);

            if ($acta.length) {
                $acta.toggle(showPatrullero || showForReview);
            }

            if ($revision.length) {
                $revision.toggle(showRevision);
            }
        },

        setActaFieldsReadOnlyForReview: function () {
            if (!InspeccionActa.shouldShowActaVisitaReadOnly(this.getUser(), this.model)) {
                return;
            }

            if (InspeccionActa.shouldShowActaRevision(this.getUser(), this.model)) {
                return;
            }

            const actaFields = [
                'cActaFechaVisita',
                'cActaHoraVisita',
                'cActaDireccionVisita',
                'cActaNombreVisitado',
                'cActaDocumentoVisitado',
                'cActaHallazgos',
                'cActaMedidasTomadas',
                'cActaObservaciones',
                'cActaEstado',
            ];

            actaFields.forEach((field) => {
                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        toggleRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = RadicacionFields.shouldShowRadicacionFields(user, model);

            RadicacionFields.RADICADO_FIELDS.forEach((field) => {
                const $cell = this.$el.find('[data-name="' + field + '"]').closest('.cell');

                if (!$cell.length) {
                    return;
                }

                if (show) {
                    $cell.show();
                } else {
                    $cell.hide();
                }
            });
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = PostRadicacionFields.shouldShowAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }
        },
    });
});
