define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/patrullero-acta',
    'custom:helpers/inspeccion-acta',
    'custom:helpers/radicacion-fields',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/acta-visita-modal',
    'custom:helpers/acta-visita-case-status',
    'custom:helpers/inspeccion-actuo-archivo',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/radicado-generator',
    'custom:helpers/radicado-assistant-panel',
    'custom:helpers/inspeccion-registro-excel',
    'custom:helpers/case-documentos',
    'custom:helpers/case-detail-panels',
], function (Dep, PatrulleroActa, InspeccionActa, RadicacionFields, PostRadicacionFields, ActaVisitaModal, ActaVisitaCaseStatus, InspeccionActuoArchivo, ActuoArchivoModal, ActuoArchivoCaseStatus, PersonaTipoFields, RadicadoGenerator, RadicadoAssistantPanel, InspeccionRegistroExcel, CaseDocumentos, CaseDetailPanels) {

    return Dep.extend({

        bottomDisabled: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            this._actaVisitaButtonAdded = false;
            this._actuoArchivoButtonAdded = false;

            this.listenTo(this.model, 'change', function () {
                this.toggleActaPanels();
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
            });

            this.listenTo(this.model, 'change:cNumeroRadicado change:cExpediente change:assignedUserId change:cFormatoSolicitudPdfId change:status', function () {
                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.scheduleRefreshActaVisitaPanel();
                this.scheduleRefreshFormatoGeneradoDocs();
            });

            this.listenTo(this.model, 'change:status', function () {
                this.toggleActuoArchivoPanels();
                this.scheduleRefreshFormatoGeneradoDocs();

                if (this.isRendered()) {
                    this.updateActuoArchivoButton();
                }
            });

            this.listenTo(this.model, 'change:status change:assignedUserId change:cNumeroRadicado change:cExpediente', function () {
                if (this.isRendered()) {
                    this.updateActaVisitaButton();
                }
            });

            this.listenTo(this.model, 'sync', function () {
                if (this.model.id) {
                    CaseDetailPanels.invalidate(this.model.id);
                    ActaVisitaCaseStatus.invalidateCache(this.model.id);
                    ActuoArchivoCaseStatus.invalidateCache(this.model.id);
                }
            });

            PersonaTipoFields.setup(this);

            RadicacionFields.onProfileReady(() => {
                if (!this.isRendered()) {
                    return;
                }

                this.toggleRadicacionFields();
                this.togglePostRadicacionFields();
                this.toggleRegistroExcelPanel();
            });
        },

        updateActaVisitaButton: function () {
            if (!this.model.id) {
                if (this._actaVisitaButtonAdded) {
                    this.removeMenuItem('llenarActaVisita');
                    this._actaVisitaButtonAdded = false;
                }

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(this.model.id, this.getUser(), this.model, { bypassCache: true }).then((acta) => {
                const show = PatrulleroActa.shouldShowActaVisitaButton(this.getUser(), this.model, acta);

                if (!show) {
                    if (this._actaVisitaButtonAdded) {
                        this.removeMenuItem('llenarActaVisita');
                        this._actaVisitaButtonAdded = false;
                    }

                    return;
                }

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
                onAfterSave: () => {
                    if (this.model.id) {
                        ActaVisitaCaseStatus.invalidateCache(this.model.id);
                    }

                    this.updateActaVisitaButton();
                    this.refreshActaVisitaPanel();
                    this.refreshFormatoGeneradoDocs();
                },
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

            ActuoArchivoCaseStatus.fetchActuoForCase(this.model.id, this.getUser(), this.model).then((actuo) => {
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
                onAfterSave: () => {
                    if (this.model.id) {
                        ActuoArchivoCaseStatus.invalidateCache(this.model.id);
                    }

                    this.updateActuoArchivoButton();
                    this.refreshFormatoGeneradoDocs();
                },
            });
        },

        actionEdit: function () {
            this.getRouter().navigate(
                '#' + this.entityType + '/edit/' + this.model.id,
                {trigger: true}
            );
        },

        actionDelete: function (data) {
            return this.confirm({
                message: this.translate('removeRecordConfirmation', 'messages')
                    .replace('{entityType}', this.translateEntityType(this.entityType, 'singular')),
            }).then((confirmed) => {
                if (!confirmed) {
                    return false;
                }

                Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

                return this.model.destroy({wait: true}).then(() => {
                    Espo.Ui.notify(false);
                    Espo.Ui.success(this.translate('caseDeletedSuccess', 'labels', 'Case'));
                    this.exit('delete');
                }).catch((error) => {
                    Espo.Ui.notify(false);

                    return Promise.reject(error);
                });
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            PersonaTipoFields.hidePartyLinks(this);
            PersonaTipoFields.applyLabels(this);
            PersonaTipoFields.toggleInfractorFields(this);
            RadicadoGenerator.hideAssistantFields(this);
            this.updateActaVisitaButton();
            this.updateActuoArchivoButton();
            this.toggleActaPanels();
            this.toggleActuoArchivoPanels();
            this.setActaFieldsReadOnlyForReview();

            const self = this;
            const applyRoleUi = function () {
                self.toggleRadicacionFields();
                self.togglePostRadicacionFields();
                self.toggleRegistroExcelPanel();
            };

            RadicacionFields.ensureProfile().then(applyRoleUi);

            this.scheduleRefreshActaVisitaPanel();
            this.scheduleRefreshFormatoGeneradoDocs();
        },

        scheduleRefreshFormatoGeneradoDocs: function () {
            if (this._refreshDocsTimer) {
                clearTimeout(this._refreshDocsTimer);
            }

            this._refreshDocsTimer = setTimeout(() => {
                this._refreshDocsTimer = null;
                this.refreshFormatoGeneradoDocs();
            }, 80);
        },

        scheduleRefreshActaVisitaPanel: function () {
            if (this._refreshActaTimer) {
                clearTimeout(this._refreshActaTimer);
            }

            this._refreshActaTimer = setTimeout(() => {
                this._refreshActaTimer = null;
                this.refreshActaVisitaPanel();
            }, 80);
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

            const showRevision = InspeccionActa.shouldShowActaRevision(user, model);

            if ($revision.length) {
                $revision.toggle(showRevision);
            }

            if (!$acta.length) {
                return;
            }

            if (!model.id) {
                $acta.toggle(false);

                return;
            }

            ActaVisitaCaseStatus.fetchActaForCase(model.id, user, model, { bypassCache: true }).then((acta) => {
                const showActa = PatrulleroActa.shouldShowActaVisitaButton(user, model, acta)
                    || PatrulleroActa.canPrintManualActa(user, model);

                $acta.toggle(showActa);
            });
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

        toggleRegistroExcelPanel: function () {
            InspeccionRegistroExcel.togglePanel(this);
        },

        toggleFormatoGeneradoPanel: function () {
            if (!this.model.id) {
                this.findPanel('formatoGenerado').hide();

                return;
            }

            const fieldView = this.getFieldView('cFormatoSolicitudPdf');

            if (fieldView && Array.isArray(fieldView.documentos)) {
                this.findPanel('formatoGenerado').toggle(fieldView.documentos.length > 0);

                return;
            }

            CaseDocumentos.hasVisibleDocumentos(this.model, this.getUser(), this.getBasePath()).then((show) => {
                this.findPanel('formatoGenerado').toggle(show);
            });
        },

        refreshFormatoGeneradoDocs: function () {
            const fieldView = this.getFieldView('cFormatoSolicitudPdf');

            if (!fieldView || typeof fieldView.loadDocumentos !== 'function') {
                this.toggleFormatoGeneradoPanel();

                return;
            }

            fieldView.loadDocumentos().then(() => {
                this.toggleFormatoGeneradoPanel();
            });
        },

        refreshActaVisitaPanel: function () {
            const fieldView = this.getFieldView('cPanelActaVisita');

            if (fieldView && typeof fieldView.loadActaState === 'function') {
                fieldView.loadActaState();
            }

            this.toggleActaPanels();
        },

        toggleActuoArchivoPanels: function () {
            const show = InspeccionActuoArchivo.shouldShowActuoArchivoButton(
                this.getUser(),
                this.model
            );

            this.findPanel('actuoArchivoPanel').toggle(show);
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

            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.hide();
            }
        },
    });
});
