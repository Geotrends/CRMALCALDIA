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
        return window.matchMedia('(max-width: 1024px)').matches;
    }

    var MOBILE_NAV_STYLE_ID = 'crm-mobile-nav-style';

    function injectMobileNavStyles() {
        if (document.getElementById(MOBILE_NAV_STYLE_ID)) {
            return;
        }

        var css = '' +
            '@media (max-width:1024px){' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #content,' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #content>.content{' +
            'margin-left:0!important;padding-left:0!important;width:100%!important;max-width:100vw!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar{' +
            'width:0!important;min-width:0!important;max-width:0!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar>.navbar{' +
            'width:0!important;min-width:0!important;max-width:0!important;min-height:0!important;height:auto!important;' +
            'border:none!important;box-shadow:none!important;background:transparent!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar .navbar-left-container,' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar ul.tabs,' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar>.navbar>.crm-sidebar-brand{' +
            'display:none!important;visibility:hidden!important;width:0!important;height:0!important;overflow:hidden!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active:not(.side-menu-opened) #navbar .navbar-nav.navbar-right{' +
            'position:fixed!important;top:8px!important;right:8px!important;left:56px!important;z-index:1060!important;' +
            'display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar{' +
            'position:fixed!important;left:0!important;top:0!important;bottom:0!important;' +
            'width:min(300px,88vw)!important;min-width:min(300px,88vw)!important;max-width:min(300px,88vw)!important;' +
            'height:100vh!important;z-index:1080!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar>.navbar{' +
            'width:100%!important;min-width:100%!important;max-width:100%!important;height:100vh!important;min-height:100vh!important;' +
            'display:flex!important;flex-direction:column!important;background:#fff!important;' +
            'border-radius:0 22px 22px 0!important;box-shadow:4px 0 24px rgba(15,23,42,.14)!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar .navbar-left-container,' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar .navbar-collapse.navbar-body,' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar ul.tabs{' +
            'display:flex!important;visibility:visible!important;width:100%!important;height:auto!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar ul.tabs{' +
            'flex-direction:column!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar ul.tabs span.full-label,' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar .more-dropdown-menu span.full-label{' +
            'display:inline-block!important;visibility:visible!important;opacity:1!important;font-size:14px!important;font-weight:500!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar ul.tabs>li.tab>a,' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar .more-dropdown-menu>li.tab>a{' +
            'justify-content:flex-start!important;width:auto!important;height:auto!important;' +
            'margin:6px 10px!important;padding:10px 14px!important;gap:14px!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened #navbar ul.tabs>li.tab-divider{' +
            'display:block!important;}' +
            'html.crm-modern-ui body.crm-mobile-nav-active.side-menu-opened::after{' +
            'content:"";position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:1075;pointer-events:auto;}' +
            '}';

        var style = document.createElement('style');
        style.id = MOBILE_NAV_STYLE_ID;
        style.textContent = css;
        (document.head || document.documentElement).appendChild(style);
    }

    function applyMobileNavLayout() {
        var body = document.body;

        if (!isMobileNav()) {
            body.classList.remove('crm-mobile-nav-active');
            return;
        }

        injectMobileNavStyles();
        body.classList.add('crm-mobile-nav-active');
        body.classList.remove('minimized');

        var navbar = document.getElementById('navbar');
        var content = document.getElementById('content');
        var opened = body.classList.contains('side-menu-opened');

        if (content) {
            content.style.setProperty('margin-left', '0', 'important');
            content.style.setProperty('width', '100%', 'important');
            content.style.setProperty('max-width', '100%', 'important');
        }

        if (!navbar) {
            return;
        }

        if (opened) {
            navbar.style.removeProperty('width');
            navbar.style.removeProperty('min-width');
            navbar.style.removeProperty('max-width');
        } else {
            navbar.style.setProperty('width', '0', 'important');
            navbar.style.setProperty('min-width', '0', 'important');
            navbar.style.setProperty('max-width', '0', 'important');
        }
    }

    function ensureMobileMenuClosedOnStart() {
        if (!isMobileNav()) {
            return;
        }

        document.body.classList.remove('side-menu-opened');
        applyMobileNavLayout();
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

    function closeMobileMenu() {
        if (!isMobileNav() || !document.body.classList.contains('side-menu-opened')) {
            return;
        }

        document.body.classList.remove('side-menu-opened');
        applyMobileNavLayout();
        triggerReflow();
    }

    function openMobileMenu() {
        if (!isMobileNav()) {
            return;
        }

        document.body.classList.remove('minimized');
        document.body.classList.add('side-menu-opened');
        applyMobileNavLayout();
        triggerReflow();
    }

    function setupMobileMenuControls() {
        document.addEventListener('click', function (e) {
            if (!isMobileNav()) {
                return;
            }

            if (e.target.closest('a.side-menu-button')) {
                e.preventDefault();
                e.stopPropagation();

                if (document.body.classList.contains('side-menu-opened')) {
                    closeMobileMenu();
                } else {
                    openMobileMenu();
                }

                return;
            }

            if (document.body.classList.contains('side-menu-opened')) {
                if (e.target.closest('#navbar ul.tabs a')) {
                    setTimeout(closeMobileMenu, 120);
                    return;
                }

                if (!e.target.closest('#navbar')) {
                    closeMobileMenu();
                }
            }
        }, true);
    }

    var resizeTimer = null;

    function onViewportChange() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }

        resizeTimer = setTimeout(function () {
            setupMinimizerButton();
            applyMobileNavLayout();

            if (!isMobileNav()) {
                closeMobileMenu();
                document.body.classList.remove('crm-mobile-nav-active');
            }
        }, 120);
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
        applyMobileNavLayout();
    }

    function watchNavbarClasses() {
        if (!document.body || watchNavbarClasses.started) {
            return;
        }

        watchNavbarClasses.started = true;

        var observer = new MutationObserver(function (mutations) {
            if (!isMobileNav()) {
                return;
            }

            var shouldApply = mutations.some(function (mutation) {
                return mutation.type === 'attributes' &&
                    (mutation.attributeName === 'class' || mutation.attributeName === 'style');
            });

            if (shouldApply) {
                applyMobileNavLayout();
            }
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        var navbar = document.getElementById('navbar');
        var content = document.getElementById('content');

        if (navbar) {
            observer.observe(navbar, {
                attributes: true,
                attributeFilter: ['style', 'class'],
            });
        }

        if (content) {
            observer.observe(content, {
                attributes: true,
                attributeFilter: ['style', 'class'],
            });
        }
    }

    function init() {
        injectMobileNavStyles();
        ensureMobileMenuClosedOnStart();
        syncNavbar();
        triggerReflow();
        setTimeout(function () {
            ensureMobileMenuClosedOnStart();
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
        setupMobileMenuControls();
        watchNavbarClasses();
        window.addEventListener('resize', onViewportChange);
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
