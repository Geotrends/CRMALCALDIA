define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/radicacion-fields',
    'custom:helpers/inspeccion-case-flow',
    'custom:helpers/radicacion-case-flow',
    'custom:helpers/asignador-case-flow',
], function (Dep, PersonaTipoFields, RadicacionFields, InspeccionCaseFlow, RadicacionCaseFlow, AsignadorCaseFlow) {

    const PANEL_ASIGNACION = 'gestionPosteriorRadicacion';

    const findPanel = function (recordView, name) {
        return recordView.$el.find(
            '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel'
        );
    };

    return Dep.extend({

        bottomDisabled: true,

        getActionMenuHost: function () {
            if (typeof this.addMenuItem === 'function') {
                return this;
            }

            const header = typeof this.getHeaderView === 'function' ? this.getHeaderView() : null;

            if (header && typeof header.addMenuItem === 'function') {
                return header;
            }

            return null;
        },

        safeAddMenuItem: function (item) {
            const host = this.getActionMenuHost();

            if (!host) {
                return false;
            }

            host.addMenuItem('buttons', item);

            return true;
        },

        safeRemoveMenuItem: function (name) {
            const host = this.getActionMenuHost();

            if (!host || typeof host.removeMenuItem !== 'function') {
                return;
            }

            host.removeMenuItem(name);
        },

        findPrimaryActionButton: function (action) {
            const $action = this.$el.find('[data-action="' + action + '"]').filter(function () {
                return $(this).closest('.dropdown-menu').length === 0;
            }).first();

            if (!$action.length) {
                return $();
            }

            const $btn = $action.closest('.btn, a.btn, .dropdown-item, li').first();

            return $btn.length ? $btn : $action;
        },

        findAsignacionPrimaryButton: function () {
            let $btn = this.findPrimaryActionButton('edit');

            if (!$btn.length) {
                $btn = this.findPrimaryActionButton('saveAsignacion');
            }

            if (!$btn.length) {
                $btn = this.$el
                    .find('.detail-button-container .btn-primary, .header-buttons .btn-primary')
                    .first();
            }

            return $btn;
        },

        setPrimaryActionButtonAction: function ($btn, action) {
            if (!$btn || !$btn.length || !action) {
                return;
            }

            const $targets = $btn.find('[data-action]').add($btn.filter('[data-action]'));

            if ($targets.length) {
                $targets.attr('data-action', action);

                return;
            }

            $btn.attr('data-action', action);
        },

        setPrimaryActionButtonLabel: function ($btn, label) {
            $btn.find('.title, .btn-text').text(label);
            $btn.contents().filter(function () {
                return this.nodeType === 3;
            }).first().replaceWith(label);
        },

        setup: function () {
            this._asignacionEditMode = false;
            this._cancelAsignacionAdded = false;
            this._initialAssignedUserId = this.model.get('assignedUserId') || null;
            document.body.classList.remove('alcaldia-asignacion-detail-edit');

            Dep.prototype.setup.call(this);

            PersonaTipoFields.setup(this);
            InspeccionCaseFlow.setup(this);
            RadicacionCaseFlow.setup(this);
            AsignadorCaseFlow.setup(this);

            this.listenTo(this.model, 'change:assignedUserId', function () {
                if (this._asignacionEditMode) {
                    this.applyAsignacionFieldAccess();
                }
            });

            this.bindAsignacionEditIntercept();
        },

        bindAsignacionEditIntercept: function () {
            const self = this;

            this.$el.on('click.alcaldiaAsignacion', 'a[href*="/edit/"], [data-action="edit"]', function (e) {
                if (!self.isAsignadorOperator() || !RadicacionFields.isCaseRadicado(self.model)) {
                    return;
                }

                e.preventDefault();
                e.stopPropagation();
                self.enterAsignacionEditMode();
            });
        },

        isAsignadorOperator: function () {
            return AsignadorCaseFlow.isAsignadorUser(this.getUser());
        },

        scheduleAsignacionFieldAccess: function () {
            const self = this;

            [0, 150, 500, 1200].forEach(function (delay) {
                window.setTimeout(function () {
                    if (!self._asignacionEditMode) {
                        return;
                    }

                    self.applyAsignacionFieldAccess();
                }, delay);
            });
        },

        syncAsignacionBodyClass: function () {
            document.body.classList.toggle(
                'alcaldia-asignacion-detail-edit',
                !!(this._asignacionEditMode && this.mode === 'detail')
            );
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            InspeccionCaseFlow.schedule(this);
            RadicacionCaseFlow.schedule(this);
            AsignadorCaseFlow.schedule(this);

            if (this.isAsignadorOperator()) {
                this.updateAsignacionActionButtons();
            }
        },

        actionEdit: function () {
            if (this.isAsignadorOperator() && RadicacionFields.isCaseRadicado(this.model)) {
                this.enterAsignacionEditMode();

                return;
            }

            Dep.prototype.actionEdit.call(this);
        },

        actionCancelAsignacion: function () {
            this.cancelAsignacionEdit();
        },

        actionSaveAsignacion: function () {
            this.saveAsignacionEdit();
        },

        enterAsignacionEditMode: function () {
            const self = this;

            if (!RadicacionFields.isCaseRadicado(this.model)) {
                if (this.model && typeof this.model.fetch === 'function') {
                    this.model.fetch({
                        select: [
                            'cNumeroRadicado', 'cExpediente',
                            'assignedUserId', 'assignedUserName', 'cMotivoReasignacion',
                        ],
                    }).then(function () {
                        self.enterAsignacionEditMode();
                    });

                    return;
                }

                Espo.Ui.warning(this.translate('asignadorCaseNotReady', 'messages', 'Case') || 'El caso aún no está listo para asignación.');

                return;
            }

            this._asignacionBackup = {
                assignedUserId: this.model.get('assignedUserId'),
                assignedUserName: this.model.get('assignedUserName'),
                cMotivoReasignacion: this.model.get('cMotivoReasignacion'),
            };

            this._asignacionEditMode = true;
            this.syncAsignacionBodyClass();
            this.applyAsignacionFieldAccess();
            this.scheduleAsignacionFieldAccess();
            this.updateAsignacionActionButtons();
        },

        cancelAsignacionEdit: function () {
            if (this._asignacionBackup) {
                this.model.set(this._asignacionBackup, {silent: true});
            }

            this.exitAsignacionEditMode();
        },

        exitAsignacionEditMode: function () {
            this._asignacionEditMode = false;
            this.syncAsignacionBodyClass();

            if (this._cancelAsignacionAdded) {
                this.safeRemoveMenuItem('cancelAsignacion');
                this._cancelAsignacionAdded = false;
            }

            this.updateAsignacionActionButtons();
            AsignadorCaseFlow.schedule(this);
        },

        getAsignacionEditableFields: function () {
            const fields = ['assignedUser'];

            if (AsignadorCaseFlow.isReasignacionCaseOnOpen(this.model)) {
                fields.push('cMotivoReasignacion');
            }

            return fields;
        },

        applyAsignacionFieldAccess: function () {
            if (!this._asignacionEditMode || !this.isAsignadorOperator()) {
                return;
            }

            const editableFields = this.getAsignacionEditableFields();
            const $panel = findPanel(this, PANEL_ASIGNACION);

            if ($panel.length) {
                $panel.show().removeClass('hidden alcaldia-inspeccion-asignacion-hidden');
            }

            editableFields.forEach(function (field) {
                this.$el
                    .find('[data-name="' + field + '"]')
                    .closest('.cell, .field')
                    .show()
                    .removeClass('hidden alcaldia-inspeccion-asignacion-hidden alcaldia-field-readonly');
            }, this);

            this.setReadOnlyExcept(editableFields);
            this.remountAssignedUserForEdit();
            this.enableAsignacionFields();
        },

        setReadOnlyExcept: function (editableFields) {
            const editable = editableFields || [];
            const recordView = this;

            (this.fieldList || []).forEach(function (field) {
                if (editable.indexOf(field) !== -1) {
                    return;
                }

                const view = recordView.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        remountAssignedUserForEdit: function () {
            if (!this._asignacionEditMode) {
                return;
            }

            const $panel = findPanel(this, PANEL_ASIGNACION);
            let $cell = $panel.find('.cell[data-name="assignedUser"], .field[data-name="assignedUser"]').first();

            if (!$cell.length) {
                $cell = this.$el.find('.cell[data-name="assignedUser"], .field[data-name="assignedUser"]').first();
            }

            if (!$cell.length) {
                return;
            }

            $cell.closest('.cell, .field').show().removeClass('hidden');

            const existing = this.getFieldView('assignedUser');

            if (existing) {
                existing.readOnly = false;

                if (typeof existing.setMode === 'function' && existing.mode !== 'edit') {
                    existing.setMode('edit');

                    return;
                }

                if (
                    existing.mode === 'edit'
                    && existing.$el
                    && existing.$el.find('[data-action="selectLink"], [data-action="editLink"]').length
                ) {
                    if (typeof existing.showSelectControls === 'function') {
                        existing.showSelectControls();
                    }

                    return;
                }
            }

            if (this._remountingAssignedUser || typeof this.createFieldView !== 'function') {
                return;
            }

            this._remountingAssignedUser = true;

            if (existing && typeof existing.remove === 'function') {
                existing.remove();
            }

            const cellId = 'alcaldia-assigned-user-' + (this.model.id || this.cid);
            $cell.attr('id', cellId).empty();

            const self = this;
            const mountView = function (view) {
                self._remountingAssignedUser = false;

                if (!view) {
                    return;
                }

                view.readOnly = false;
                view.render();

                if (typeof view.showSelectControls === 'function') {
                    view.showSelectControls();
                }
            };

            this.createFieldView('assignedUser', null, '#' + cellId, {
                mode: 'edit',
                readOnly: false,
            }, mountView);
        },

        enableAsignacionFields: function () {
            const self = this;

            ['assignedUser', 'cMotivoReasignacion'].forEach(function (field) {
                const view = self.getFieldView(field);

                if (view && typeof view.setReadOnly === 'function') {
                    view.setReadOnly(false);
                }
            });
        },

        syncAsignacionFields: function () {
            this.getAsignacionEditableFields().forEach(function (field) {
                const view = this.getFieldView(field);

                if (!view || typeof view.fetch !== 'function') {
                    return;
                }

                this.model.set(view.fetch());
            }, this);
        },

        saveAsignacionEdit: function () {
            this.syncAsignacionFields();
            AsignadorCaseFlow.prepareModelForSave(this);

            const assignedUserId = this.model.get('assignedUserId');

            if (!assignedUserId) {
                Espo.Ui.error(this.translate('validationRequired', 'messages')
                    .replace('{field}', this.translate('assignedUser', 'fields', 'Case')));

                return;
            }

            const data = {
                assignedUserId: assignedUserId,
                assignedUserName: this.model.get('assignedUserName'),
            };

            if (AsignadorCaseFlow.isReasignacionCaseOnSave(this.model)) {
                const motivo = String(this.model.get('cMotivoReasignacion') || '').trim();

                if (!motivo) {
                    Espo.Ui.error(this.translate('validationRequired', 'messages')
                        .replace('{field}', this.translate('cMotivoReasignacion', 'fields', 'Case')));

                    return;
                }

                data.cMotivoReasignacion = motivo;
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const self = this;

            this.model.save(data, {patch: true}).then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success(self.translate('caseEditedSuccess', 'labels', 'Case') || 'Guardado');
                self._initialAssignedUserId = assignedUserId;
                self.exitAsignacionEditMode();

                return self.model.fetch();
            }).catch(function (error) {
                Espo.Ui.notify(false);

                const message = (error && (error.message || error.statusText))
                    || self.translate('Error');

                Espo.Ui.error(message);
            });
        },

        updateAsignacionActionButtons: function () {
            if (!this.isAsignadorOperator()) {
                return;
            }

            const $editBtn = this.findAsignacionPrimaryButton();

            if (!$editBtn.length) {
                return;
            }

            this.$el.find('[data-action="delete"], [data-action="remove"]')
                .closest('.btn, .dropdown-item, li')
                .hide();

            if (this._asignacionEditMode) {
                $editBtn.show();
                this.setPrimaryActionButtonLabel($editBtn, this.translate('Save', 'labels', 'Global'));
                this.setPrimaryActionButtonAction($editBtn, 'saveAsignacion');
                $editBtn.off('click.alcaldiaSave');

                if (!this._cancelAsignacionAdded) {
                    if (this.safeAddMenuItem({
                        label: this.translate('Cancel', 'labels', 'Global'),
                        name: 'cancelAsignacion',
                        action: 'cancelAsignacion',
                    })) {
                        this._cancelAsignacionAdded = true;
                    }
                }

                return;
            }

            $editBtn.show();
            $editBtn.off('click.alcaldiaSave');
            this.setPrimaryActionButtonLabel($editBtn, this.translate('Edit', 'labels', 'Global'));
            this.setPrimaryActionButtonAction($editBtn, 'edit');
        },

        remove: function () {
            this.$el.off('click.alcaldiaAsignacion');
            document.body.classList.remove('alcaldia-asignacion-detail-edit');
            Dep.prototype.remove.call(this);
        },

        prepareModelForSave: function () {
            InspeccionCaseFlow.prepareModelForSave(this);
            RadicacionCaseFlow.prepareModelForSave(this);
            AsignadorCaseFlow.prepareModelForSave(this);

            Dep.prototype.prepareModelForSave.apply(this, arguments);
        },
    });
});
