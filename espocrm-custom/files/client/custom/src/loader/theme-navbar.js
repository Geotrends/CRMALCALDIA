/**
 * Navbar — minimizador arriba, logo Envigado abajo, reflow suave.
 */
(function () {
    var observerStarted = false;
    var LOGO_SRC = 'client/custom/res/img/logo-envigado.png';

    var STYLE_ID = 'crm-modern-buttons-style';

    function injectModernButtons() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        var css = '' +
            'html.crm-modern-ui body .btn,' +
            'html.crm-modern-ui body button.btn,' +
            'html.crm-modern-ui body a.btn{' +
            'border-radius:9999px!important;font-weight:700!important;font-size:13px!important;' +
            'padding:10px 22px!important;display:inline-flex!important;align-items:center!important;' +
            'justify-content:center!important;gap:8px!important;line-height:1.25!important;' +
            'box-shadow:0 2px 8px rgba(15,23,42,.08)!important;' +
            'transition:transform .15s ease,box-shadow .15s ease,background .15s ease!important;}' +
            'html.crm-modern-ui body .btn-sm{padding:8px 18px!important;font-size:12px!important;}' +
            'html.crm-modern-ui body .btn-xs,html.crm-modern-ui body .btn-xs-wide,html.crm-modern-ui body .btn-s-wide{padding:7px 16px!important;font-size:12px!important;}' +
            'html.crm-modern-ui body .btn-primary,html.crm-modern-ui body .btn.btn-primary,html.crm-modern-ui body a.btn-primary{' +
            'background:linear-gradient(135deg,#1d8a6e 0%,#2a5934 100%)!important;border:none!important;color:#fff!important;' +
            'box-shadow:0 4px 16px rgba(29,138,110,.34)!important;}' +
            'html.crm-modern-ui body .btn-primary:hover,html.crm-modern-ui body .btn.btn-primary:hover{' +
            'background:linear-gradient(135deg,#22a07f 0%,#1e4d32 100%)!important;color:#fff!important;' +
            'transform:translateY(-1px);box-shadow:0 6px 22px rgba(29,138,110,.42)!important;}' +
            'html.crm-modern-ui body .btn-default,html.crm-modern-ui body .btn.btn-default{' +
            'background:#fff!important;border:1px solid #e2e8f0!important;color:#475569!important;}' +
            'html.crm-modern-ui body .btn-danger{background:linear-gradient(135deg,#f87171,#ef4444)!important;border:none!important;color:#fff!important;}' +
            'html.crm-modern-ui body .btn-success{background:linear-gradient(135deg,#22c55e,#16a34a)!important;border:none!important;color:#fff!important;}' +
            'html.crm-modern-ui body .btn-group{display:inline-flex!important;flex-wrap:wrap;gap:8px!important;}' +
            'html.crm-modern-ui body .btn-group>.btn{border-radius:9999px!important;margin-left:0!important;float:none!important;}' +
            'html.crm-modern-ui body a.btn.action[data-name="create"],html.crm-modern-ui body a.btn.action[data-action="create"],' +
            'html.crm-modern-ui body a.btn.main-header-manu-action[data-name="create"],' +
            'html.crm-modern-ui body .header-buttons>a.btn[data-name="create"]{' +
            'background:linear-gradient(135deg,#1d8a6e 0%,#2a5934 100%)!important;border:none!important;color:#fff!important;' +
            'box-shadow:0 4px 16px rgba(29,138,110,.34)!important;min-height:40px!important;padding:10px 24px!important;}' +
            'html.crm-modern-ui body a.btn.action[data-name="create"] .fas,html.crm-modern-ui body a.btn.action[data-action="create"] .fas{color:#fff!important;margin:0!important;}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        document.documentElement.classList.add('crm-modern-ui');
    }

    injectModernButtons();

    function setupMinimizerButton() {
        var minimizer = document.querySelector('#navbar a.minimizer');
        var header = document.querySelector('#navbar .navbar-header');

        if (!minimizer) {
            return;
        }

        if (header && minimizer.parentElement !== header) {
            header.insertBefore(minimizer, header.firstChild);
        }

        minimizer.classList.remove('hidden');
        minimizer.title = document.body.classList.contains('minimized')
            ? 'Expandir menú'
            : 'Colapsar menú';
    }

    function ensureSidebarLogo() {
        var nav = document.querySelector('#navbar > .navbar');

        if (!nav) {
            return;
        }

        var brand = nav.querySelector('.crm-sidebar-brand');

        if (!brand) {
            brand = document.createElement('div');
            brand.className = 'crm-sidebar-brand';

            var img = document.createElement('img');
            img.src = LOGO_SRC;
            img.alt = 'Alcaldía de Envigado';
            brand.appendChild(img);
            nav.appendChild(brand);
        } else if (brand.parentElement !== nav) {
            nav.appendChild(brand);
        }
    }

    function triggerReflow() {
        try {
            window.dispatchEvent(new Event('resize'));
        } catch (e) {
            /* ignore */
        }
    }

    function flattenMoreMenu() {
        var tabs = document.querySelector('#navbar ul.tabs');

        if (!tabs) {
            return;
        }

        tabs.querySelectorAll('li.show-more').forEach(function (el) {
            el.remove();
        });

        var moreLi = tabs.querySelector('li.dropdown.more, li.more');

        if (!moreLi) {
            return;
        }

        var toggle = moreLi.querySelector('a.dropdown-toggle');

        if (toggle) {
            toggle.remove();
        }

        var submenu = moreLi.querySelector('.more-dropdown-menu');

        if (!submenu) {
            moreLi.classList.add('hidden');
            return;
        }

        Array.prototype.slice.call(submenu.children).forEach(function (item) {
            if (item.classList.contains('show-more') ||
                item.classList.contains('after-show-more')) {
                item.classList.remove('hidden');
            }

            tabs.insertBefore(item, moreLi);
        });

        moreLi.remove();
    }

    function syncNavbar() {
        if (!document.querySelector('#navbar .navbar-left-container')) {
            return;
        }

        flattenMoreMenu();
        setupMinimizerButton();
        ensureSidebarLogo();
    }

    function init() {
        syncNavbar();
        triggerReflow();
        setTimeout(function () {
            syncNavbar();
            triggerReflow();
        }, 600);
        setTimeout(syncNavbar, 1500);
    }

    function startObserver() {
        if (observerStarted || !document.body) {
            return;
        }

        observerStarted = true;

        var observer = new MutationObserver(function () {
            syncNavbar();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function boot() {
        init();
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
