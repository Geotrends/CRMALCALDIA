/**
 * Botones y toasts modernos — CSS inline (no depende de archivos externos ni caché).
 */
(function () {
    if (window.__crmThemeButtons) {
        return;
    }

    window.__crmThemeButtons = true;

    var STYLE_ID = 'crm-modern-buttons-style';
    var VERSION = 'ui-status-icons-2026-07-02';

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
        'box-shadow:none!important;' +
        'transition:background .15s ease,border-color .15s ease,color .15s ease!important;' +
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
        'box-shadow:none!important;' +
        '}' +
        'html.crm-modern-ui body .btn-primary:hover,' +
        'html.crm-modern-ui body .btn.btn-primary:hover,' +
        'html.crm-modern-ui body a.btn-primary:hover{' +
        'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;' +
        'border-color:#9fd9c0!important;color:#134a38!important;transform:none!important;' +
        'box-shadow:none!important;' +
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
        'box-shadow:none!important;' +
        'min-height:40px!important;padding:10px 24px!important;' +
        '}' +
        'html.crm-modern-ui body a.btn.action[data-name="create"]:hover,' +
        'html.crm-modern-ui body a.btn.action[data-action="create"]:hover{' +
        'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;color:#134a38!important;' +
        '}' +
        'html.crm-modern-ui body a.btn.action[data-name="create"] .fas,' +
        'html.crm-modern-ui body a.btn.action[data-action="create"] .fas{color:#1a5c47!important;margin:0!important;}' +
        'html.crm-modern-ui body .search-container .form-control,html.crm-modern-ui body .search-row .form-control{' +
        'border-radius:9999px!important;border:1px solid #e2e8f0!important;background:#fff!important;' +
        'min-height:40px!important;padding-left:16px!important;padding-right:16px!important;box-shadow:none!important;}' +
        'html.crm-modern-ui body .search-container .form-control:focus,html.crm-modern-ui body .search-row .form-control:focus{' +
        'border-color:#cbd5e1!important;background:#fff!important;box-shadow:none!important;outline:none!important;}' +
        'html.crm-modern-ui body .search-row{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:12px!important;}' +
        'html.crm-modern-ui body .search-row>.form-group{margin:0 6px!important;padding:0 4px!important;}' +
        'html.crm-modern-ui body .search-row .input-group{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;box-shadow:none!important;border:none!important;background:transparent!important;}' +
        'html.crm-modern-ui body .global-search-container .input-group{border-radius:9999px!important;border:1px solid #e2e8f0!important;background:#fff!important;box-shadow:none!important;}' +
        'html.crm-modern-ui body .panel .btn-primary.btn-block,' +
        'html.crm-modern-ui body .comunicaciones-caso-panel .btn-primary,' +
        'html.crm-modern-ui body .modal-footer .btn{min-height:40px;}' +
        'html.crm-modern-ui body .badge,' +
        'html.crm-modern-ui body .label{' +
        'border-radius:9999px!important;font-weight:700!important;' +
        'padding:5px 12px 5px 30px!important;position:relative;display:inline-flex!important;align-items:center!important;clip-path:none!important;}' +
        'html.crm-modern-ui body .badge::before,' +
        'html.crm-modern-ui body .label::before{' +
        'position:absolute;left:10px;top:50%;transform:translateY(-50%);border:none;' +
        'font-family:"Font Awesome 5 Free","Font Awesome 6 Free";font-weight:900;font-size:11px;line-height:1;opacity:1;}' +
        'html.crm-modern-ui body .label-success::before,html.crm-modern-ui body .badge-success::before{content:"\\f00c";}' +
        'html.crm-modern-ui body .label-warning::before,html.crm-modern-ui body .badge-warning::before{content:"\\f071";}' +
        'html.crm-modern-ui body .label-danger::before,html.crm-modern-ui body .badge-danger::before{content:"\\f00d";}' +
        'html.crm-modern-ui body .label-info::before,html.crm-modern-ui body .badge-info::before{content:"\\f05a";}' +
        'html.crm-modern-ui body .label-casePendiente::before,' +
        'html.crm-modern-ui body .label[data-case-status="Pendiente de radicacion"]::before{content:"\\f017";}' +
        'html.crm-modern-ui body .label-caseRadicado::before,' +
        'html.crm-modern-ui body .label[data-case-status="Radicado"]::before{content:"\\f15c";}' +
        'html.crm-modern-ui body .label-caseAsignado::before,' +
        'html.crm-modern-ui body .label[data-case-status="Asignado"]::before{content:"\\f4fc";}' +
        'html.crm-modern-ui body .label-caseEnProceso::before,' +
        'html.crm-modern-ui body .label[data-case-status="En proceso"]::before{content:"\\f085";}' +
        'html.crm-modern-ui body .label-caseVisitaRealizada::before,' +
        'html.crm-modern-ui body .label[data-case-status="Visita realizada"]::before{content:"\\f3c5";}' +
        'html.crm-modern-ui body .label-caseVisitaAprobada::before,' +
        'html.crm-modern-ui body .label[data-case-status="Visita aprobada"]::before{content:"\\f058";}' +
        'html.crm-modern-ui body .label-caseFinalizado::before,' +
        'html.crm-modern-ui body .label[data-case-status="Finalizado"]::before{content:"\\f11e";}' +
        'html.crm-modern-ui body .label-caseCerrado::before,' +
        'html.crm-modern-ui body .label[data-case-status="Proceso cerrado"]::before{content:"\\f023";}' +
        'html.crm-modern-ui body .party-expediente-badge{padding:3px 10px!important;}' +
        'html.crm-modern-ui body .party-expediente-badge::before{content:none!important;display:none!important;}' +
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
