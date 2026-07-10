/**
 * Navbar — minimizador arriba, logo Envigado abajo, reflow suave.
 */
(function () {
    var observerStarted = false;
    var flattenDone = false;
    var logoDone = false;
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
            'box-shadow:none!important;' +
            'transition:background .15s ease,border-color .15s ease,color .15s ease!important;}' +
            'html.crm-modern-ui body .btn-sm{padding:8px 18px!important;font-size:12px!important;}' +
            'html.crm-modern-ui body .btn-xs,html.crm-modern-ui body .btn-xs-wide,html.crm-modern-ui body .btn-s-wide{padding:7px 16px!important;font-size:12px!important;}' +
            'html.crm-modern-ui body .btn-primary,html.crm-modern-ui body .btn.btn-primary,html.crm-modern-ui body a.btn-primary{' +
            'background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;border:1px solid #b5e6d1!important;color:#1a5c47!important;' +
            'box-shadow:none!important;}' +
            'html.crm-modern-ui body .btn-primary:hover,html.crm-modern-ui body .btn.btn-primary:hover{' +
            'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;border-color:#9fd9c0!important;color:#134a38!important;' +
            'box-shadow:none!important;transform:none!important;}' +
            'html.crm-modern-ui body .btn-primary .fas,html.crm-modern-ui body .btn.btn-primary .fas{color:#1a5c47!important;}' +
            'html.crm-modern-ui body .btn-default,html.crm-modern-ui body .btn.btn-default{' +
            'background:#fff!important;border:1px solid #e2e8f0!important;color:#475569!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body .btn-danger{background:linear-gradient(135deg,#fee2e2,#fecaca)!important;border:1px solid #fca5a5!important;color:#b91c1c!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body .btn-success{background:linear-gradient(135deg,#dcfce7,#bbf7d0)!important;border:1px solid #86efac!important;color:#166534!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body .btn-group{display:inline-flex!important;flex-wrap:wrap;gap:8px!important;}' +
            'html.crm-modern-ui body .btn-group>.btn{border-radius:9999px!important;margin-left:0!important;float:none!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body a.btn.action[data-name="create"],html.crm-modern-ui body a.btn.action[data-action="create"],' +
            'html.crm-modern-ui body a.btn.main-header-manu-action[data-name="create"],' +
            'html.crm-modern-ui body .header-buttons>a.btn[data-name="create"]{' +
            'background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;border:1px solid #b5e6d1!important;color:#1a5c47!important;' +
            'box-shadow:none!important;min-height:40px!important;padding:10px 24px!important;}' +
            'html.crm-modern-ui body a.btn.action[data-name="create"]:hover,html.crm-modern-ui body a.btn.action[data-action="create"]:hover{' +
            'background:linear-gradient(135deg,#dff5ec 0%,#c8ebdc 100%)!important;color:#134a38!important;}' +
            'html.crm-modern-ui body a.btn.action[data-name="create"] .fas,html.crm-modern-ui body a.btn.action[data-action="create"] .fas{color:#1a5c47!important;margin:0!important;}' +
            'html.crm-modern-ui body .search-container .form-control,html.crm-modern-ui body .search-row .form-control,' +
            'html.crm-modern-ui body .list>.search-container .form-control,html.crm-modern-ui body .record .search-container .form-control{' +
            'border-radius:9999px!important;border:1px solid #e2e8f0!important;background:#fff!important;' +
            'min-height:40px!important;padding-left:16px!important;padding-right:16px!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body .search-container .form-control:focus,html.crm-modern-ui body .search-row .form-control:focus{' +
            'border-color:#cbd5e1!important;background:#fff!important;box-shadow:none!important;outline:none!important;}' +
            'html.crm-modern-ui body .search-container .btn,html.crm-modern-ui body .search-row .btn{' +
            'border-radius:9999px!important;background:#fff!important;border:1px solid #e2e8f0!important;color:#475569!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body .search-row{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:12px!important;}' +
            'html.crm-modern-ui body .search-row>.form-group{margin:0 6px!important;padding:0 4px!important;}' +
            'html.crm-modern-ui body .search-row .input-group{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;border:none!important;box-shadow:none!important;background:transparent!important;}' +
            'html.crm-modern-ui body .search-row .input-group>.form-control{flex:1 1 auto!important;min-width:140px!important;}' +
            'html.crm-modern-ui body .search-row .input-group>.input-group-btn,html.crm-modern-ui body .search-row .input-group>.input-group-btn.left-dropdown{width:auto!important;float:none!important;margin:0!important;}' +
            'html.crm-modern-ui body .global-search-container .input-group{border-radius:9999px!important;border:1px solid #e2e8f0!important;background:#fff!important;box-shadow:none!important;}' +
            'html.crm-modern-ui body #navbar .notifications-button{position:relative!important;overflow:visible!important;}' +
            'html.crm-modern-ui body #navbar .notifications-button .number-badge{' +
            'position:absolute!important;top:-4px!important;right:-4px!important;z-index:3!important;' +
            'min-width:18px!important;height:18px!important;padding:0 5px!important;' +
            'font-size:10px!important;font-weight:800!important;line-height:18px!important;' +
            'color:#1a5c47!important;background:linear-gradient(135deg,#eefaf5 0%,#d8f3e8 100%)!important;border:2px solid #b5e6d1!important;' +
            'border-radius:9999px!important;box-shadow:0 2px 6px rgba(26,92,71,.15)!important;' +
            'display:inline-flex!important;align-items:center!important;justify-content:center!important;clip-path:none!important;}' +
            'html.crm-modern-ui body #navbar .notifications-button .number-badge::before{content:none!important;display:none!important;}' +
            'html.crm-modern-ui body #navbar .notifications-button .number-badge.hidden{display:none!important;}' +
            'html.crm-modern-ui body .pagination>li>a,html.crm-modern-ui body #navbar a.minimizer{border-radius:8px!important;}';

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
        document.documentElement.classList.add('crm-modern-ui');
    }

    injectModernButtons();

    function isMobileNav() {
        return window.matchMedia('(max-width: 991px)').matches;
    }

    function setupMinimizerButton() {
        var minimizer = document.querySelector('#navbar a.minimizer');
        var header = document.querySelector('#navbar .navbar-header');

        if (!minimizer) {
            return;
        }

        if (isMobileNav()) {
            minimizer.classList.add('hidden');
            minimizer.setAttribute('aria-hidden', 'true');
            return;
        }

        minimizer.classList.remove('hidden');
        minimizer.removeAttribute('aria-hidden');

        if (header && minimizer.parentElement !== header) {
            header.insertBefore(minimizer, header.firstChild);
        }

        minimizer.title = document.body.classList.contains('minimized')
            ? 'Expandir menú'
            : 'Colapsar menú';
    }

    function syncMobileNavState(options) {
        var opts = options || {};
        var navbar = document.getElementById('navbar');
        var content = document.getElementById('content');

        if (!isMobileNav()) {
            if (opts.fromViewportChange) {
                document.body.classList.remove('side-menu-opened');

                if (content) {
                    content.style.marginLeft = '';
                }

                if (navbar) {
                    navbar.style.width = '';
                    navbar.style.minWidth = '';
                    navbar.style.maxWidth = '';
                }
            }

            updateMobileBackdrop();
            return;
        }

        document.body.classList.remove('minimized');

        if (content) {
            content.style.marginLeft = '0';
        }

        if (navbar && !document.body.classList.contains('side-menu-opened')) {
            navbar.style.width = '0';
            navbar.style.minWidth = '0';
            navbar.style.maxWidth = '0';
        }
    }

    var wasMobile = isMobileNav();
    var backdropEl = null;

    function ensureBackdrop() {
        if (backdropEl || !document.body) {
            return;
        }

        backdropEl = document.createElement('div');
        backdropEl.id = 'crm-mobile-nav-backdrop';
        backdropEl.setAttribute('aria-hidden', 'true');
        backdropEl.addEventListener('click', function () {
            document.body.classList.remove('side-menu-opened');
            updateMobileBackdrop();
        });
        document.body.appendChild(backdropEl);
    }

    function updateMobileBackdrop() {
        if (!isMobileNav()) {
            if (backdropEl) {
                backdropEl.style.display = 'none';
                backdropEl.style.pointerEvents = 'none';
            }

            return;
        }

        ensureBackdrop();

        var isOpen = document.body.classList.contains('side-menu-opened');

        backdropEl.style.display = isOpen ? 'block' : 'none';
        backdropEl.style.pointerEvents = isOpen ? 'auto' : 'none';
    }

    function setupMobileMenuControls() {
        document.addEventListener('click', function (e) {
            if (!isMobileNav() || !document.body.classList.contains('side-menu-opened')) {
                return;
            }

            if (e.target.closest('#navbar')) {
                if (e.target.closest('#navbar ul.tabs a')) {
                    setTimeout(function () {
                        document.body.classList.remove('side-menu-opened');
                        updateMobileBackdrop();
                    }, 120);
                }

                return;
            }

            if (e.target.id === 'crm-mobile-nav-backdrop') {
                return;
            }

            document.body.classList.remove('side-menu-opened');
            updateMobileBackdrop();
        });
    }

    function watchMenuState() {
        if (!document.body || watchMenuState.started) {
            return;
        }

        watchMenuState.started = true;

        var observer = new MutationObserver(function (mutations) {
            var classChanged = mutations.some(function (mutation) {
                return mutation.type === 'attributes' && mutation.attributeName === 'class';
            });

            if (!classChanged) {
                return;
            }

            updateMobileBackdrop();
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });
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
            flattenDone = true;
            return;
        }

        var toggle = moreLi.querySelector('a.dropdown-toggle');

        if (toggle) {
            toggle.remove();
        }

        var submenu = moreLi.querySelector('.more-dropdown-menu');

        if (!submenu) {
            moreLi.classList.add('hidden');
            flattenDone = true;
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
        flattenDone = true;
    }

    function syncNavbar() {
        if (!document.querySelector('#navbar .navbar-left-container')) {
            return;
        }

        if (!flattenDone) {
            flattenMoreMenu();
        }

        if (!logoDone) {
            ensureSidebarLogo();
            logoDone = true;
        }

        setupMinimizerButton();
        syncMobileNavState();
        updateMobileBackdrop();
    }

    function init() {
        if (isMobileNav()) {
            document.body.classList.remove('side-menu-opened');
        }

        syncNavbar();
        updateMobileBackdrop();
        setTimeout(syncNavbar, 600);
    }

    function startObserver() {
        var navbar = document.getElementById('navbar');

        if (observerStarted || !navbar) {
            return;
        }

        observerStarted = true;

        var observer = new MutationObserver(function () {
            if (!flattenDone) {
                syncNavbar();
                return;
            }

            setupMinimizerButton();
        });

        observer.observe(navbar, {
            childList: true,
            subtree: true,
        });
    }

    var resizeTimer = null;

    function onViewportChange() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }

        resizeTimer = setTimeout(function () {
            var nowMobile = isMobileNav();

            if (nowMobile && !wasMobile) {
                document.body.classList.remove('side-menu-opened');
            }

            wasMobile = nowMobile;
            setupMinimizerButton();
            syncMobileNavState({ fromViewportChange: true });
            updateMobileBackdrop();
        }, 150);
    }

    function boot() {
        init();
        setupMobileMenuControls();
        watchMenuState();
        window.addEventListener('resize', onViewportChange);
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
