define('custom:views/case/record/edit', [
    'views/record/edit',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/case-create-defaults',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/radicado-generator',
    'custom:helpers/radicado-assistant-panel',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, CaseCreateDefaults, PersonaTipoFields, RadicadoGenerator, RadicadoAssistantPanel) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                CaseCreateDefaults.apply(this.model);
                PersonaTipoFields.applyDefaults(this.model);
                this.clearAssignedUserOnCreate();
            }

            this.listenTo(this.model, 'change:cTipoPersonaPeticionario change:cTipoPersonaPerjudicante', function () {
                PersonaTipoFields.toggle(this);
            });

            this.listenTo(this.model, 'change:assignedUserId', function () {
                if (this.model.isNew()) {
                    this.clearAssignedUserOnCreate();
                }
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:cRadicadoModo change:cRadicadoSiglas change:cRadicadoAnio', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            RadicadoGenerator.setup(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.model.isNew()) {
                CaseCreateDefaults.apply(this.model);
                PersonaTipoFields.applyDefaults(this.model);
                this.clearAssignedUserOnCreate();
            }

            PersonaTipoFields.toggle(this);
            this.applyFieldModes();
            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();

            if (RadicadoAssistantPanel.canShow(this)) {
                RadicadoAssistantPanel.mount(this);
            } else {
                RadicadoAssistantPanel.unmount(this);
                RadicadoGenerator.toggle(this);
            }
        },

        clearAssignedUserOnCreate: function () {
            if (PostRadicacionFields.shouldShowAsignacion(this.getUser(), this.model)) {
                return;
            }

            if (this.model.get('assignedUserId')) {
                this.model.set({
                    assignedUserId: null,
                    assignedUserName: null,
                }, {silent: true});
            }

            this.findPanel('gestionPosteriorRadicacion').hide();
            this.$el.find('[data-name="assignedUser"]').closest('.cell, .field').hide();
        },

        applyFieldModes: function () {
            const user = this.getUser();
            const model = this.model;

            if (PatrulleroActa.shouldShowLlenarActaButton(user, model)) {
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

            if (RadicadoAssistantPanel.canShow(this)) {
                RadicadoAssistantPanel.mount(this);

                return;
            }

            const show = RadicacionFields.shouldShowRadicacionFields(user, model);
            const canEdit = RadicacionFields.isRadicacionUser(user);

            RadicacionFields.RADICADO_FIELDS.concat(RadicadoGenerator.ASSISTANT_FIELDS).forEach((field) => {
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

            if (show && canEdit) {
                RadicadoGenerator.toggle(this);
            }
        },

        togglePostRadicacionFields: function () {
            const user = this.getUser();
            const model = this.model;
            const show = !model.isNew() && PostRadicacionFields.shouldShowAsignacion(user, model);
            const canEdit = PostRadicacionFields.canEditAsignacion(user, model);

            this.findPanel('gestionPosteriorRadicacion').toggle(show);

            const $cell = this.$el.find('[data-name="assignedUser"]').closest('.cell');

            if ($cell.length) {
                $cell.toggle(show);
            }

            if (!show) {
                if (model.isNew() && model.get('assignedUserId')) {
                    model.set({
                        assignedUserId: null,
                        assignedUserName: null,
                    }, {silent: true});
                }

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
