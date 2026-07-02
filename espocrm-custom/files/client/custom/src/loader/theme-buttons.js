/**
 * Botones y toasts modernos — CSS inline (no depende de archivos externos ni caché).
 */
(function () {
    if (window.__crmThemeButtons) {
        return;
    }

    window.__crmThemeButtons = true;

    var STYLE_ID = 'crm-modern-buttons-style';
    var VERSION = 'ui-pastel-buttons-2026-07-02';

    var INLINE_CSS = '' +
        'html.crm-modern-ui body .btn,' +
        'html.crm-modern-ui body button.btn,' +
        'html.crm-modern-ui body a.btn{' +
        'border-radius:9999px!important;' +
        'font-weight:700!important;' +
        'font-size:13px!important;' +
        'padding:10px 22px!important;' +
        'display:inline-flex!important;' +
        'align-items:center!important;' +
        'justify-content:center!important;' +
        'gap:8px!important;' +
        'line-height:1.25!important;' +
        'box-shadow:0 2px 8px rgba(15,23,42,.08)!important;' +
        'transition:transform .15s ease,box-shadow .15s ease,background .15s ease!important;' +
        '}' +
        'html.crm-modern-ui body .btn-sm{padding:8px 18px!important;font-size:12px!important;}' +
        'html.crm-modern-ui body .btn-xs,' +
        'html.crm-modern-ui body .btn-xs-wide,' +
        'html.crm-modern-ui body .btn-s-wide{padding:7px 16px!important;font-size:12px!important;}' +
        'html.crm-modern-ui body .btn-block{width:100%!important;}' +
        'html.crm-modern-ui body .btn-primary,' +
        'html.crm-modern-ui body .btn.btn-primary,' +
        'html.crm-modern-ui body a.btn-primary{' +
        'background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;' +
        'border:1px solid #b5e6d1!important;color:#1a5c47!important;' +
        'box-shadow:0 4px 14px rgba(29,138,110,.12)!important;' +
        '}' +
        'html.crm-modern-ui body .btn-primary:hover,' +
        'html.crm-modern-ui body .btn.btn-primary:hover,' +
        'html.crm-modern-ui body a.btn-primary:hover{' +
        'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;' +
        'border-color:#9fd9c0!important;color:#134a38!important;transform:translateY(-1px);' +
        'box-shadow:0 6px 18px rgba(29,138,110,.18)!important;' +
        '}' +
        'html.crm-modern-ui body .btn-default,' +
        'html.crm-modern-ui body .btn.btn-default{' +
        'background:#fff!important;border:1px solid #e2e8f0!important;color:#475569!important;' +
        '}' +
        'html.crm-modern-ui body .btn-default:hover,' +
        'html.crm-modern-ui body .btn.btn-default:hover{' +
        'background:#f8fafc!important;border-color:#d1ebe3!important;color:#2a5934!important;' +
        '}' +
        'html.crm-modern-ui body .btn-success{background:linear-gradient(135deg,#dcfce7,#bbf7d0)!important;border:1px solid #86efac!important;color:#166534!important;}' +
        'html.crm-modern-ui body .btn-danger{background:linear-gradient(135deg,#fee2e2,#fecaca)!important;border:1px solid #fca5a5!important;color:#b91c1c!important;}' +
        'html.crm-modern-ui body .btn-warning{background:linear-gradient(135deg,#fbbf24,#f59e0b)!important;border:none!important;color:#78350f!important;}' +
        'html.crm-modern-ui body .btn-link{border:none!important;background:transparent!important;box-shadow:none!important;color:#1d8a6e!important;}' +
        'html.crm-modern-ui body .btn-group{display:inline-flex!important;flex-wrap:wrap;gap:8px!important;vertical-align:middle;}' +
        'html.crm-modern-ui body .btn-group>.btn,' +
        'html.crm-modern-ui body .btn-group>.btn-group>.btn{' +
        'border-radius:9999px!important;margin-left:0!important;float:none!important;' +
        '}' +
        'html.crm-modern-ui body a.btn.action[data-name="create"],' +
        'html.crm-modern-ui body a.btn.action[data-action="create"],' +
        'html.crm-modern-ui body a.btn.main-header-manu-action[data-name="create"],' +
        'html.crm-modern-ui body .header-buttons>a.btn[data-name="create"],' +
        'html.crm-modern-ui body .header-buttons>a.btn[data-action="create"]{' +
        'background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;' +
        'border:1px solid #b5e6d1!important;color:#1a5c47!important;' +
        'box-shadow:0 4px 14px rgba(29,138,110,.12)!important;' +
        'min-height:40px!important;padding:10px 24px!important;' +
        '}' +
        'html.crm-modern-ui body a.btn.action[data-name="create"]:hover,' +
        'html.crm-modern-ui body a.btn.action[data-action="create"]:hover{' +
        'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;color:#134a38!important;' +
        '}' +
        'html.crm-modern-ui body a.btn.action[data-name="create"] .fas,' +
        'html.crm-modern-ui body a.btn.action[data-action="create"] .fas{color:#1a5c47!important;margin:0!important;}' +
        'html.crm-modern-ui body .search-container .form-control,html.crm-modern-ui body .search-row .form-control{' +
        'border-radius:9999px!important;border:1px solid #c5e8db!important;background:#f4fbf8!important;' +
        'min-height:40px!important;padding-left:16px!important;padding-right:16px!important;}' +
        'html.crm-modern-ui body .search-container .form-control:focus,html.crm-modern-ui body .search-row .form-control:focus{' +
        'border-color:#8fd4be!important;background:#fff!important;box-shadow:0 0 0 3px rgba(168,230,207,.45)!important;}' +
        'html.crm-modern-ui body .global-search-container .input-group{border-radius:9999px!important;border:1px solid #c5e8db!important;background:#f4fbf8!important;}' +
        'html.crm-modern-ui body .panel .btn-primary.btn-block,' +
        'html.crm-modern-ui body .comunicaciones-caso-panel .btn-primary,' +
        'html.crm-modern-ui body .modal-footer .btn{min-height:40px;}' +
        'html.crm-modern-ui body .badge,' +
        'html.crm-modern-ui body .label{' +
        'border-radius:9999px!important;font-weight:700!important;' +
        'padding:5px 12px 5px 28px!important;position:relative;display:inline-flex!important;align-items:center!important;' +
        '}' +
        'html.crm-modern-ui body .label::before,' +
        'html.crm-modern-ui body .badge::before{' +
        'content:"";position:absolute;left:10px;top:50%;width:12px;height:12px;margin-top:-6px;' +
        'border:2px solid currentColor;transform:rotate(45deg);border-radius:2px;opacity:.85;' +
        '}' +
        'html.crm-modern-ui body .pagination>li>a,' +
        'html.crm-modern-ui body #navbar a.minimizer{border-radius:8px!important;}';

    function injectInlineStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.setAttribute('data-version', VERSION);
        style.textContent = INLINE_CSS;
        (document.head || document.documentElement).appendChild(style);
        document.documentElement.classList.add('crm-modern-ui');
    }

    function loadExternalStyles() {
        [
            'client/custom/res/css/23-buttons.css',
            'client/custom/res/css/22-ui-toasts.css',
        ].forEach(function (path) {
            var id = 'crm-theme-' + path.split('/').pop().replace('.css', '');

            if (document.getElementById(id)) {
                return;
            }

            var link = document.createElement('link');
            link.id = id;
            link.rel = 'stylesheet';
            link.href = '/' + path + '?v=' + encodeURIComponent(VERSION);
            document.head.appendChild(link);
        });
    }

    function boot() {
        injectInlineStyles();
        loadExternalStyles();
    }

    if (document.head) {
        boot();
    } else {
        document.addEventListener('DOMContentLoaded', boot);
    }
})();
