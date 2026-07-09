define('custom:helpers/case-detail-side-panels', [], function () {

    const TOP_PANELS = [
        'caseTimeline',
        'caseCronograma',
    ];

    const FIELD_PANELS = [
        'actaVisita',
        'formatoGenerado',
    ];

    const BOTTOM_PANELS = [
        'caseStream',
        'comunicacionesCasoPanel',
    ];

    const RIGHT_ONLY_PANELS = TOP_PANELS.concat(BOTTOM_PANELS);

    const CONTAINER_CLASS = 'alcaldia-case-detail-side-fields';
    const HIDDEN_LEFT_CLASS = 'alcaldia-case-history-left-hidden';

    const panelSelector = function (name) {
        return '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel';
    };

    const findIn = function ($root, name) {
        return $root.find(panelSelector(name)).first();
    };

    const hideLeftHistoryDuplicates = function (recordView) {
        const $left = recordView.$el.find('.record-grid > .left');

        if (!$left.length) {
            return;
        }

        RIGHT_ONLY_PANELS.forEach(function (name) {
            findIn($left, name)
                .addClass('hidden ' + HIDDEN_LEFT_CLASS)
                .hide();
        });

        $left
            .find('.panel-caseTimeline, .panel-caseCronograma')
            .addClass('hidden ' + HIDDEN_LEFT_CLASS)
            .hide();
    };

    const distribute = function (recordView) {
        if (!recordView || !recordView.$el || recordView.mode !== 'detail') {
            return;
        }

        const $side = recordView.$el.find('.record-grid > .side');
        const $leftMiddle = recordView.$el.find('.record-grid > .left > .middle');

        if (!$side.length) {
            return;
        }

        hideLeftHistoryDuplicates(recordView);

        let $container = $side.find('.' + CONTAINER_CLASS);

        if (!$container.length) {
            $container = $('<div class="' + CONTAINER_CLASS + '"></div>');
        }

        FIELD_PANELS.forEach(function (name) {
            const $panel = findIn($leftMiddle, name);

            if ($panel.length && !$panel.closest('.' + CONTAINER_CLASS).length) {
                $container.append($panel);
            }
        });

        let $insertAfter = null;

        TOP_PANELS.forEach(function (name) {
            const $panel = findIn($side, name);

            if (!$panel.length || $panel.hasClass(HIDDEN_LEFT_CLASS)) {
                return;
            }

            if (!$insertAfter) {
                $side.prepend($panel);
            } else {
                $insertAfter.after($panel);
            }

            $insertAfter = $panel;
        });

        if ($container.children().length) {
            if ($insertAfter) {
                $insertAfter.after($container);
            } else {
                $side.prepend($container);
            }

            $insertAfter = $container;
        }

        BOTTOM_PANELS.forEach(function (name) {
            const $panel = findIn($side, name);

            if (!$panel.length || $panel.hasClass(HIDDEN_LEFT_CLASS)) {
                return;
            }

            if ($insertAfter) {
                $insertAfter.after($panel);
            } else {
                $side.prepend($panel);
            }

            $insertAfter = $panel;
        });
    };

    const schedule = function (recordView) {
        [0, 100, 400, 1000].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                distribute(recordView);
            }, delay);
        });
    };

    return {
        distribute: distribute,
        schedule: schedule,
    };
});
