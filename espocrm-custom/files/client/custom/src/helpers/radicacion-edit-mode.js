define('custom:helpers/radicacion-edit-mode', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const normalize = function (value) {
        return String(value)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const getUserRoleNames = function (user) {
        const names = [];

        Object.values(user.get('rolesNames') || {}).forEach(function (name) {
            names.push(name);
        });

        Object.values(user.get('teamsNames') || {}).forEach(function (name) {
            names.push(name);
        });

        const defaultTeam = user.get('defaultTeamName');

        if (defaultTeam) {
            names.push(defaultTeam);
        }

        return names;
    };

    const userHasRoleKey = function (user, roleKey) {
        return getUserRoleNames(user).some(function (name) {
            const normalized = normalize(name);

            return normalized === roleKey || normalized.indexOf(roleKey) !== -1;
        });
    };

    const isPureRadicacionUser = function (user) {
        if (!user || user.isAdmin()) {
            return false;
        }

        if (userHasRoleKey(user, 'inspeccion') && !userHasRoleKey(user, 'radicacion')) {
            return false;
        }

        if (userHasRoleKey(user, 'radicacion')) {
            return true;
        }

        if (RadicacionFields.isProfileLoaded()) {
            const profile = RadicacionFields.getServerProfile();

            if (profile.isRadicacion && !profile.isInspeccion) {
                return true;
            }
        }

        return false;
    };

    const PANELS_HIDDEN_FOR_RADICACION = [
        'actaVisita',
        'actaRevision',
        'actuoArchivoPanel',
        'gestionPosteriorRadicacion',
    ];

    const hideNonRadicacionPanels = function (recordView) {
        if (!recordView || !isRadicacionEditSession(recordView)) {
            return;
        }

        if (typeof recordView.findPanel !== 'function') {
            return;
        }

        PANELS_HIDDEN_FOR_RADICACION.forEach(function (name) {
            recordView.findPanel(name).hide();
        });

        recordView.$el.find('[data-name="cPanelActaVisita"]').closest('.panel, .record-panel, .cell').hide();
    };

    const getEditableFields = function () {
        return [
            'cNumeroRadicado',
            'cExpediente',
            'cRadicadoModo',
            'cRadicadoSiglas',
            'cRadicadoAnio',
        ];
    };

    const isRadicacionEditSession = function (recordView) {
        if (!recordView || !recordView.model) {
            return false;
        }

        if (recordView.model.isNew && recordView.model.isNew()) {
            return false;
        }

        if (recordView._alcaldiaRadicacionEdit) {
            return true;
        }

        return isPureRadicacionUser(recordView.getUser());
    };

    const isRadicarMode = function (recordView) {
        return isRadicacionEditSession(recordView);
    };

    const bootstrapRadicarMode = function (recordView) {
        if (isRadicacionEditSession(recordView)) {
            recordView._radicarMode = true;
            recordView._alcaldiaRadicacionEdit = true;
        }
    };

    const isCasePostRadicado = function (model) {
        return RadicacionFields.isCasePostRadicado(model);
    };

    const isCaseSinRadicar = function (model) {
        return !isCasePostRadicado(model);
    };

    const moveRadicacionPanelToTop = function (recordView) {
        const $panel = recordView.findPanel('radicacionCaso');

        if (!$panel.length) {
            return;
        }

        const $host = recordView.$el.find('.record-grid, .panels-container, form.record').first();

        if ($host.length) {
            $host.prepend($panel);
        }

        $panel.show();
    };

    const prepareRadicacionEditView = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        if (typeof recordView.findPanel !== 'function') {
            return;
        }

        hideNonRadicacionPanels(recordView);
        moveRadicacionPanelToTop(recordView);
        recordView.findPanel('radicacionCaso').show();
    };

    const unlockEditableRadicacionFields = function (recordView) {
        if (!recordView) {
            return;
        }

        getEditableFields().forEach(function (field) {
            const view = typeof recordView.getFieldView === 'function'
                ? recordView.getFieldView(field)
                : null;

            if (view && typeof view.setNotReadOnly === 'function') {
                view.setNotReadOnly();
            }

            const $cell = recordView.$el.find('[data-name="' + field + '"]').closest('.cell');

            $cell.show();
            $cell.find('input, select, textarea').prop('disabled', false).removeAttr('readonly');
        });

        recordView.$el.find('.radicado-assistant-panel-mount')
            .find('input, select, textarea')
            .prop('disabled', false)
            .removeAttr('readonly');
    };

    const lockAllFieldViewsExcept = function (recordView, editableFields) {
        const editable = editableFields.slice();
        const fieldViews = typeof recordView.getFieldViews === 'function'
            ? recordView.getFieldViews()
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
    };

    const applyFieldReadOnlyRestrictions = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        if (recordView._applyingRadicacionFieldRestrictions) {
            return;
        }

        recordView._applyingRadicacionFieldRestrictions = true;

        try {
            lockAllFieldViewsExcept(recordView, getEditableFields());
            unlockEditableRadicacionFields(recordView);
        } finally {
            recordView._applyingRadicacionFieldRestrictions = false;
        }
    };

    const applyRestrictedEdit = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        recordView._radicarMode = true;
        recordView._alcaldiaRadicacionEdit = true;

        applyFieldReadOnlyRestrictions(recordView);
        prepareRadicacionEditView(recordView);

        recordView.$el.find(
            '[data-action="editLink"], [data-action="selectLink"], [data-action="quickCreate"]'
        ).closest('.btn, a, .input-group-btn').hide();

        recordView.$el.find('[data-action="save"], [data-action="saveAndContinueEditing"]').show();
    };

    const scheduleRestrictedEdit = function (recordView) {
        if (!isRadicacionEditSession(recordView)) {
            return;
        }

        applyRestrictedEdit(recordView);

        [50, 150, 400, 800, 1500, 3000].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isEditMode || !recordView.isEditMode()) {
                    return;
                }

                if (!isRadicacionEditSession(recordView)) {
                    return;
                }

                applyRestrictedEdit(recordView);

                if (typeof recordView.ensureRadicacionAssistant === 'function') {
                    recordView.ensureRadicacionAssistant();
                }
            }, delay);
        });
    };

    const resolveRadicacionEditFlag = function (recordView) {
        if (!recordView || !recordView.model || (recordView.model.isNew && recordView.model.isNew())) {
            return Promise.resolve(false);
        }

        if (isPureRadicacionUser(recordView.getUser())) {
            recordView._alcaldiaRadicacionEdit = true;

            return Promise.resolve(true);
        }

        return RadicacionFields.ensureProfile().then(function (profile) {
            const isRadicacion = !!(profile && profile.isRadicacion && !profile.isInspeccion);

            if (isRadicacion) {
                recordView._alcaldiaRadicacionEdit = true;
            }

            return isRadicacion;
        });
    };

    return {
        isPureRadicacionUser: isPureRadicacionUser,
        bootstrapRadicarMode: bootstrapRadicarMode,
        isRadicarMode: isRadicarMode,
        isRadicacionEditSession: isRadicacionEditSession,
        isCaseSinRadicar: isCaseSinRadicar,
        isCasePostRadicado: isCasePostRadicado,
        getEditableFields: getEditableFields,
        unlockEditableRadicacionFields: unlockEditableRadicacionFields,
        applyFieldReadOnlyRestrictions: applyFieldReadOnlyRestrictions,
        applyRestrictedEdit: applyRestrictedEdit,
        scheduleRestrictedEdit: scheduleRestrictedEdit,
        hideNonRadicacionPanels: hideNonRadicacionPanels,
        prepareRadicacionEditView: prepareRadicacionEditView,
        resolveRadicacionEditFlag: resolveRadicacionEditFlag,
    };
});
