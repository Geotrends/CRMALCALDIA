define('custom:views/case/fields/c-motivo-reasignacion', [
    'views/fields/text',
    'custom:helpers/post-radicacion-fields',
], function (Dep, PostRadicacionFields) {

    return Dep.extend({

        getRecordView: function () {
            let parent = this.getParentView();

            while (parent) {
                if (parent.model && typeof parent.getFieldView === 'function') {
                    return parent;
                }

                parent = parent.getParentView ? parent.getParentView() : null;
            }

            return null;
        },

        shouldAllowEdit: function () {
            const recordView = this.getRecordView();

            if (!recordView) {
                return false;
            }

            if (
                !recordView._asignacionEditMode
                && !recordView._asignarMode
                && recordView.layoutName !== 'asignar'
                && !(recordView.options && recordView.options.asignar)
            ) {
                return false;
            }

            return PostRadicacionFields.shouldShowMotivoReasignacion(
                this.getUser(),
                this.model,
                recordView._initialAssignedUserId
            );
        },

        isReadOnly: function () {
            if (this.shouldAllowEdit()) {
                return false;
            }

            return Dep.prototype.isReadOnly.call(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.shouldAllowEdit() || !this.$el) {
                return;
            }

            this.readOnly = false;

            if (typeof this.setNotReadOnly === 'function') {
                this.setNotReadOnly();
            }

            this.$el.removeClass('field-readonly hidden');
            this.$el.closest('.cell, .field').show().removeClass('hidden');
            this.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
        },
    });
});
