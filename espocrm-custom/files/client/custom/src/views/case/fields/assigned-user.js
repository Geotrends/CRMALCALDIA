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

        if (recordView._asignacionEditMode) {
            return true;
        }

        const user = typeof recordView.getUser === 'function' ? recordView.getUser() : null;

        if (!user || !AsignadorCaseFlow.isAsignadorUser(user)) {
            return false;
        }

        if (recordView.mode === 'edit') {
            return true;
        }

        return document.body.classList.contains('alcaldia-asignador-asignar-page');
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
            if (isAssignmentEditing(this.getRecordView())) {
                return false;
            }

            return Dep.prototype.isReadOnly.call(this);
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

            if (this.mode === 'edit' && this.showSelectControls()) {
                return;
            }

            if (this.mode === 'detail' && this.showSelectControls()) {
                return;
            }

            if (recordView && typeof recordView.remountAssignedUserForEdit === 'function') {
                recordView.remountAssignedUserForEdit();
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (isAssignmentEditing(this.getRecordView())) {
                this.showSelectControls();
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
            if (RadicacionFields.isCaseRadicado(this.model)) {
                return 'patrulleros';
            }

            return Dep.prototype.getSelectPrimaryFilterName.call(this);
        },
    });
});
