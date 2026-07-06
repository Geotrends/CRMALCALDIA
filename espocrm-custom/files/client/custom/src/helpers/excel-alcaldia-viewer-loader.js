define('custom:helpers/excel-alcaldia-viewer-loader', [], function () {

    const fetchPreview = function () {
        return new Promise(function (resolve, reject) {
            if (!window.Espo || !Espo.Ajax || typeof Espo.Ajax.getRequest !== 'function') {
                reject(new Error('ajax'));

                return;
            }

            Espo.Ajax.getRequest('Document/action/excelAlcaldiaPreview')
                .then(function (data) {
                    if (!data || !data.html) {
                        reject(new Error('empty'));

                        return;
                    }

                    resolve(data);
                })
                .catch(function () {
                    reject(new Error('preview'));
                });
        });
    };

    const syncColumnWidths = function ($headTable, $bodyTable) {
        const $headCells = $headTable.find('thead th');
        const $bodyRow = $bodyTable.find('tbody tr:first td');

        if (!$headCells.length || !$bodyRow.length) {
            return;
        }

        $headCells.each(function (index, cell) {
            const bodyCell = $bodyRow.get(index);
            const width = Math.max(
                $(cell).outerWidth(),
                bodyCell ? $(bodyCell).outerWidth() : 0
            );

            $(cell).css({
                width: width,
                minWidth: width,
                maxWidth: width,
            });

            if (bodyCell) {
                $(bodyCell).css({
                    width: width,
                    minWidth: width,
                    maxWidth: width,
                });
            }
        });

        const tableWidth = $bodyTable.outerWidth();
        $headTable.css('width', tableWidth);
        $bodyTable.css('width', tableWidth);
    };

    const bindHorizontalSync = function ($headScroll, $bodyScroll) {
        let syncing = false;

        const syncFromBody = function () {
            if (syncing) {
                return;
            }

            syncing = true;
            $headScroll.scrollLeft($bodyScroll.scrollLeft());
            syncing = false;
        };

        $bodyScroll.on('scroll.excelLayout', syncFromBody);

        return function teardown() {
            $bodyScroll.off('scroll.excelLayout');
        };
    };

    const fitViewport = function ($container, $viewport) {
        const apply = function () {
            const $modalBody = $container.closest('.modal-body, .body');

            if (!$modalBody.length || !$viewport.length) {
                return;
            }

            const labelH = $container.find('.excel-alcaldia-sheet-label').outerHeight(true) || 0;
            const bodyH = $modalBody.innerHeight();
            const nextH = Math.max(200, bodyH - labelH);

            $viewport.css({
                height: nextH + 'px',
                maxHeight: nextH + 'px',
            });
        };

        window.setTimeout(apply, 0);
        window.setTimeout(apply, 100);

        $(window).on('resize.excelViewport', apply);

        return {
            apply: apply,
            teardown: function () {
                $(window).off('resize.excelViewport');
            },
        };
    };

    const renderSimpleTable = function ($container, html) {
        $container.append(
            '<div class="excel-alcaldia-viewport">'
            + '<div class="excel-alcaldia-scroll">' + html + '</div>'
            + '</div>'
        );
        $container.find('table').addClass('excel-alcaldia-table table table-bordered table-condensed');

        const $viewport = $container.find('.excel-alcaldia-viewport');
        const viewportLayout = fitViewport($container, $viewport);

        return function teardown() {
            viewportLayout.teardown();
        };
    };

    const mountSplitTable = function ($container, html) {
        const $bodyScroll = $('<div class="excel-alcaldia-scroll"></div>');
        $bodyScroll.html(html);

        const $bodyTable = $bodyScroll.find('table').first();

        if (!$bodyTable.length) {
            return renderSimpleTable($container, html);
        }

        $bodyTable.addClass('excel-alcaldia-table table table-bordered table-condensed');

        const $thead = $bodyTable.find('thead');

        if (!$thead.length) {
            $container.append(
                '<div class="excel-alcaldia-viewport">'
                + '<div class="excel-alcaldia-scroll"></div>'
                + '</div>'
            );
            $container.find('.excel-alcaldia-scroll').replaceWith($bodyScroll);

            const $viewport = $container.find('.excel-alcaldia-viewport');
            const viewportLayout = fitViewport($container, $viewport);

            return function teardown() {
                viewportLayout.teardown();
            };
        }

        const $headScroll = $('<div class="excel-alcaldia-head-scroll"></div>');
        const $headTable = $('<table class="excel-alcaldia-table table table-bordered table-condensed"></table>');

        $headTable.append($thead.detach());
        $headScroll.append($headTable);

        $container.append(
            '<div class="excel-alcaldia-viewport">'
            + '<div class="excel-alcaldia-head-wrap"></div>'
            + '</div>'
        );

        const $viewport = $container.find('.excel-alcaldia-viewport');
        $viewport.find('.excel-alcaldia-head-wrap').append($headScroll);
        $viewport.append($bodyScroll);

        const viewportLayout = fitViewport($container, $viewport);

        window.setTimeout(function () {
            syncColumnWidths($headTable, $bodyTable);
            $headScroll.scrollLeft($bodyScroll.scrollLeft());
            viewportLayout.apply();
        }, 0);

        window.setTimeout(function () {
            syncColumnWidths($headTable, $bodyTable);
            viewportLayout.apply();
        }, 100);

        const onResize = function () {
            syncColumnWidths($headTable, $bodyTable);
            viewportLayout.apply();
        };

        $(window).on('resize.excelLayout', onResize);

        const teardownSync = bindHorizontalSync($headScroll, $bodyScroll);

        return function teardown() {
            teardownSync();
            viewportLayout.teardown();
            $(window).off('resize.excelLayout', onResize);
        };
    };

    const loadAndRender = function (options) {
        const $container = options.$container;

        if (!$container || !$container.length) {
            return Promise.reject(new Error('params'));
        }

        if (typeof options.teardownLayout === 'function') {
            options.teardownLayout();
        }

        $container.html('<div class="excel-alcaldia-empty text-muted">Cargando registro…</div>');

        return fetchPreview().then(function (data) {
            const meta = '<div class="excel-alcaldia-sheet-label text-muted">Hoja: '
                + (data.sheetName || '2026')
                + (data.rowCount ? ' · ' + data.rowCount + ' filas' : '')
                + '</div>';

            $container.html(meta);

            const teardownLayout = mountSplitTable($container, data.html);

            if (options.onLayout) {
                options.onLayout(teardownLayout);
            }

            return {
                sheetName: data.sheetName,
                rowCount: data.rowCount,
                teardownLayout: teardownLayout,
            };
        });
    };

    return {
        loadAndRender: loadAndRender,
    };
});
