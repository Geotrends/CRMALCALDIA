define('custom:helpers/case-create-form', [], function () {

    const DETAIL_ONLY_PANELS = [
        'radicacionCaso',
        'actaVisita',
        'formatoGenerado',
    ];

    const DETAIL_ONLY_FIELDS = [
        'status',
        'cNumeroRadicado',
        'cExpediente',
        'cPanelActaVisita',
        'cFormatoSolicitudPdf',
    ];

    const panelSelector = function (name) {
        return '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel';
    };

    const hideDetailOnlyUi = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return;
        }

        DETAIL_ONLY_PANELS.forEach(function (name) {
            recordView.$el.find(panelSelector(name)).addClass('hidden');
        });

        DETAIL_ONLY_FIELDS.forEach(function (field) {
            recordView.$el
                .find('.field[data-name="' + field + '"]')
                .closest('.cell, .field')
                .addClass('hidden');
        });
    };

    const applyBogotaFechaCaso = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return;
        }

        if (typeof recordView.getDateTime !== 'function') {
            return;
        }

        const dateTime = recordView.getDateTime();
        const now = dateTime.toDisplay(dateTime.getNow(1));

        if (now) {
            recordView.model.set('cFechaCaso', now, {silent: true});
        }
    };

    const DEFAULT_LINK_FIELDS = [
        'cRecibidaPor',
        'cRemitidoA',
    ];

    let cachedDefaults = null;

    const fetchUserByUserName = function (userName) {
        if (typeof Espo === 'undefined' || !Espo.Ajax) {
            return Promise.resolve(null);
        }

        return Espo.Ajax.getRequest('User', {
            select: ['id', 'name', 'userName'],
            where: [{
                type: 'equals',
                attribute: 'userName',
                value: userName,
            }],
            maxSize: 1,
        }).then(function (response) {
            const list = response.list || [];

            return list.length ? list[0] : null;
        }).catch(function () {
            return null;
        });
    };

    const applyGestionLinkDefaults = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return Promise.resolve();
        }

        const tasks = [];

        if (!recordView.model.get('cRecibidaPorId')) {
            tasks.push(
                fetchUserByUserName('inspeccion').then(function (user) {
                    if (!user || recordView.model.get('cRecibidaPorId')) {
                        return;
                    }

                    recordView.model.set({
                        cRecibidaPorId: user.id,
                        cRecibidaPorName: user.name || 'Inspección',
                    }, {silent: true});
                })
            );
        }

        if (!recordView.model.get('cRemitidoAId')) {
            tasks.push(
                fetchUserByUserName('radicacion').then(function (user) {
                    if (!user || recordView.model.get('cRemitidoAId')) {
                        return;
                    }

                    recordView.model.set({
                        cRemitidoAId: user.id,
                        cRemitidoAName: user.name || 'Radicación',
                    }, {silent: true});
                })
            );
        }

        return Promise.all(tasks).then(function () {
            DEFAULT_LINK_FIELDS.forEach(function (field) {
                const fieldView = recordView.getFieldView(field);

                if (fieldView && fieldView.isRendered && fieldView.isRendered()) {
                    fieldView.reRender();
                }
            });
        });
    };

    const applyServerDefaults = function (recordView, data) {
        if (!recordView || !recordView.model || !data) {
            return;
        }

        Object.keys(data).forEach(function (key) {
            if (data[key] == null || data[key] === '') {
                return;
            }

            if (recordView.model.get(key)) {
                return;
            }

            recordView.model.set(key, data[key], {silent: true});
        });

        ['cFechaCaso'].concat(DEFAULT_LINK_FIELDS).forEach(function (field) {
            const fieldView = recordView.getFieldView(field);

            if (fieldView && fieldView.isRendered && fieldView.isRendered()) {
                fieldView.reRender();
            }
        });
    };

    const fetchServerDefaults = function (recordView) {
        if (!recordView || !recordView.model || !recordView.model.isNew()) {
            return Promise.resolve();
        }

        if (typeof Espo === 'undefined' || !Espo.Ajax) {
            return Promise.resolve();
        }

        return Espo.Ajax.getRequest('Case/action/createDefaults')
            .then(function (data) {
                cachedDefaults = data || null;
                applyServerDefaults(recordView, data);
            })
            .catch(function () {})
            .then(function () {
                return applyGestionLinkDefaults(recordView);
            });
    };

    const applyCachedDefaults = function (recordView) {
        if (!cachedDefaults) {
            return;
        }

        applyServerDefaults(recordView, cachedDefaults);
    };

    const schedule = function (recordView) {
        hideDetailOnlyUi(recordView);
        applyCachedDefaults(recordView);

        [100, 400, 1000].forEach(function (delay) {
            window.setTimeout(function () {
                hideDetailOnlyUi(recordView);
                applyCachedDefaults(recordView);
                applyGestionLinkDefaults(recordView);
            }, delay);
        });
    };

    const setup = function (recordView) {
        if (!recordView.model.isNew()) {
            return;
        }

        applyBogotaFechaCaso(recordView);
        fetchServerDefaults(recordView);
    };

    return {
        setup: setup,
        schedule: schedule,
        hideDetailOnlyUi: hideDetailOnlyUi,
        applyBogotaFechaCaso: applyBogotaFechaCaso,
    };
});
