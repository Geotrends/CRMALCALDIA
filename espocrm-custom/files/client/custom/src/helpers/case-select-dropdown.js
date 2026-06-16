/**
 * Helper compartido — desplegables selectize flotantes en formulario Caso.
 */
define('custom:helpers/case-select-dropdown', [], function () {

    var PATCHED = 'caseFloatPatched';
    var PATCHED_WHEEL = 'caseFloatWheelPatched';
    var MAX_HEIGHT = 280;
    var MIN_HEIGHT = 120;
    var VIEWPORT_MARGIN = 12;

    function getContentEl(selectize) {
        if (selectize.$dropdown_content && selectize.$dropdown_content.length) {
            return selectize.$dropdown_content;
        }

        return selectize.$dropdown.find('.selectize-dropdown-content');
    }

    function positionDropdown(selectize) {
        var control = selectize.$control[0];

        if (!control) {
            return;
        }

        var rect = control.getBoundingClientRect();
        var spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
        var spaceAbove = rect.top - VIEWPORT_MARGIN;
        var openUp = spaceBelow < MIN_HEIGHT && spaceAbove > spaceBelow;
        var available = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, openUp ? spaceAbove : spaceBelow));
        var $content = getContentEl(selectize);

        if ($content.length) {
            $content.css({
                maxHeight: available + 'px',
                height: 'auto',
                overflowY: 'auto',
                overflowX: 'hidden',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                pointerEvents: 'auto',
            });
        }

        selectize.$dropdown.css({
            position: 'fixed',
            width: rect.width + 'px',
            left: rect.left + 'px',
            bottom: 'auto',
            right: 'auto',
            margin: 0,
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            zIndex: 10050,
        });

        var dropdownHeight = selectize.$dropdown.outerHeight() || available;

        selectize.$dropdown.css({
            top: openUp ? Math.max(VIEWPORT_MARGIN, rect.top - dropdownHeight) + 'px' : rect.bottom + 'px',
        });
    }

    function bindScrollInside(selectize) {
        if (!selectize || selectize[PATCHED_WHEEL]) {
            return;
        }

        selectize[PATCHED_WHEEL] = true;

        selectize.$dropdown.on('wheel.caseFloat touchmove.caseFloat', function (event) {
            event.stopPropagation();
        });

        getContentEl(selectize).on('wheel.caseFloat touchmove.caseFloat', function (event) {
            event.stopPropagation();
        });
    }

    function floatDropdown(selectize) {
        if (!selectize || !selectize.isOpen) {
            return;
        }

        selectize.$dropdown.appendTo(document.body);
        selectize.$dropdown.addClass('case-select-dropdown-floating');
        bindScrollInside(selectize);
        positionDropdown(selectize);
    }

    function patchSelectize(selectize) {
        if (!selectize || selectize[PATCHED]) {
            return;
        }

        selectize[PATCHED] = true;
        bindScrollInside(selectize);

        var originalOpen = selectize.open.bind(selectize);

        selectize.open = function () {
            originalOpen();
            floatDropdown(selectize);
        };

        if (typeof selectize.positionDropdown === 'function') {
            var originalPosition = selectize.positionDropdown.bind(selectize);

            selectize.positionDropdown = function () {
                if (selectize.isOpen) {
                    floatDropdown(selectize);
                } else {
                    originalPosition();
                }
            };
        }
    }

    return {
        patchSelectize: patchSelectize,
        floatDropdown: floatDropdown,
        positionDropdown: positionDropdown,
    };
});
