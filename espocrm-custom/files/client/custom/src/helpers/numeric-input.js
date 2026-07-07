define('custom:helpers/numeric-input', [], function () {

    var ONLY_DIGITS = /[^\d]/g;
    var INVALID_MESSAGE = 'Valor no válido. Solo se permiten números.';

    var sanitize = function (value) {
        return String(value || '').replace(ONLY_DIGITS, '');
    };

    var isAllowedKey = function (e) {
        if (e.ctrlKey || e.metaKey) {
            return true;
        }

        if (
            e.key === 'Backspace' ||
            e.key === 'Delete' ||
            e.key === 'Tab' ||
            e.key === 'Enter' ||
            e.key === 'Escape' ||
            e.key === 'ArrowLeft' ||
            e.key === 'ArrowRight' ||
            e.key === 'ArrowUp' ||
            e.key === 'ArrowDown' ||
            e.key === 'Home' ||
            e.key === 'End'
        ) {
            return true;
        }

        return /^[0-9]$/.test(e.key);
    };

    var bindToInput = function ($input, options) {
        options = options || {};

        if (!$input || !$input.length) {
            return;
        }

        $input.attr('inputmode', 'numeric');
        $input.attr('pattern', '[0-9]*');
        $input.attr('autocomplete', 'off');

        $input.off('.numericOnly');

        $input.on('keydown.numericOnly', function (e) {
            if (!isAllowedKey(e)) {
                e.preventDefault();
            }
        });

        $input.on('input.numericOnly paste.numericOnly', function () {
            var raw = this.value;
            var cleaned = sanitize(raw);

            if (raw !== cleaned) {
                this.value = cleaned;
            }
        });
    };

    return {
        INVALID_MESSAGE: INVALID_MESSAGE,
        sanitize: sanitize,
        bindToInput: bindToInput,
    };
});
