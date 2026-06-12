/**
 * Logo Alcaldía de Envigado + botón colapsar menú.
 */
(function () {
    var LOGO = '/client/custom/res/img/logo-envigado.png';

    function applyLogo() {
        var brand = document.querySelector('#navbar .navbar-logo-container .navbar-brand');
        if (!brand) {
            return;
        }

        brand.style.backgroundImage = 'url("' + LOGO + '")';
        brand.style.backgroundRepeat = 'no-repeat';
        brand.style.backgroundPosition = 'center center';
        brand.style.backgroundSize = 'contain';
        brand.style.minHeight = '82px';

        var img = brand.querySelector('img.logo');
        if (img) {
            img.src = LOGO;
            img.alt = 'Alcaldía de Envigado';
            img.style.visibility = 'hidden';
            img.style.position = 'absolute';
            img.style.width = '1px';
            img.style.height = '1px';
        }
    }

    function ensureMinimizerVisible() {
        var minimizer = document.querySelector('#navbar a.minimizer');
        if (minimizer) {
            minimizer.classList.remove('hidden');
            minimizer.title = 'Colapsar menú';
        }
    }

    function init() {
        applyLogo();
        ensureMinimizerVisible();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    var observer = new MutationObserver(function () {
        applyLogo();
        ensureMinimizerVisible();
    });

    observer.observe(document.body, {childList: true, subtree: true});
})();
