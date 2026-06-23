/**
 * Fuerza etiquetas Persona natural / Persona jurídica en toda la UI.
 */
(function () {
    var PATCH_VERSION = '7';
    var STORAGE_KEY = 'espo-personas-i18n-version';

    var PATCH = {
        Global: {
            scopeNames: {
                Contact: 'Persona natural',
                Account: 'Persona jurídica'
            },
            scopeNamesPlural: {
                Contact: 'Personas naturales',
                Account: 'Personas jurídicas'
            },
            labels: {
                contacts: 'Personas naturales',
                accounts: 'Personas jurídicas',
                Contacts: 'Personas naturales',
                Accounts: 'Personas jurídicas'
            }
        },
        Contact: {
            labels: {
                'Create Contact': 'Crear persona natural'
            },
            links: {
                account: 'Persona jurídica (primaria)',
                accounts: 'Personas jurídicas',
                cases: 'Casos'
            }
        },
        Account: {
            labels: {
                'Create Account': 'Crear persona jurídica'
            },
            links: {
                contacts: 'Personas naturales',
                contactsPrimary: 'Personas naturales (primario)',
                cases: 'Casos'
            },
            tabs: {
                Casos: 'Casos'
            }
        },
        Case: {
            fields: {
                contact: 'Persona natural (peticionario)',
                account: 'Persona jurídica (peticionario)',
                cPerjudicanteContact: 'Persona natural (perjudicante)',
                cPerjudicanteCuenta: 'Persona jurídica (perjudicante)',
                cTipoPersonaPeticionario: 'Tipo de peticionario',
                cDocumentoPeticionario: 'Documento del peticionario',
                cNombrePeticionario: 'Nombre(s) del peticionario',
                cApellidoPeticionario: 'Apellido(s) del peticionario',
                cTelefonoPeticionario: 'Teléfono del peticionario',
                cCorreoPeticionario: 'Correo del peticionario',
                cCanalDeReportePeticionario: 'Canal de reporte del peticionario',
                cMunicipioPeticionario: 'Municipio del peticionario',
                cDireccionPeticionario: 'Dirección del peticionario',
                cBarrioPeticionario: 'Barrio del peticionario',
                cZonaAlcaldiaPeticionario: 'Zona del peticionario',
                cViaPrincipalPeticionario: 'Vía principal del peticionario',
                cNumViaPrincipalPeticionario: 'N° vía principal del peticionario',
                cLetraViaPrincipalPeticionario: 'Letra del peticionario',
                cCuadranteViaPrincipalPeticionario: 'Cuadrante del peticionario',
                cGeneradoraPeticionario: 'Generadora del peticionario',
                cLetraGeneradoraPeticionario: 'Letra generadora del peticionario',
                cCuadranteGeneradoraPeticionario: 'Cuadrante del peticionario',
                cPlacaPeticionario: 'Placa del peticionario',
                cBloquePeticionario: 'Bloque del peticionario',
                cInteriorPeticionario: 'Interior del peticionario'
            },
            links: {
                contact: 'Persona natural (peticionario)',
                account: 'Persona jurídica (peticionario)',
                Contacts: 'Personas naturales'
            }
        }
    };

    var DOM_REPLACEMENTS = {
        'Contactos': 'Personas naturales',
        'Cuentas': 'Personas jurídicas',
        'Crear Contacto': 'Crear persona natural',
        'Crear Cuenta': 'Crear persona jurídica'
    };

    function mergeScope(target, source) {
        Object.keys(source).forEach(function (key) {
            var value = source[key];

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                target[key] = target[key] || {};
                mergeScope(target[key], value);
            } else {
                target[key] = value;
            }
        });

        return target;
    }

    function applyLanguagePatch(language) {
        if (!language || !language.setScopeData) {
            return false;
        }

        Object.keys(PATCH).forEach(function (scope) {
            var current = language.getScopeData(scope) || {};
            mergeScope(current, PATCH[scope]);
            language.setScopeData(scope, current);
        });

        return true;
    }

    function patchDomLabels() {
        document.querySelectorAll(
            '#navbar a, .page-header h3, .header-title, .breadcrumb a, .panel-heading .panel-title'
        ).forEach(function (el) {
            var text = (el.textContent || '').trim();

            if (DOM_REPLACEMENTS[text]) {
                el.textContent = DOM_REPLACEMENTS[text];
            }
        });
    }

    function refreshNavbar(app) {
        var navbar = app.get('navbar');

        if (navbar && typeof navbar.render === 'function') {
            navbar.render();
        }
    }

    function init(app) {
        var language = app.getLanguage && app.getLanguage();

        if (!language) {
            return;
        }

        applyLanguagePatch(language);
        patchDomLabels();
        localStorage.setItem(STORAGE_KEY, PATCH_VERSION);
    }

    function waitForApp() {
        var tries = 0;
        var timer = setInterval(function () {
            tries++;

            if (window.Espo && Espo.App && Espo.App.instance) {
                init(Espo.App.instance);
                clearInterval(timer);
            }

            if (tries > 200) {
                clearInterval(timer);
            }
        }, 50);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForApp);
    } else {
        waitForApp();
    }
})();
