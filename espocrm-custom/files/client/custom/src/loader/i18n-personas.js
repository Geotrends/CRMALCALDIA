/**
 * Fuerza etiquetas Persona natural / Persona jurídica en toda la UI.
 */
(function () {
    var PATCH_VERSION = '9';
    var STORAGE_KEY = 'espo-personas-i18n-version';

    var PATCH = {
        Global: {
            scopeNames: {
                Case: 'Caso',
                User: 'Usuario',
                Contact: 'Persona natural',
                Account: 'Persona jurídica',
                Document: 'Documento',
                Template: 'Plantilla PDF',
                Calendar: 'Calendario',
                Task: 'Tarea',
                Team: 'Equipo'
            },
            scopeNamesPlural: {
                Case: 'Casos',
                User: 'Usuarios',
                Contact: 'Personas naturales',
                Account: 'Personas jurídicas',
                Document: 'Documentos',
                Template: 'Plantillas PDF',
                Task: 'Tareas',
                Team: 'Equipos'
            },
            labels: {
                Home: 'Inicio',
                contacts: 'Personas naturales',
                accounts: 'Personas jurídicas',
                Contacts: 'Personas naturales',
                Accounts: 'Personas jurídicas',
                Cases: 'Casos',
                Users: 'Usuarios',
                Documents: 'Documentos',
                Templates: 'Plantillas PDF',
                Teams: 'Equipos',
                Tasks: 'Tareas'
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
            labels: {
                'Create Case': 'Crear caso'
            },
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
        'Home': 'Inicio',
        'Cases': 'Casos',
        'Users': 'Usuarios',
        'Contacts': 'Personas naturales',
        'Accounts': 'Personas jurídicas',
        'Documents': 'Documentos',
        'PDF Templates': 'Plantillas PDF',
        'Templates': 'Plantillas PDF',
        'Calendar': 'Calendario',
        'Tasks': 'Tareas',
        'Teams': 'Equipos',
        'Contactos': 'Personas naturales',
        'Cuentas': 'Personas jurídicas',
        'Casos': 'Casos',
        'Usuarios': 'Usuarios',
        'Documentos': 'Documentos',
        'Plantillas PDF': 'Plantillas PDF',
        'Calendario': 'Calendario',
        'Tareas': 'Tareas',
        'Equipos': 'Equipos',
        'Crear Contacto': 'Crear persona natural',
        'Crear Cuenta': 'Crear persona jurídica',
        'Create Contact': 'Crear persona natural',
        'Create Account': 'Crear persona jurídica',
        'Create Case': 'Crear caso',
        'Crear ticket': 'Crear caso'
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
            '#navbar a, #navbar .item-label, .page-header h3, .header-title, .breadcrumb a, .panel-heading .panel-title, .page-header .header-buttons a, .page-header .header-buttons button, button.btn, a.btn'
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

        if (!window.__espoPersonasNavbarObserver) {
            window.__espoPersonasNavbarObserver = new MutationObserver(function () {
                patchDomLabels();
            });
            var navbar = document.querySelector('#navbar');

            if (navbar) {
                window.__espoPersonasNavbarObserver.observe(navbar, {
                    childList: true,
                    subtree: true,
                });
            }
        }

        if (!window.__espoPersonasContentObserver) {
            window.__espoPersonasContentObserver = new MutationObserver(function () {
                patchDomLabels();
            });
            var content = document.querySelector('#content');

            if (content) {
                window.__espoPersonasContentObserver.observe(content, {
                    childList: true,
                    subtree: true,
                });
            }
        }
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
