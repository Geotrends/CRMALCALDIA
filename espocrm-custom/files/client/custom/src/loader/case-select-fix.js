/**
 * Caso — desplegables selectize fuera del panel (carga global).
 */
(function () {
    var PATCHED = 'caseFloatPatched';
    var PATCHED_WHEEL = 'caseFloatWheelPatched';
    var MAX_HEIGHT = 280;
    var MIN_HEIGHT = 120;
    var VIEWPORT_MARGIN = 12;

    function isCaseFormElement(el) {
        return el && el.closest && el.closest('.edit[data-scope="Case"]');
    }

    function getSelectizeFromControl(control) {
        if (!control) {
            return null;
        }

        var field = control.closest('.field');

        if (!field) {
            return null;
        }

        var select = field.querySelector('select.main-element');

        return select && select.selectize ? select.selectize : null;
    }

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

    function patchSelectElement(select) {
        if (!select || !select.selectize || !isCaseFormElement(select)) {
            return;
        }

        patchSelectize(select.selectize);

        if (select.selectize.isOpen) {
            floatDropdown(select.selectize);
        }
    }

    function scanCaseForm() {
        document.querySelectorAll('.edit[data-scope="Case"] select.main-element').forEach(function (select) {
            patchSelectElement(select);
        });
    }

    function handleInteraction(control) {
        var selectize = getSelectizeFromControl(control);

        if (!selectize) {
            return;
        }

        patchSelectize(selectize);

        setTimeout(function () { floatDropdown(selectize); }, 0);
        setTimeout(function () { floatDropdown(selectize); }, 40);
        setTimeout(function () { floatDropdown(selectize); }, 120);
    }

    function bindEvents() {
        document.addEventListener('mousedown', function (event) {
            var control = event.target.closest('.edit[data-scope="Case"] .selectize-control');

            if (control) {
                handleInteraction(control);
            }
        }, true);

        document.addEventListener('focusin', function (event) {
            var input = event.target.closest('.edit[data-scope="Case"] .selectize-input');

            if (input) {
                handleInteraction(input.closest('.selectize-control'));
            }
        });

        window.addEventListener('resize', function () {
            document.querySelectorAll('.edit[data-scope="Case"] select.main-element').forEach(function (select) {
                if (select.selectize && select.selectize.isOpen) {
                    floatDropdown(select.selectize);
                }
            });
        });

        window.addEventListener('scroll', function (event) {
            if (event.target && event.target.closest && event.target.closest('.case-select-dropdown-floating')) {
                return;
            }

            document.querySelectorAll('.edit[data-scope="Case"] select.main-element').forEach(function (select) {
                if (select.selectize && select.selectize.isOpen) {
                    floatDropdown(select.selectize);
                }
            });
        }, true);
    }

    function patchUiSelect() {
        if (typeof define !== 'function' || !define.amd) {
            setTimeout(patchUiSelect, 120);

            return;
        }

        define('custom:loader/case-select-fix-patch', ['ui/select'], function (SelectModule) {
            var Select = SelectModule.default || SelectModule;
            var originalInit = Select.init;

            if (originalInit._caseFloatPatched) {
                return;
            }

            Select.init = function (element, options) {
                originalInit.call(Select, element, options);

                var select = element instanceof window.jQuery ? element[0] : element;

                if (!select || !isCaseFormElement(select)) {
                    return;
                }

                setTimeout(function () { patchSelectElement(select); }, 0);
                setTimeout(function () { patchSelectElement(select); }, 80);
            };

            Select.init._caseFloatPatched = true;
        });

        if (typeof require === 'function') {
            require(['custom:loader/case-select-fix-patch']);
        }
    }

    function boot() {
        bindEvents();
        scanCaseForm();
        patchUiSelect();

        var root = document.getElementById('main') || document.body;

        new MutationObserver(function () {
            scanCaseForm();
        }).observe(root, {childList: true, subtree: true});
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
