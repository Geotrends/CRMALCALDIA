define('custom:views/case/record/edit', [
    'views/record/edit',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.applyFieldModes();
            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();
        },

        applyFieldModes: function () {
            const user = this.getUser();
            const model = this.model;

            if (PatrulleroActa.shouldShowActaVisita(user, model)) {
                this.setReadOnlyExcept([
                    'cActaFechaVisita',
                    'cActaHoraVisita',
                    'cActaDireccionVisita',
                    'cActaNombreVisitado',
                    'cActaDocumentoVisitado',
                    'cActaHallazgos',
                    'cActaMedidasTomadas',
                    'cActaObservaciones',
                ]);

                return;
            }

            if (InspeccionActa.shouldShowActaRevision(user, model)) {
                this.setReadOnlyExcept([
                    'cActaVistoBueno',
                    'cActaObservacionesRevision',
                ]);

                return;
            }

            if (InspeccionActa.shouldFinalizeCaseStatus(user, model)) {
                this.setReadOnlyExcept(['status']);

                return;
            }

            if (InspeccionActa.shouldShowActoCierre(user, model)) {
                this.setReadOnlyExcept([
                    'cCierreFecha',
                    'cCierreResumen',
                    'cCierreConclusiones',
                    'cCierreMedidasAdoptadas',
                    'cCierreObservaciones',
                ]);
            }
        },

        toggleRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = RadicacionFields.shouldShowRadicacionFields(user, model);
            const canEdit = RadicacionFields.isRadicacionUser(user);

            RadicacionFields.RADICADO_FIELDS.forEach((field) => {
                const $cell = this.$el.find('[data-name="' + field + '"]').closest('.cell');

                if ($cell.length) {
                    $cell.show();
                }

                if (!show) {
                    if ($cell.length) {
                        $cell.hide();
                    }

                    return;
                }

                const view = this.getFieldView(field);

                if (!view) {
                    return;
                }

                if (canEdit && typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                } else if (!canEdit && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = PostRadicacionFields.shouldShowAsignacion(user, model);
            const canEdit = PostRadicacionFields.canEditAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            if (!show) {
                return;
            }

            const view = this.getFieldView('assignedUser');

            if (!view) {
                return;
            }

            if (canEdit && typeof view.setNotReadOnly === 'function') {
                view.setNotReadOnly();
            } else if (!canEdit && typeof view.setReadOnly === 'function') {
                view.setReadOnly();
            }
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        setReadOnlyExcept: function (editableFields) {
            Object.keys(this.getFieldList()).forEach((field) => {
                if (editableFields.includes(field)) {
                    return;
                }

                const view = this.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },
    });
});
