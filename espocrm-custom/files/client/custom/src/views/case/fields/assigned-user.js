define('custom:views/case/fields/assigned-user', [
    'views/fields/assigned-user',
    'custom:helpers/asignador-case-flow',
    'custom:helpers/radicacion-fields',
], function (Dep, AsignadorCaseFlow, RadicacionFields) {

    const getRecordView = function (fieldView) {
        let parent = typeof fieldView.getParentView === 'function'
            ? fieldView.getParentView()
            : null;

        while (parent) {
            if (parent.model && typeof parent.getFieldView === 'function') {
                return parent;
            }

            parent = typeof parent.getParentView === 'function'
                ? parent.getParentView()
                : null;
        }

        return null;
    };

    const isAssignmentEditing = function (recordView) {
        if (!recordView) {
            return false;
        }

        if (recordView._asignacionEditMode || recordView._asignarMode) {
            return true;
        }

        const user = typeof recordView.getUser === 'function' ? recordView.getUser() : null;

        if (!user || !AsignadorCaseFlow.isAsignadorUser(user)) {
            return false;
        }

        if (recordView.mode === 'edit') {
            return true;
        }

        return document.body.classList.contains('alcaldia-asignador-asignar-page')
            || document.body.classList.contains('alcaldia-asignacion-detail-edit');
    };

    return Dep.extend({

        getRecordView: function () {
            return getRecordView(this);
        },

        setup: function () {
            Dep.prototype.setup.call(this);

            if (this.isEditMode() && this.model.isNew()) {
                this.clearAssignedUserIfHidden();
            }

            this.listenTo(this.model, 'change:assignedUserId', () => {
                if (this.isEditMode() && this.model.isNew()) {
                    this.clearAssignedUserIfHidden();
                }
            });
        },

        isReadOnly: function () {
            const user = this.getUser();

            if (RadicacionFields.isAsignadorUser(user) && RadicacionFields.isCaseRadicado(this.model)) {
                if (this.mode === 'edit') {
                    return false;
                }

                if (
                    document.body.classList.contains('alcaldia-asignador-asignar-page')
                    || document.body.classList.contains('alcaldia-asignacion-detail-edit')
                ) {
                    return false;
                }
            }

            if (isAssignmentEditing(this.getRecordView())) {
                return false;
            }

            return Dep.prototype.isReadOnly.call(this);
        },

        setReadOnly: function () {
            if (
                RadicacionFields.isAsignadorUser(this.getUser())
                && RadicacionFields.isCaseRadicado(this.model)
                && (this.mode === 'edit' || isAssignmentEditing(this.getRecordView()))
            ) {
                this.readOnly = false;

                if (typeof this.setNotReadOnly === 'function') {
                    this.setNotReadOnly();
                }

                return;
            }

            Dep.prototype.setReadOnly.apply(this, arguments);
        },

        showSelectControls: function () {
            this.readOnly = false;

            if (typeof this.setNotReadOnly === 'function') {
                this.setNotReadOnly();
            }

            if (!this.$el || !this.$el.length) {
                return false;
            }

            this.$el.removeClass('field-readonly hidden');
            this.$el.closest('.cell, .field').show().removeClass('hidden');
            this.$el.find(
                '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
            ).closest('.btn, a, .input-group-btn, .link-container').show();

            return this.$el.find('[data-action="selectLink"], [data-action="editLink"]').length > 0;
        },

        enableAssignmentSelect: function () {
            const recordView = this.getRecordView();

            if (!isAssignmentEditing(recordView)) {
                return;
            }

            this.readOnly = false;

            if (typeof this.setNotReadOnly === 'function') {
                this.setNotReadOnly();
            }

            if (this.mode !== 'edit' && typeof this.setMode === 'function') {
                this.setMode('edit');
            }

            if (typeof this.render === 'function') {
                this.render();
            }

            if (this.showSelectControls()) {
                return;
            }

            if (recordView && typeof recordView.createFieldView === 'function') {
                const $cell = this.$el.closest('.cell, .field');

                if ($cell.length) {
                    const cellId = 'alcaldia-assigned-user-remount-' + (this.model.id || this.cid);
                    $cell.attr('id', cellId).empty();

                    const self = this;
                    recordView.createFieldView('assignedUser', null, '#' + cellId, {
                        mode: 'edit',
                        readOnly: false,
                    }, function (view) {
                        if (!view) {
                            return;
                        }

                        view.readOnly = false;
                        view.render();

                        if (typeof view.showSelectControls === 'function') {
                            view.showSelectControls();
                        }
                    });
                }
            }
        },

        mountSidecarOnlyControl: function () {
            const recordView = this.getRecordView();

            if (!isAssignmentEditing(recordView) || !this.$el || !this.$el.length) {
                return;
            }

            const selectedName = String(this.model.get('assignedUserName') || '').trim();
            const label = selectedName
                ? 'Cambiar responsable: ' + selectedName
                : 'Seleccionar responsable';

            this.$el.addClass('alcaldia-sidecar-picker-only');
            this.$el.find('.alcaldia-open-patrullero-picker').remove();

            const $button = $(
                '<button type="button" class="btn alcaldia-open-patrullero-picker">' +
                '<span class="fas fa-user-plus" aria-hidden="true"></span> ' +
                '<span class="alcaldia-open-patrullero-picker__label"></span>' +
                '<span class="fas fa-chevron-right" aria-hidden="true"></span>' +
                '</button>'
            );

            $button.find('.alcaldia-open-patrullero-picker__label').text(label);
            $button.on('click', (event) => {
                event.preventDefault();
                event.stopPropagation();

                // Usa el selector estándar de EspoCRM (sidecar), sin limitar
                // la selección a un perfil específico.
                this.$el.find('[data-action="selectLink"]').first().trigger('click');
            });

            this.$el.append($button);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            const self = this;

            if (isAssignmentEditing(this.getRecordView())
                || (RadicacionFields.isAsignadorUser(this.getUser())
                    && this.mode === 'edit'
                    && RadicacionFields.isCaseRadicado(this.model))) {
                this.enableAssignmentSelect();

                [150, 500, 1200].forEach(function (delay) {
                    window.setTimeout(function () {
                        self.enableAssignmentSelect();
                        self.mountSidecarOnlyControl();
                    }, delay);
                });

                this.mountSidecarOnlyControl();
            }

            if (this.isEditMode() && this.model.isNew()) {
                this.clearAssignedUserIfHidden();
            }
        },

        clearAssignedUserIfHidden: function () {
            const user = this.getUser();

            if (AsignadorCaseFlow.isAsignadorUser(user)) {
                return;
            }

            if (!this.model.get('assignedUserId')) {
                return;
            }

            this.model.set({
                assignedUserId: null,
                assignedUserName: null,
            }, {silent: true});
        },

        getSelectPrimaryFilterName: function () {
            // La persona asignadora puede seleccionar cualquier usuario
            // activo. No se aplica un filtro primario por rol.
            return null;
        },

        getOnEmptyAutocomplete: function () {
            // El campo base propone al usuario conectado; para Asignación eso
            // es engañoso porque el asignador no debe asignarse a sí mismo.
            return Promise.resolve([]);
        },
    });
});
