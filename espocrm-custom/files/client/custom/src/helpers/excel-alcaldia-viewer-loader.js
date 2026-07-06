define('custom:helpers/excel-alcaldia-viewer-loader', [
    'custom:helpers/excel-alcaldia-sticky-header',
], function (StickyHeader) {

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

    const loadAndRender = function (options) {
        const $container = options.$container;
        const onStickyHeader = options.onStickyHeader || null;

        if (!$container || !$container.length) {
            return Promise.reject(new Error('params'));
        }

        if (typeof options.teardownStickyHeader === 'function') {
            options.teardownStickyHeader();
        }

        $container.html('<div class="excel-alcaldia-empty text-muted">Cargando registro…</div>');

        return fetchPreview().then(function (data) {
            const meta = '<div class="excel-alcaldia-sheet-label text-muted">Hoja: '
                + (data.sheetName || '2026')
                + (data.rowCount ? ' · ' + data.rowCount + ' filas' : '')
                + '</div>';

            $container.html(meta + '<div class="excel-alcaldia-scroll">' + data.html + '</div>');
            $container.find('table').addClass('excel-alcaldia-table table table-bordered table-condensed');

            const teardownStickyHeader = StickyHeader.bindStickyHeader($container);

            if (onStickyHeader) {
                onStickyHeader(teardownStickyHeader);
            }

            return {
                sheetName: data.sheetName,
                rowCount: data.rowCount,
                teardownStickyHeader: teardownStickyHeader,
            };
        });
    };

    return {
        loadAndRender: loadAndRender,
    };
});
