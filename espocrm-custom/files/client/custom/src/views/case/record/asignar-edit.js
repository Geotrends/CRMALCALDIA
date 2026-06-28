define('custom:views/case/record/asignar-edit', [
    'views/record/edit',
    'custom:helpers/asignador-edit-mode',
    'custom:helpers/post-radicacion-fields',
    'custom:helpers/radicacion-fields',
], function (Dep, AsignadorEditMode, PostRadicacionFields, RadicacionFields) {

    return Dep.extend({

        layoutName: 'asignar',
        sideDisabled: true,
        bottomDisabled: true,
        isWide: false,

        setup: function () {
            Dep.prototype.setup.call(this);

            this._asignarMode = true;

            if (!this.model) {
                return;
            }

            this._initialAssignedUserId = this.model.get('assignedUserId') || null;

            if (!PostRadicacionFields.isCasePostRadicado(this.model)) {
                Espo.Ui.warning(this.translate('asignadorCaseNotReady', 'messages', 'Case'));
                this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});

                return;
            }

            this.buttonList = [
                {
                    name: 'save',
                    label: 'Save',
                    style: 'primary',
                },
                {
                    name: 'cancel',
                    label: 'Cancel',
                },
            ];

            RadicacionFields.ensureProfile(this.getUser());

            this.listenTo(this.model, 'change:assignedUserId', function () {
                this.toggleMotivoReasignacion();
                this.ensureAssignmentFieldsEditable();
            });
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            $('body').addClass('alcaldia-asignador-asignar-page');
            this.applyAsignacionUi();

            window.setTimeout(() => {
                if (this.isRendered && this.isRendered()) {
                    this.applyAsignacionUi();
                }
            }, 300);
        },

        getEditableAssignmentFields: function () {
            return AsignadorEditMode.getEditableFields(this);
        },

        ensureAssignmentFieldsEditable: function () {
            const editableFields = this.getEditableAssignmentFields();

            editableFields.forEach((field) => {
                const view = this.getFieldView(field);

                if (!view) {
                    return;
                }

                view.readOnly = false;

                if (typeof view.setNotReadOnly === 'function') {
                    view.setNotReadOnly();
                }

                if (!view.$el) {
                    return;
                }

                view.$el.removeClass('field-readonly hidden');
                view.$el.closest('.cell, .field').show().removeClass('hidden');
                view.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
                view.$el.find(
                    '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
                ).closest('.btn, a, .input-group-btn, .link-container').show();
            });
        },

        applyAsignacionUi: function () {
            this.findPanel('gestionPosteriorRadicacion').show();
            this.$el.find('[data-name="assignedUser"], [data-name="cMotivoReasignacion"]')
                .closest('.cell, .field')
                .show()
                .removeClass('hidden');

            this.setReadOnlyExcept(this.getEditableAssignmentFields());
            this.ensureAssignmentFieldsEditable();
            this.toggleMotivoReasignacion();
        },

        toggleMotivoReasignacion: function () {
            const showMotivo = PostRadicacionFields.shouldShowMotivoReasignacion(
                this.getUser(),
                this.model,
                this._initialAssignedUserId
            );
            const $motivoCell = this.$el.find('[data-name="cMotivoReasignacion"]').closest('.cell');

            if ($motivoCell.length) {
                $motivoCell.toggle(showMotivo);
            }

            const motivoView = this.getFieldView('cMotivoReasignacion');

            if (!motivoView) {
                return;
            }

            if (showMotivo && typeof motivoView.setNotReadOnly === 'function') {
                motivoView.setNotReadOnly();
            } else if (!showMotivo && typeof motivoView.setReadOnly === 'function') {
                motivoView.setReadOnly();
            }
        },

        setReadOnly: function () {
            if (this._asignarMode) {
                return;
            }

            Dep.prototype.setReadOnly.apply(this, arguments);
        },

        setReadOnlyExcept: function (editableFields) {
            const editable = (editableFields || []).slice();
            const fieldViews = typeof this.getFieldViews === 'function'
                ? this.getFieldViews()
                : {};

            Object.keys(fieldViews).forEach(function (field) {
                const view = fieldViews[field];

                if (!view) {
                    return;
                }

                if (editable.indexOf(field) !== -1) {
                    if (typeof view.setNotReadOnly === 'function') {
                        view.setNotReadOnly();
                    }

                    return;
                }

                if (typeof view.setReadOnly === 'function') {
                    view.setReadOnly();
                }
            });
        },

        syncAssignmentFields: function () {
            this.getEditableAssignmentFields().forEach((field) => {
                const view = this.getFieldView(field);

                if (!view || typeof view.fetch !== 'function') {
                    return;
                }

                const data = view.fetch();

                if (data && typeof data === 'object') {
                    this.model.set(data);
                }
            });
        },

        fetch: function () {
            this.syncAssignmentFields();

            const data = {
                assignedUserId: this.model.get('assignedUserId'),
                assignedUserName: this.model.get('assignedUserName'),
            };

            if (this.getEditableAssignmentFields().indexOf('cMotivoReasignacion') !== -1) {
                data.cMotivoReasignacion = String(this.model.get('cMotivoReasignacion') || '').trim() || null;
            }

            return data;
        },

        validateAssignment: function () {
            const assignedUserId = this.model.get('assignedUserId');

            if (!assignedUserId) {
                Espo.Ui.error(this.translate('validationRequired', 'messages')
                    .replace('{field}', this.translate('assignedUser', 'fields', 'Case')));

                return false;
            }

            return true;
        },

        save: function (options) {
            options = options || {};

            this.syncAssignmentFields();

            if (!this.validateAssignment()) {
                return Promise.reject('invalid');
            }

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            return Dep.prototype.save.call(this, options).then((result) => {
                Espo.Ui.notify(false);
                Espo.Ui.success(this.translate('caseEditedSuccess', 'labels', 'Case'));
                AsignadorEditMode.cleanupAsignarPage();

                return result;
            }).catch((error) => {
                Espo.Ui.notify(false);

                if (error === 'notModified') {
                    Espo.Ui.warning(this.translate('notModified', 'messages'));

                    return Promise.reject(error);
                }

                if (error === 'invalid') {
                    return Promise.reject(error);
                }

                const message = (error && (error.message || error.statusText))
                    || this.translate('Error');

                Espo.Ui.error(message);

                return Promise.reject(error);
            });
        },

        actionSave: function (data) {
            data = data || {};
            const self = this;

            return this.save(data.options).then(function () {
                window.setTimeout(function () {
                    self.getRouter().navigate('#Case/view/' + self.model.id, {trigger: true});
                }, 450);
            });
        },

        actionCancel: function () {
            AsignadorEditMode.cleanupAsignarPage();
            this.getRouter().navigate('#Case/view/' + this.model.id, {trigger: true});
        },

        exit: function (after) {
            $('body').removeClass('alcaldia-asignador-asignar-page');
            AsignadorEditMode.cleanupAsignarPage();

            return Dep.prototype.exit.call(this, after);
        },
    });
});
