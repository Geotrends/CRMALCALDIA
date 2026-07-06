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

        if (!$bodyRow.length) {
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

    const mountSplitTable = function ($container, html) {
        const meta = $container.find('.excel-alcaldia-sheet-label');
        const metaHtml = meta.length ? meta.prop('outerHTML') : '';

        $container.html(
            metaHtml
            + '<div class="excel-alcaldia-viewport">'
            + '<div class="excel-alcaldia-head-wrap">'
            + '<div class="excel-alcaldia-head-scroll"></div>'
            + '</div>'
            + '<div class="excel-alcaldia-scroll"></div>'
            + '</div>'
        );

        const $bodyScroll = $container.find('.excel-alcaldia-scroll');
        const $headScroll = $container.find('.excel-alcaldia-head-scroll');

        $bodyScroll.html(html);

        const $bodyTable = $bodyScroll.find('table').first();
        const $thead = $bodyTable.find('thead').detach();
        const $headTable = $('<table class="excel-alcaldia-table table table-bordered table-condensed"></table>');

        $headTable.append($thead);
        $headScroll.append($headTable);

        window.setTimeout(function () {
            syncColumnWidths($headTable, $bodyTable);
            $headScroll.scrollLeft($bodyScroll.scrollLeft());
        }, 0);

        $(window).on('resize.excelLayout', function () {
            syncColumnWidths($headTable, $bodyTable);
        });

        const teardown = bindHorizontalSync($headScroll, $bodyScroll);

        return function unmount() {
            teardown();
            $(window).off('resize.excelLayout');
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
