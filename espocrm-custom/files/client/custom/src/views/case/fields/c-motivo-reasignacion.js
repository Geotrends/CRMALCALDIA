define('custom:views/case/fields/c-motivo-reasignacion', [
    'views/fields/text',
    'custom:helpers/post-radicacion-fields',
], function (Dep, PostRadicacionFields) {

    const getRecordViewFromField = function (fieldView) {
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

        return !!recordView._asignacionEditMode
            || !!recordView._asignarMode
            || recordView.layoutName === 'asignar'
            || !!(recordView.options && recordView.options.asignar);
    };

    const shouldEditMotivo = function (fieldView) {
        const recordView = getRecordViewFromField(fieldView);

        if (!recordView || !isAssignmentEditing(recordView)) {
            return false;
        }

        return PostRadicacionFields.shouldShowMotivoReasignacion(
            fieldView.getUser(),
            fieldView.model,
            recordView._initialAssignedUserId
        );
    };

    return Dep.extend({

        getRecordView: function () {
            return getRecordViewFromField(this);
        },

        setup: function () {
            Dep.prototype.setup.call(this);

            if (isAssignmentEditing(this.getRecordView())) {
                this.inlineEditDisabled = true;
            }
        },

        isReadOnly: function () {
            if (shouldEditMotivo(this)) {
                return false;
            }

            return Dep.prototype.isReadOnly.call(this);
        },

        hideAssignmentInlineSaveControls: function () {
            if (!isAssignmentEditing(this.getRecordView())) {
                return;
            }

            if (typeof this.removeInlineEditLinks === 'function') {
                this.removeInlineEditLinks();
            }

            if (!this.$el || !this.$el.length) {
                return;
            }

            this.$el.closest('.cell, .field')
                .find('.inline-save-link, .inline-cancel-link')
                .remove();
        },

        addInlineEditLinks: function () {
            if (isAssignmentEditing(this.getRecordView())) {
                this.hideAssignmentInlineSaveControls();

                return;
            }

            Dep.prototype.addInlineEditLinks.call(this);
        },

        inlineEditSave: function (options) {
            if (isAssignmentEditing(this.getRecordView())) {
                this.hideAssignmentInlineSaveControls();

                if (typeof this.fetch === 'function') {
                    this.model.set(this.fetch());
                }

                return;
            }

            Dep.prototype.inlineEditSave.call(this, options);
        },

        enableInlineEdit: function () {
            if (this._inlineEditEnabled || !this.$el || !this.$el.length) {
                return;
            }

            if (!shouldEditMotivo(this)) {
                return;
            }

            this._inlineEditEnabled = true;
            this.readOnly = false;
            this.mode = 'edit';
            this.inlineEditDisabled = true;

            const value = String(this.model.get(this.name) || '');
            const rows = this.params.rows || 2;
            const maxLength = this.params.maxLength || 500;

            this.$el.removeClass('field-readonly hidden');
            this.$el.closest('.cell, .field').show().removeClass('hidden');
            this.$el.find('.field-value, .none-value, .text-muted').hide();

            const $textarea = $('<textarea class="form-control main-element"></textarea>')
                .attr('rows', rows)
                .attr('maxlength', maxLength)
                .attr('placeholder', this.translate('cMotivoReasignacionPlaceholder', 'messages', 'Case'))
                .val(value);

            let $container = this.$el.find('.textarea-container, .text-container').first();

            if (!$container.length) {
                $container = $('<div class="textarea-container"></div>');
                this.$el.append($container);
            }

            $container.empty().append($textarea).show();
            this.$textarea = $textarea;

            $textarea.on('input change', () => {
                this.model.set(this.name, $textarea.val());
            });

            this.hideAssignmentInlineSaveControls();
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (shouldEditMotivo(this)) {
                this.enableInlineEdit();
            }
        },

        fetch: function () {
            if (this.$textarea && this.$textarea.length) {
                const data = {};

                data[this.name] = this.$textarea.val();

                return data;
            }

            return Dep.prototype.fetch.call(this);
        },
    });
});
