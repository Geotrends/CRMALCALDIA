define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/formato-solicitud-access',
    'custom:helpers/formato-acta-visita-case-access',
    'custom:helpers/inspeccion-actuo-archivo',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/formato-actuo-archivo-case-access',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, ActaVisitaModal, ActaVisitaCaseStatus, FormatoSolicitudAccess, FormatoActaVisitaCaseAccess, InspeccionActuoArchivo, ActuoArchivoModal, ActuoArchivoCaseStatus, FormatoActuoArchivoCaseAccess) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this._actaVisitaButtonAdded = false;
            this._actuoArchivoButtonAdded = false;

            this.listenTo(this.model, 'change', function () {
                this.toggleActaPanels();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:assignedUserId', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.toggleFormatoGeneradoPanel();
                this.toggleFormatoActaVisitaPanel();
            });

            this.listenTo(this.model, 'change:status', function () {
                this.toggleActuoArchivoPanels();
                this.toggleFormatoActuoArchivoPanel();

                if (this.isRendered()) {
                    this.updateActuoArchivoButton();
                }
            });

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente', function () {
                if (this.isRendered()) {
                    this.updateActaVisitaButton();
                }
            });
        },

        updateActaVisitaButton: function () {
            const show = PatrulleroActa.shouldShowLlenarActaButton(this.getUser(), this.model);

            if (!show) {
                if (this._actaVisitaButtonAdded) {
                    this.removeMenuItem('llenarActaVisita');
                    this._actaVisitaButtonAdded = false;
                }

                return;
            }

            if (!this.model.id) {
                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id).then((acta) => {
                const isEdit = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                const label = isEdit
                    ? this.translate('editarActaVisita', 'Case')
                    : this.translate('llenarActaVisita', 'Case');

                if (this._actaVisitaButtonAdded) {
                    this.removeMenuItem('llenarActaVisita');
                    this._actaVisitaButtonAdded = false;
                }

                this.addMenuItem('buttons', {
                    label: label,
                    name: 'llenarActaVisita',
                    action: 'llenarActaVisita',
                    style: 'primary',
                });
                this._actaVisitaButtonAdded = true;
            });
        },

        actionLlenarActaVisita: function () {
            ActaVisitaModal.open(this, this.model, this.getUser(), {
                onAfterSave: () => this.updateActaVisitaButton(),
            });
        },

        updateActuoArchivoButton: function () {
            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(this.getUser(), this.model);

            if (!show) {
                if (this._actuoArchivoButtonAdded) {
                    this.removeMenuItem('llenarActuoArchivo');
                    this._actuoArchivoButtonAdded = false;
                }

                return;
            }

            if (!this.model.id) {
                return;
            }

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id).then((actuo) => {
                const isEdit = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);
                const label = isEdit
                    ? this.translate('editarActuoArchivo', 'Case')
                    : this.translate('llenarActuoArchivo', 'Case');

                if (this._actuoArchivoButtonAdded) {
                    this.removeMenuItem('llenarActuoArchivo');
                    this._actuoArchivoButtonAdded = false;
                }

                this.addMenuItem('buttons', {
                    label: label,
                    name: 'llenarActuoArchivo',
                    action: 'llenarActuoArchivo',
                    style: 'primary',
                });
                this._actuoArchivoButtonAdded = true;
            });
        },

        actionLlenarActuoArchivo: function () {
            ActuoArchivoModal.open(this, this.model, this.getUser(), {
                onAfterSave: () => this.updateActuoArchivoButton(),
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            this.updateActaVisitaButton();
            this.updateActuoArchivoButton();
            this.toggleActaPanels();
            this.toggleActuoArchivoPanels();
            this.setActaFieldsReadOnlyForReview();
            this.toggleRadicacionFields();
            this.togglePostRadicacionFields();
            this.toggleFormatoGeneradoPanel();
            this.toggleFormatoActaVisitaPanel();
            this.toggleFormatoActuoArchivoPanel();
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

        toggleFormatoGeneradoPanel: function () {
            const show = FormatoSolicitudAccess.canDownloadFormatoSolicitud(
                this.getUser(),
                this.model
            );

            this.findPanel('formatoGenerado').toggle(show);
        },

        toggleFormatoActaVisitaPanel: function () {
            const show = FormatoActaVisitaCaseAccess.canDownloadFormatoActaVisitaFromCase(
                this.getUser(),
                this.model
            );

            this.findPanel('formatoActaVisita').toggle(show);
        },

        toggleActuoArchivoPanels: function () {
            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(
                this.getUser(),
                this.model
            );

            this.findPanel('actuoArchivoPanel').toggle(show);
        },

        toggleFormatoActuoArchivoPanel: function () {
            const show = FormatoActuoArchivoCaseAccess.canDownloadFormatoActuoArchivoFromCase(
                this.getUser(),
                this.model
            );

            this.findPanel('formatoActuoArchivo').toggle(show);
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
