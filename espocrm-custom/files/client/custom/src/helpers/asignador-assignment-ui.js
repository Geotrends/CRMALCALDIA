define('custom:helpers/asignador-assignment-ui', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/asignador-case-flow',
], function (RadicacionFields, AsignadorCaseFlow) {

    const STORAGE_KEY = 'crm-case-asignar-mode';
    const ASSIGNMENT_PANEL = 'gestionPosteriorRadicacion';

    const findPanel = function (recordView, name) {
        return recordView.$el.find(
            '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel'
        );
    };

    const activateAssignmentSession = function (caseId) {
        sessionStorage.setItem(STORAGE_KEY, String(caseId || ''));
    };

    const consumeAssignmentSession = function (caseId) {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        if (stored && stored === String(caseId || '')) {
            sessionStorage.removeItem(STORAGE_KEY);

            return true;
        }

        return false;
    };

    const clearAssignmentSession = function () {
        sessionStorage.removeItem(STORAGE_KEY);
    };

    const isAssignmentSession = function (recordView) {
        if (!recordView || !recordView.model || recordView.model.isNew()) {
            return false;
        }

        if (recordView._asignacionEditMode || recordView._asignarMode) {
            return true;
        }

        const stored = sessionStorage.getItem(STORAGE_KEY);

        return !!(stored && stored === String(recordView.model.id || ''));
    };

    const getEditableFields = function (recordView) {
        const fields = ['assignedUser'];

        if (AsignadorCaseFlow.isReasignacionCaseOnOpen(recordView.model)) {
            fields.push('cMotivoReasignacion');
        }

        return fields;
    };

    const safeSetFieldNotReadOnly = function (view) {
        if (!view) {
            return;
        }

        view.readOnly = false;

        if (typeof view.setNotReadOnly === 'function') {
            try {
                view.setNotReadOnly();
            } catch (e) {
                // La vista puede no estar lista todavía.
            }
        }

        if (!view.$el || !view.$el.length) {
            return;
        }

        view.$el.removeClass('field-readonly hidden');
        view.$el.find('input, select, textarea, button').prop('disabled', false).removeAttr('readonly');
        view.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').show();
    };

    const safeSetFieldReadOnly = function (view) {
        if (!view) {
            return;
        }

        view.readOnly = true;

        if (typeof view.setReadOnly === 'function') {
            try {
                view.setReadOnly();
            } catch (e) {
                // noop
            }
        }

        if (!view.$el || !view.$el.length) {
            return;
        }

        view.$el.addClass('field-readonly');
        view.$el.find('input, select, textarea, button').prop('disabled', true);
        view.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn, .link-container').hide();
    };

    const lockAllFieldViewsExcept = function (recordView, editableFields) {
        const editable = editableFields || [];
        const fieldViews = typeof recordView.getFieldViews === 'function'
            ? recordView.getFieldViews()
            : {};

        Object.keys(fieldViews).forEach(function (field) {
            const view = fieldViews[field];

            if (!view) {
                return;
            }

            if (editable.indexOf(field) !== -1) {
                safeSetFieldNotReadOnly(view);

                return;
            }

            safeSetFieldReadOnly(view);
        });
    };

    const forceAssignmentFieldEditable = function (fieldView, recordView) {
        if (!fieldView) {
            return;
        }

        fieldView.readOnly = false;

        const isDetailRecord = recordView
            && typeof recordView.isEditMode === 'function'
            && !recordView.isEditMode();

        if (
            fieldView.name === 'cMotivoReasignacion'
            && isDetailRecord
            && typeof fieldView.enableInlineEdit === 'function'
        ) {
            fieldView.enableInlineEdit();

            return;
        }

        if (
            fieldView.name === 'assignedUser'
            && typeof fieldView.enableAssignmentSelect === 'function'
        ) {
            fieldView.enableAssignmentSelect();

            return;
        }

        if (typeof fieldView.setMode === 'function' && fieldView.mode !== 'edit') {
            fieldView.setMode('edit');
        }

        if (typeof fieldView.render === 'function') {
            fieldView.render();
        }

        safeSetFieldNotReadOnly(fieldView);
    };

    const patchCaseAssignment = function (caseId, data, recordView) {
        Espo.Ui.notify('Guardando asignación...');

        return Espo.Ajax.patchRequest('Case/' + caseId, data)
            .then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success('Asignación guardada');

                if (recordView && recordView.model && typeof recordView.model.fetch === 'function') {
                    return recordView.model.fetch();
                }

                return null;
            })
            .catch(function (error) {
                Espo.Ui.notify(false);

                const status = error && (error.status || error.statusCode);

                if (status === 401) {
                    Espo.Ui.error('Su sesión expiró. Cierre sesión, vuelva a entrar e intente de nuevo.');

                    return;
                }

                Espo.Ui.error((error && error.message) || 'No se pudo guardar la asignación.');
            });
    };

    const extractSelectedUser = function (models) {
        if (!models) {
            return null;
        }

        if (models.models && models.models.length) {
            return models.models[0];
        }

        if (Array.isArray(models) && models.length) {
            return models[0];
        }

        if (models.id) {
            return models;
        }

        return null;
    };

    const askMotivoReasignacion = function (callback) {
        const $modal = $(
            '<div class="modal fade alcaldia-motivo-modal" tabindex="-1">' +
            '<div class="modal-dialog"><div class="modal-content">' +
            '<div class="modal-header"><h4 class="modal-title">Motivo de reasignación</h4></div>' +
            '<div class="modal-body">' +
            '<textarea class="form-control js-motivo-input" rows="4" ' +
            'placeholder="Indique el motivo de la reasignación"></textarea>' +
            '</div>' +
            '<div class="modal-footer">' +
            '<button type="button" class="btn btn-default" data-action="cancel">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" data-action="save">Guardar</button>' +
            '</div></div></div></div>'
        );

        $('body').append($modal);
        $modal.modal({backdrop: 'static'});

        $modal.on('click', '[data-action="save"]', function () {
            const motivo = String($modal.find('.js-motivo-input').val() || '').trim();

            if (!motivo) {
                Espo.Ui.error('El motivo de reasignación es obligatorio.');

                return;
            }

            $modal.modal('hide');
            callback(motivo);
        });

        $modal.on('hidden.bs.modal', function () {
            $modal.remove();
        });
    };

    const openUserPicker = function (recordView, callback) {
        if (!recordView || typeof recordView.createView !== 'function') {
            Espo.Ui.error('No se pudo abrir el selector de patrulleros.');

            return;
        }

        recordView.createView('dialog', 'views/modals/select-records', {
            scope: 'User',
            multiple: false,
            primaryFilterName: 'patrulleros',
            createButton: false,
        }, function (dialog) {
            dialog.render();

            recordView.listenToOnce(dialog, 'select', function (models) {
                const userModel = extractSelectedUser(models);

                if (!userModel) {
                    return;
                }

                callback({
                    id: userModel.id,
                    name: userModel.get('name') || userModel.get('userName') || '',
                });
            });
        });
    };

    const openAssignmentModal = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.id) {
            return;
        }

        if (!RadicacionFields.isCaseRadicado(recordView.model)) {
            Espo.Ui.warning('El caso aún no está listo para asignación.');

            return;
        }

        const isReasign = AsignadorCaseFlow.isReasignacionCaseOnOpen(recordView.model);
        const caseId = recordView.model.id;

        openUserPicker(recordView, function (user) {
            const data = {
                assignedUserId: user.id,
                assignedUserName: user.name,
            };

            const save = function (motivo) {
                if (isReasign) {
                    data.cMotivoReasignacion = motivo;
                }

                patchCaseAssignment(caseId, data, recordView);
            };

            if (isReasign) {
                askMotivoReasignacion(save);

                return;
            }

            save(null);
        });
    };

    const injectPatrulleroPickerButton = function (recordView) {
        if (!recordView || !recordView.$el || !recordView.$el.length) {
            return;
        }

        const $cell = recordView.$el
            .find('.cell[data-name="assignedUser"], .field[data-name="assignedUser"]')
            .first();

        if (!$cell.length || $cell.find('.alcaldia-pick-patrullero').length) {
            return;
        }

        $cell.append(
            '<button type="button" class="btn btn-primary btn-sm alcaldia-pick-patrullero" ' +
            'style="margin-left:8px; pointer-events:auto;">Asignar patrullero</button>'
        );

        $cell.find('.alcaldia-pick-patrullero').on('click.alcaldiaPickPatrullero', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openAssignmentModal(recordView);
        });
    };

    const unlockAssignmentDom = function (recordView, editableFields) {
        (editableFields || []).forEach(function (field) {
            recordView.$el.find('[data-name="' + field + '"]')
                .closest('.cell, .field')
                .css({
                    pointerEvents: 'auto',
                    opacity: 1,
                    visibility: 'visible',
                })
                .removeClass('field-readonly alcaldia-field-readonly alcaldia-radicacion-readonly')
                .find('input, select, textarea, button, a')
                .prop('disabled', false)
                .removeAttr('readonly')
                .css('pointer-events', 'auto');
        });
    };

    const ensureAssignedUserEditable = function (recordView) {
        if (!recordView || !RadicacionFields.isAsignadorUser(recordView.getUser())) {
            return;
        }

        if (!RadicacionFields.isCaseRadicado(recordView.model)) {
            return;
        }

        const isEditing = recordView._asignacionEditMode
            || (typeof recordView.isEditMode === 'function' && recordView.isEditMode())
            || isAssignmentSession(recordView);

        if (!isEditing) {
            return;
        }

        const $panel = findPanel(recordView, ASSIGNMENT_PANEL);

        if ($panel.length) {
            $panel.show().removeClass('hidden alcaldia-inspeccion-asignacion-hidden');
        }

        recordView.$el.find('[data-name="assignedUser"], [data-name="cMotivoReasignacion"]')
            .closest('.cell, .field')
            .show()
            .removeClass('hidden alcaldia-inspeccion-asignacion-hidden alcaldia-field-readonly');

        const editableFields = getEditableFields(recordView);

        editableFields.forEach(function (field) {
            forceAssignmentFieldEditable(recordView.getFieldView(field), recordView);
        });

        lockAllFieldViewsExcept(recordView, editableFields);
        unlockAssignmentDom(recordView, editableFields);
        injectPatrulleroPickerButton(recordView);
    };

    const openAssignmentEditPage = function (recordView) {
        openAssignmentModal(recordView);
    };

    const scheduleEditableFields = function (recordView) {
        ensureAssignedUserEditable(recordView);

        [150, 400, 900, 1500, 2500].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                ensureAssignedUserEditable(recordView);
            }, delay);
        });
    };

    return {
        activateAssignmentSession: activateAssignmentSession,
        consumeAssignmentSession: consumeAssignmentSession,
        clearAssignmentSession: clearAssignmentSession,
        isAssignmentSession: isAssignmentSession,
        getEditableFields: getEditableFields,
        safeSetFieldNotReadOnly: safeSetFieldNotReadOnly,
        safeSetFieldReadOnly: safeSetFieldReadOnly,
        lockAllFieldViewsExcept: lockAllFieldViewsExcept,
        forceAssignmentFieldEditable: forceAssignmentFieldEditable,
        ensureAssignedUserEditable: ensureAssignedUserEditable,
        openAssignmentEditPage: openAssignmentEditPage,
        openAssignmentModal: openAssignmentModal,
        scheduleEditableFields: scheduleEditableFields,
    };
});
