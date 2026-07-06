define('custom:helpers/excel-alcaldia-viewer-loader', [], function () {

    const PREFERRED_SHEET = '2026';
    let sheetJsPromise = null;

    const getSheetJsUrl = function (basePath) {
        return String(basePath || '').replace(/\/?$/, '/')
            + 'client/custom/lib/xlsx.mini.min.js';
    };

    const getAuthHeader = function () {
        const raw = localStorage.getItem('espo-user-auth');

        return raw || null;
    };

    const loadSheetJs = function (basePath) {
        if (window.XLSX) {
            return Promise.resolve(window.XLSX);
        }

        if (sheetJsPromise) {
            return sheetJsPromise;
        }

        sheetJsPromise = new Promise(function (resolve, reject) {
            const script = document.createElement('script');

            script.src = getSheetJsUrl(basePath);
            script.async = true;
            script.onload = function () {
                if (window.XLSX) {
                    resolve(window.XLSX);

                    return;
                }

                reject(new Error('SheetJS'));
            };
            script.onerror = function () {
                reject(new Error('SheetJS'));
            };

            document.head.appendChild(script);
        });

        return sheetJsPromise;
    };

    const fetchWorkbook = function (basePath, fileId) {
        const url = String(basePath || '').replace(/\/?$/, '/')
            + '?entryPoint=ExcelAlcaldiaViewerFile&id=' + encodeURIComponent(fileId);

        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();

            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

            const authHeader = getAuthHeader();

            if (authHeader) {
                xhr.setRequestHeader('Espo-Authorization', authHeader);
            }

            xhr.withCredentials = true;
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response);

                    return;
                }

                reject(new Error('download:' + xhr.status));
            };
            xhr.onerror = function () {
                reject(new Error('download'));
            };
            xhr.send();
        });
    };

    const pickSheetName = function (workbook) {
        if (!workbook || !workbook.SheetNames || !workbook.SheetNames.length) {
            return null;
        }

        if (workbook.SheetNames.indexOf(PREFERRED_SHEET) !== -1) {
            return PREFERRED_SHEET;
        }

        return workbook.SheetNames[0];
    };

    const sheetToTableHtml = function (XLSX, sheet) {
        if (!sheet || !sheet['!ref']) {
            return '<div class="excel-alcaldia-empty">La hoja está vacía.</div>';
        }

        return XLSX.utils.sheet_to_html(sheet, {
            id: 'excel-alcaldia-sheet-table',
            editable: false,
        });
    };

    const loadAndRender = function (options) {
        const basePath = options.basePath;
        const fileId = options.fileId;
        const $container = options.$container;

        if (!basePath || !fileId || !$container || !$container.length) {
            return Promise.reject(new Error('params'));
        }

        $container.html('<div class="excel-alcaldia-empty text-muted">Cargando registro…</div>');

        return loadSheetJs(basePath)
            .then(function (XLSX) {
                return fetchWorkbook(basePath, fileId).then(function (buffer) {
                    const workbook = XLSX.read(buffer, {type: 'array'});
                    const sheetName = pickSheetName(workbook);

                    if (!sheetName) {
                        throw new Error('empty');
                    }

                    const sheet = workbook.Sheets[sheetName];
                    const html = sheetToTableHtml(XLSX, sheet);
                    const meta = '<div class="excel-alcaldia-sheet-label text-muted">Hoja: '
                        + sheetName + '</div>';

                    $container.html(meta + '<div class="excel-alcaldia-scroll">' + html + '</div>');
                    $container.find('table').addClass('excel-alcaldia-table table table-bordered table-condensed');

                    return {
                        sheetName: sheetName,
                    };
                });
            });
    };

    return {
        loadAndRender: loadAndRender,
    };
});
