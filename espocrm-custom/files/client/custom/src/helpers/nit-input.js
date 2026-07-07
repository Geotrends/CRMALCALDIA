define('custom:helpers/nit-input', [], function () {

    var INVALID_MESSAGE = 'NIT no válido. Use el formato 900.123.456-7';

    var normalize = function (value) {
        return String(value || '').replace(/[^\d]/g, '');
    };

    var formatBodyWithDots = function (body) {
        body = String(body || '');

        if (body.length <= 3) {
            return body;
        }

        var len = body.length;
        var remainder = len % 3;
        var parts = [];
        var offset = 0;

        if (remainder > 0) {
            parts.push(body.slice(0, remainder));
            offset = remainder;
        }

        while (offset < len) {
            parts.push(body.slice(offset, offset + 3));
            offset += 3;
        }

        return parts.join('.');
    };

    var format = function (value) {
        var digits = normalize(value);

        if (!digits) {
            return '';
        }

        if (digits.length < 2) {
            return digits;
        }

        var checkDigit = digits.slice(-1);
        var body = digits.slice(0, -1);

        return formatBodyWithDots(body) + '-' + checkDigit;
    };

    var sanitizeInput = function (value) {
        return String(value || '').replace(/[^\d.\-]/g, '');
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

        return /^[0-9.\-]$/.test(e.key);
    };

    var bindToInput = function ($input, options) {
        options = options || {};

        if (!$input || !$input.length) {
            return;
        }

        $input.attr('inputmode', 'numeric');
        $input.attr('autocomplete', 'off');
        $input.attr('placeholder', '900.123.456-7');

        $input.off('.nitInput');

        $input.on('keydown.nitInput', function (e) {
            if (!isAllowedKey(e)) {
                e.preventDefault();
            }
        });

        $input.on('input.nitInput paste.nitInput', function () {
            var raw = this.value;
            var cleaned = sanitizeInput(raw);

            if (raw !== cleaned) {
                this.value = cleaned;
            }
        });

        $input.on('blur.nitInput', function () {
            var formatted = format(this.value);

            if (formatted) {
                this.value = formatted;
            }
        });
    };

    return {
        INVALID_MESSAGE: INVALID_MESSAGE,
        normalize: normalize,
        format: format,
        sanitizeInput: sanitizeInput,
        bindToInput: bindToInput,
    };
});
