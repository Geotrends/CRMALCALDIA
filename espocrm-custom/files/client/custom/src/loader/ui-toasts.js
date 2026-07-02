/**
 * Toasts y confirmaciones personalizadas — reemplaza el banner superior de Espo.Ui.
 */
(function () {
    if (window.__crmUiToasts) {
        return;
    }

    window.__crmUiToasts = true;

    var patched = false;
    var activeToastId = null;
    var toastTimers = {};

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getStack() {
        var $stack = $('#crm-toast-stack');

        if (!$stack.length) {
            $stack = $('<div>', {
                id: 'crm-toast-stack',
                class: 'crm-toast-stack',
            });
            $('body').append($stack);
        }

        return $stack;
    }

    function removeToast(id) {
        var $toast = $('#' + id);

        if (!$toast.length) {
            return;
        }

        $toast.removeClass('crm-toast--visible').addClass('crm-toast--hide');

        window.setTimeout(function () {
            $toast.remove();
        }, 260);

        if (activeToastId === id) {
            activeToastId = null;
        }

        if (toastTimers[id]) {
            window.clearTimeout(toastTimers[id]);
            delete toastTimers[id];
        }
    }

    function clearAllToasts() {
        $('#notification').remove();

        $('.crm-toast').each(function () {
            removeToast(this.id);
        });

        activeToastId = null;
    }

    function normalizeText(text) {
        return String(text || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function isLoadingMessage(text) {
        var normalized = normalizeText(text);

        if (!normalized || normalized === '...') {
            return true;
        }

        var loadingPatterns = [
            'guardando',
            'procesando',
            'cargando',
            'por favor espere',
            'please wait',
            'espere un momento',
            'un momento',
        ];

        return loadingPatterns.some(function (pattern) {
            return normalized.indexOf(pattern) !== -1;
        });
    }

    function isSuccessMessage(text) {
        var normalized = normalizeText(text);

        var successPatterns = [
            'guardado',
            'saved',
            'exito',
            'correctamente',
            'completado',
            'actualizado',
            'creado',
            'eliminado',
        ];

        return successPatterns.some(function (pattern) {
            return normalized.indexOf(pattern) !== -1;
        });
    }

    function parseMessage(raw) {
        var text = String(raw || '').trim();

        if (!text || text === '...' || text === ' ... ') {
            return {
                title: 'Procesando...',
                subtitle: '',
                loading: true,
            };
        }

        if (text.indexOf('\n') !== -1) {
            var lines = text.split('\n').map(function (line) {
                return line.trim();
            }).filter(Boolean);

            var title = lines[0] || text;

            return {
                title: title,
                subtitle: lines.slice(1).join(' '),
                loading: isLoadingMessage(title),
            };
        }

        if (/<[a-z][\s\S]*>/i.test(text)) {
            var $parsed = $('<div>').html(text);
            var paragraphs = $parsed.find('p');

            if (paragraphs.length > 1) {
                var htmlTitle = $(paragraphs[0]).text();

                return {
                    title: htmlTitle,
                    subtitle: paragraphs.slice(1).map(function () {
                        return $(this).text();
                    }).get().join(' '),
                    loading: isLoadingMessage(htmlTitle),
                };
            }

            var plain = $parsed.text() || text;

            return {
                title: plain,
                subtitle: '',
                loading: isLoadingMessage(plain),
            };
        }

        return {
            title: text,
            subtitle: '',
            loading: isLoadingMessage(text),
        };
    }

    function resolveToastType(type, meta) {
        if (meta.loading) {
            return 'loading';
        }

        if (type === 'error') {
            return 'danger';
        }

        if (type === 'success' || isSuccessMessage(meta.title)) {
            return 'success';
        }

        if (type === 'danger' || type === 'info' || type === 'warning') {
            return type;
        }

        return 'info';
    }

    function buildToast(type, raw, options) {
        var meta = parseMessage(raw);
        var toastType = resolveToastType(type, meta);
        var icons = {
            success: 'fa-circle-check',
            warning: 'fa-triangle-exclamation',
            danger: 'fa-circle-xmark',
            info: 'fa-circle-info',
            loading: 'fa-spinner fa-spin',
        };
        var iconClass = icons[toastType] || icons.warning;
        var id = 'crm-toast-' + Date.now();
        var showClose = !!(options.closeButton || toastType === 'danger');

        var $toast = $('<div>', {
            id: id,
            class: 'crm-toast crm-toast--' + toastType,
            role: 'alert',
            'aria-live': 'polite',
        });

        $toast.append(
            $('<div>', { class: 'crm-toast__icon', 'aria-hidden': 'true' }).append(
                $('<span>', { class: 'fas ' + iconClass })
            )
        );

        var $content = $('<div>', { class: 'crm-toast__content' });
        $content.append($('<div>', { class: 'crm-toast__title' }).text(meta.title));

        if (meta.subtitle) {
            $content.append($('<div>', { class: 'crm-toast__subtitle' }).text(meta.subtitle));
        }

        $toast.append($content);

        if (showClose) {
            var $close = $('<button>', {
                type: 'button',
                class: 'crm-toast__close',
                'aria-label': 'Cerrar',
            }).html('<span class="fas fa-times"></span>');

            $close.on('click', function () {
                removeToast(id);
            });

            $toast.append($close);
        }

        return {
            id: id,
            $toast: $toast,
        };
    }

    function patchNotify() {
        Espo.Ui.notify = function (message, type, timeout, options) {
            options = options || {};
            type = type || 'warning';

            $('#notification').remove();

            if (!message) {
                clearAllToasts();
                return;
            }

            if (type === 'error') {
                type = 'danger';
            }

            if (activeToastId) {
                removeToast(activeToastId);
            }

            var built = buildToast(type, message, options);

            activeToastId = built.id;
            getStack().append(built.$toast);

            window.requestAnimationFrame(function () {
                built.$toast.addClass('crm-toast--visible');
            });

            if (timeout && timeout > 0) {
                toastTimers[built.id] = window.setTimeout(function () {
                    removeToast(built.id);
                }, timeout);
            }
        };
    }

    function patchConfirm() {
        var Dialog = Espo.Ui.Dialog;

        if (!Dialog) {
            return;
        }

        Espo.Ui.confirm = function (message, options, callback, context) {
            options = options || {};

            var confirmText = options.confirmText || 'Sí, confirmar';
            var cancelText = options.cancelText || 'No, cancelar';
            var confirmStyle = options.confirmStyle || 'danger';
            var backdrop = options.backdrop;
            var confirmed = false;
            var body = options.isHtml ? String(message) : escapeHtml(String(message));
            var title = options.title || '¿Está seguro?';
            var html = '' +
                '<div class="crm-confirm-body">' +
                    '<div class="crm-confirm-icon" aria-hidden="true">' +
                        '<span class="fas fa-triangle-exclamation"></span>' +
                    '</div>' +
                    '<h4 class="crm-confirm-title">' + escapeHtml(title) + '</h4>' +
                    '<div class="crm-confirm-message">' + body + '</div>' +
                '</div>';

            if (backdrop === undefined) {
                backdrop = false;
            }

            return new Promise(function (resolve) {
                var dialog = new Dialog({
                    backdrop: backdrop,
                    header: null,
                    className: 'dialog-confirm crm-dialog-confirm',
                    backdropClassName: 'backdrop-confirm',
                    body: html,
                    buttonList: [
                        {
                            text: cancelText,
                            name: 'cancel',
                            className: 'btn-s-wide',
                            onClick: function () {
                                confirmed = true;
                                dialog.close();

                                if (options.cancelCallback) {
                                    if (context) {
                                        options.cancelCallback.call(context);
                                    } else {
                                        options.cancelCallback();
                                    }
                                }

                                resolve();
                            },
                            position: 'left',
                        },
                        {
                            text: confirmText,
                            name: 'confirm',
                            className: 'btn-s-wide',
                            onClick: function () {
                                confirmed = true;

                                if (callback) {
                                    if (context) {
                                        callback.call(context);
                                    } else {
                                        callback();
                                    }
                                }

                                resolve();
                                dialog.close();
                            },
                            style: confirmStyle,
                            position: 'right',
                        },
                    ],
                    onClose: function () {
                        if (!confirmed && options.cancelCallback) {
                            if (context) {
                                options.cancelCallback.call(context);
                            } else {
                                options.cancelCallback();
                            }
                        }

                        resolve();
                    },
                });

                dialog.show();
                dialog.$el.find('button[data-name="confirm"]').focus();
            });
        };
    }

    function patchUi() {
        if (patched || !window.Espo || !Espo.Ui || typeof Espo.Ui.notify !== 'function') {
            return false;
        }

        if (Espo.Ui.__crmToastsPatched) {
            patched = true;
            return true;
        }

        patchNotify();
        patchConfirm();

        Espo.Ui.__crmToastsPatched = true;
        patched = true;

        return true;
    }

    if (!patchUi()) {
        var attempts = 0;
        var timer = window.setInterval(function () {
            attempts += 1;

            if (patchUi() || attempts >= 80) {
                window.clearInterval(timer);
            }
        }, 250);

        document.addEventListener('DOMContentLoaded', function () {
            patchUi();
        });
    }
})();
