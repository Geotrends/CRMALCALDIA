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

        const $modal = $scroll.closest('.excel-alcaldia-modal-dialog');
        const $bar = $('<div class="excel-alcaldia-sticky-bar is-hidden" aria-hidden="true"></div>');
        const $track = $('<div class="excel-alcaldia-sticky-bar__track"></div>');
        const $cloneTable = $('<table class="excel-alcaldia-table table table-bordered table-condensed"></table>');

        $cloneTable.append($thead.clone());
        $track.append($cloneTable);
        $bar.append($track);

        if ($modal.length) {
            $modal.append($bar);
        } else {
            $('body').append($bar);
        }

        const update = function () {
            const scrollEl = $scroll[0];
            const scrollRect = scrollEl.getBoundingClientRect();
            const tableRect = $table[0].getBoundingClientRect();

            if (scrollEl.scrollTop <= 1 || tableRect.bottom <= scrollRect.top + 32) {
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

        const onScroll = function () {
            window.requestAnimationFrame(update);
        };

        $scroll.on('scroll.excelSticky', onScroll);
        $(window).on('resize.excelSticky', onScroll);

        window.setTimeout(function () {
            syncColumnWidths($table, $cloneTable);
            update();
        }, 50);

        window.setTimeout(update, 250);

        return function teardown() {
            $scroll.off('scroll.excelSticky');
            $(window).off('resize.excelSticky');
            $bar.remove();
        };
    };

    return {
        bindStickyHeader: bindStickyHeader,
    };
});
