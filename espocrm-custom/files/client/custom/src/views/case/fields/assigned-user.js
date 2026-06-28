define('custom:views/case/fields/assigned-user', [
    'views/fields/assigned-user',
    'custom:helpers/post-radicacion-fields',
], function (Dep, PostRadicacionFields) {

    const isAssignmentEditing = function (recordView) {
        if (!recordView) {
            return false;
        }

        return !!recordView._asignacionEditMode
            || !!recordView._asignarMode
            || recordView.layoutName === 'asignar'
            || !!(recordView.options && recordView.options.asignar);
    };

    return Dep.extend({

        getRecordView: function () {
            let parent = typeof this.getParentView === 'function'
                ? this.getParentView()
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
            const recordView = this.getRecordView();

            if (isAssignmentEditing(recordView)) {
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
            if (PostRadicacionFields.shouldShowAsignacion(this.getUser(), this.model)) {
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
            if (PostRadicacionFields.isCasePostRadicado(this.model)) {
                return 'patrulleros';
            }

            return Dep.prototype.getSelectPrimaryFilterName.call(this);
        },
    });
});
