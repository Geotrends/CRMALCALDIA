define('custom:helpers/case-detail-side-panels', [], function () {

    const SIDE_PANELS = [
        'actaVisita',
        'formatoGenerado',
    ];

    const CONTAINER_CLASS = 'alcaldia-case-detail-side-fields';

    const findPanel = function (recordView, name) {
        return recordView.$el.find(
            '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel'
        );
    };

    const distribute = function (recordView) {
        if (!recordView || !recordView.$el || recordView.mode !== 'detail') {
            return;
        }

        const $side = recordView.$el.find('.record-grid > .side');

        if (!$side.length) {
            return;
        }

        let $container = $side.find('.' + CONTAINER_CLASS);

        if (!$container.length) {
            $container = $('<div class="' + CONTAINER_CLASS + '"></div>');
            $side.prepend($container);
        }

        SIDE_PANELS.forEach(function (name) {
            const $panel = findPanel(recordView, name);

            if ($panel.length && !$panel.closest('.' + CONTAINER_CLASS).length) {
                $container.append($panel);
            }
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
