/**
 * Navbar — minimizador en la parte superior + reflow suave (sin forzar expandir).
 */
(function () {
    var observerStarted = false;
    var bodyObserverStarted = false;

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

    function init() {
        flattenMoreMenu();
        setupMinimizerButton();
        triggerReflow();
        setTimeout(function () {
            flattenMoreMenu();
            setupMinimizerButton();
            triggerReflow();
        }, 600);
    }

    function startObserver() {
        if (observerStarted || !document.body) {
            return;
        }

        observerStarted = true;

        var observer = new MutationObserver(function () {
            setupMinimizerButton();
            flattenMoreMenu();
        });

        var navbar = document.querySelector('#navbar');

        if (navbar) {
            observer.observe(navbar, {childList: true, subtree: true});
        }
    }

    function startBodyObserver() {
        if (bodyObserverStarted || !document.body) {
            return;
        }

        bodyObserverStarted = true;

        var bodyObserver = new MutationObserver(function () {
            setupMinimizerButton();
        });

        bodyObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    function boot() {
        init();
        startObserver();
        startBodyObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
