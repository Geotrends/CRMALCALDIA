define('custom:views/case/record/edit', [
    'views/record/edit',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/party-document-lookup',
    'custom:helpers/direccion-estructurada',
    'custom:helpers/radicacion-fields',
    'custom:helpers/inspeccion-case-flow',
    'custom:helpers/radicacion-case-flow',
    'custom:helpers/asignador-case-flow',
    'custom:helpers/asignador-assignment-ui',
    'custom:helpers/case-create-form',
    'custom:helpers/case-create-optional-fields',
], function (Dep, PersonaTipoFields, PartyDocumentLookup, DireccionEstructurada, RadicacionFields, InspeccionCaseFlow, RadicacionCaseFlow, AsignadorCaseFlow, AsignadorAssignmentUi, CaseCreateForm, CaseCreateOptionalFields) {

    return Dep.extend({

        setup: function () {
            CaseCreateForm.setup(this);
            CaseCreateOptionalFields.setup(this);
            InspeccionCaseFlow.setup(this);
            RadicacionCaseFlow.setup(this);
            AsignadorCaseFlow.setup(this);

            Dep.prototype.setup.call(this);

            if (this.model.isNew()) {
                this.isWide = true;
            }

            if (
                !this.model.isNew()
                && RadicacionFields.isAsignadorUser(this.getUser())
                && RadicacionFields.isCaseRadicado(this.model)
            ) {
                this._asignarMode = true;
                this.sideDisabled = true;
                this.bottomDisabled = true;
                document.body.classList.add('alcaldia-asignador-asignar-page');

                if (AsignadorCaseFlow.isReasignacionCaseOnOpen(this.model)) {
                    document.body.classList.add('alcaldia-reasignacion-caso');
                }

                const self = this;
                const protoSetReadOnly = Dep.prototype.setReadOnly;

                if (typeof protoSetReadOnly === 'function') {
                    this.setReadOnly = function () {
                        protoSetReadOnly.apply(self, arguments);

                        window.setTimeout(function () {
                            AsignadorAssignmentUi.ensureAssignedUserEditable(self);
                        }, 0);
                    };
                }
            }

            const self = this;

            RadicacionFields.onProfileReady(function () {
                if (
                    self.model.isNew()
                    || !RadicacionCaseFlow.shouldUseRadicarMode(self)
                ) {
                    return;
                }

                self._radicarMode = true;
                self.sideDisabled = true;
                self.bottomDisabled = true;
                RadicacionCaseFlow.clearSkipRadicacionAutoEdit(self.model.id);

                if (self.isRendered && self.isRendered()) {
                    RadicacionCaseFlow.schedule(self);
                }
            });

            PersonaTipoFields.setup(this);
            PartyDocumentLookup.setup(this);
            DireccionEstructurada.setup(this);
        },

        navigateToDetailAfterAssignmentSave: function () {
            AsignadorAssignmentUi.consumeAssignmentSession(this.model.id);

            const scope = this.scope || this.entityType || 'Case';
            const url = '#' + scope + '/view/' + this.model.id;
            const router = typeof this.getRouter === 'function' ? this.getRouter() : null;

            if (router && typeof router.navigate === 'function') {
                router.navigate(url, {trigger: true});

                return;
            }

            window.location.hash = url;
        },

        actionSave: function () {
            if (
                !this._asignarMode
                || this.model.isNew()
                || !RadicacionFields.isAsignadorUser(this.getUser())
                || !RadicacionFields.isCaseRadicado(this.model)
            ) {
                if (this._radicarMode && this.model.id) {
                    RadicacionCaseFlow.clearSkipRadicacionAutoEdit(this.model.id);
                }

                return Dep.prototype.actionSave.apply(this, arguments);
            }

            this.prepareModelForSave();

            if (typeof this.fetch === 'function') {
                this.model.set(this.fetch());
            }

            const assignedUserId = this.model.get('assignedUserId');

            if (!assignedUserId) {
                Espo.Ui.error(this.translate('validationRequired', 'messages')
                    .replace('{field}', this.translate('assignedUser', 'fields', 'Case')));

                return;
            }

            if (AsignadorCaseFlow.isReasignacionCaseOnSave(this.model)) {
                const motivo = String(this.model.get('cMotivoReasignacion') || '').trim();

                if (!motivo) {
                    Espo.Ui.error(this.translate('validationRequired', 'messages')
                        .replace('{field}', this.translate('cMotivoReasignacion', 'fields', 'Case')));

                    return;
                }
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const self = this;

            return this.model.save().then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success(self.translate('Saved'));
                self.navigateToDetailAfterAssignmentSave();
            }).catch(function (error) {
                Espo.Ui.notify(false);

                const message = (error && (error.message || error.statusText))
                    || self.translate('Error');

                Espo.Ui.error(message);
            });
        },

        actionCancel: function () {
            if (
                this._radicarMode
                && !this.model.isNew()
                && RadicacionFields.isRadicacionUser(this.getUser())
            ) {
                RadicacionCaseFlow.markSkipRadicacionAutoEdit(this.model.id);

                const scope = this.scope || this.entityType || 'Case';
                const url = '#' + scope + '/view/' + this.model.id;
                const router = typeof this.getRouter === 'function' ? this.getRouter() : null;

                if (router && typeof router.navigate === 'function') {
                    router.navigate(url, {trigger: true});

                    return;
                }

                window.location.hash = url;

                return;
            }

            if (
                this._asignarMode
                && !this.model.isNew()
                && RadicacionFields.isAsignadorUser(this.getUser())
            ) {
                AsignadorAssignmentUi.clearAssignmentSession();

                const scope = this.scope || this.entityType || 'Case';
                const url = '#' + scope + '/view/' + this.model.id;
                const router = typeof this.getRouter === 'function' ? this.getRouter() : null;

                if (router && typeof router.navigate === 'function') {
                    router.navigate(url, {trigger: true});

                    return;
                }

                window.location.hash = url;

                return;
            }

            return Dep.prototype.actionCancel.apply(this, arguments);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            PartyDocumentLookup.bindDom(this);
            InspeccionCaseFlow.schedule(this);
            RadicacionCaseFlow.schedule(this);
            AsignadorCaseFlow.schedule(this);
            CaseCreateForm.schedule(this);
            CaseCreateOptionalFields.schedule(this);

            if (
                this._asignarMode
                && RadicacionFields.isAsignadorUser(this.getUser())
                && RadicacionFields.isCaseRadicado(this.model)
            ) {
                AsignadorAssignmentUi.scheduleEditableFields(this);
            }
        },

        remove: function () {
            if (this._asignarMode) {
                AsignadorAssignmentUi.clearAssignmentSession();
            }

            Dep.prototype.remove.call(this);
        },

        prepareModelForSave: function () {
            if (PersonaTipoFields.isInfractorDesconocido(this.model.get('cTipoPersonaPerjudicante'))) {
                PersonaTipoFields.clearInfractorFields(this);
            }

            PersonaTipoFields.clearOptionalEnumPlaceholders(this.model);
            CaseCreateOptionalFields.makeAllFieldsOptional(this);

            if (this.model.isNew() && !this.model.get('priority')) {
                this.model.set('priority', 'Normal', {silent: true});
            }

            InspeccionCaseFlow.prepareModelForSave(this);
            RadicacionCaseFlow.prepareModelForSave(this);
            AsignadorCaseFlow.prepareModelForSave(this);

            Dep.prototype.prepareModelForSave.apply(this, arguments);
        },
    });
});
