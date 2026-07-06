define('custom:helpers/excel-alcaldia-sticky-header', [], function () {

    const syncColumnWidths = function ($sourceTable, $cloneTable) {
        const $sourceCells = $sourceTable.find('thead th');
        const $cloneCells = $cloneTable.find('thead th');

        $sourceCells.each(function (index, cell) {
            const width = $(cell).outerWidth();

            $cloneCells.eq(index).css({
                width: width,
                minWidth: width,
                maxWidth: width,
            });
        });

        $cloneTable.css('width', $sourceTable.outerWidth());
    };

    const bindStickyHeader = function ($container) {
        const $scroll = $container.find('.excel-alcaldia-scroll');
        const $table = $scroll.find('table.excel-alcaldia-table');
        const $thead = $table.find('thead');

        if (!$scroll.length || !$table.length || !$thead.length) {
            return null;
        }

        const $bar = $('<div class="excel-alcaldia-sticky-bar is-hidden" aria-hidden="true"></div>');
        const $track = $('<div class="excel-alcaldia-sticky-bar__track"></div>');
        const $cloneTable = $('<table class="excel-alcaldia-table table table-bordered table-condensed"></table>');

        $cloneTable.append($thead.clone());
        $track.append($cloneTable);
        $bar.append($track);
        $('body').append($bar);

        const update = function () {
            const scrollEl = $scroll[0];
            const scrollRect = scrollEl.getBoundingClientRect();
            const theadRect = $thead[0].getBoundingClientRect();
            const tableRect = $table[0].getBoundingClientRect();
            const shouldPin = theadRect.top < scrollRect.top
                && tableRect.bottom > scrollRect.top + 28;

            if (!shouldPin) {
                $bar.addClass('is-hidden');

                return;
            }

            syncColumnWidths($table, $cloneTable);

            $bar.removeClass('is-hidden').css({
                top: scrollRect.top,
                left: scrollRect.left,
                width: scrollRect.width,
            });

            $track.css('marginLeft', -scrollEl.scrollLeft);
        };

        $scroll.on('scroll.excelSticky', update);
        $(window).on('resize.excelSticky scroll.excelSticky', update);

        window.setTimeout(function () {
            syncColumnWidths($table, $cloneTable);
            update();
        }, 0);

        return function teardown() {
            $scroll.off('scroll.excelSticky');
            $(window).off('resize.excelSticky scroll.excelSticky');
            $bar.remove();
        };
    };

    return {
        bindStickyHeader: bindStickyHeader,
    };
});
