define('custom:views/home', ['views/dashboard'], function (Dep) {

    var PAGE_SIZE = 5;

    // Permite presentar la nueva portada una vez a las sesiones existentes sin
    // impedir que cada persona conserve después la última pestaña que eligió.
    var HOME_DEFAULT_TAB_VERSION = 'inicio-plataforma-v1';

    var UNWANTED_DASHLETS = ['Memo', 'Records'];

    var SEGUIMIENTO_STATUSES = [
        'Asignado',
        'En gestión técnica',
        'Revisión de hallazgos',
    ];

    var normalize = function (value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    var detectProfileFromRoles = function (user) {
        if (user.isAdmin()) {
            return 'gestion';
        }

        var names = [];

        Object.values(user.get('rolesNames') || {}).forEach(function (name) {
            names.push(normalize(name));
        });

        if (names.indexOf('inspeccion') !== -1) {
            return 'gestion';
        }

        if (names.indexOf('radicacion') !== -1) {
            return 'radicacion';
        }

        if (names.indexOf('asignador') !== -1 || names.indexOf('asignacion') !== -1) {
            return 'asignador';
        }

        if (names.indexOf('patrullero') !== -1 || names.indexOf('patrullaje') !== -1) {
            return 'patrullero';
        }

        if (names.indexOf('juridica') !== -1) {
            return 'juridica';
        }

        return 'gestion';
    };

    var detectProfileFromApi = function (data) {
        if (!data) {
            return null;
        }

        if (data.homeProfile) {
            return data.homeProfile;
        }

        if (data.isInspeccion) {
            return 'gestion';
        }

        if (data.isRadicacion) {
            return 'radicacion';
        }

        if (data.isAsignador) {
            return 'asignador';
        }

        if (data.isPatrullero) {
            return 'patrullero';
        }

        return 'gestion';
    };

    var canShowHistorialVisitas = function (user, profile, isAdmin, apiData) {
        if (isAdmin) {
            return true;
        }

        if (profile === 'patrullero') {
            return true;
        }

        if (apiData && apiData.isInspeccion) {
            return true;
        }

        var names = [];

        Object.values(user.get('rolesNames') || {}).forEach(function (name) {
            names.push(normalize(name));
        });

        return names.indexOf('inspeccion') !== -1;
    };

    var profileConfig = function (profile, userId, appTimestamp, isAdmin, user, apiData) {
        var cacheBuster = String(appTimestamp || Date.now()) + '-dash6';
        var iframeUrl = '/client/custom/dashboard.html?v=' + encodeURIComponent(cacheBuster)
            + '&profile=' + encodeURIComponent(profile);

        if (profile === 'patrullero' && !isAdmin) {
            iframeUrl += '&assignedUserId=' + encodeURIComponent(userId);
        }

        var lists = [
            {title: 'Todos los casos', where: []},
            {
                title: 'En seguimiento',
                where: [{
                    type: 'in',
                    attribute: 'status',
                    value: SEGUIMIENTO_STATUSES,
                }],
            },
        ];

        // Bandeja de decisión: hallazgos revisados y listos para definir
        // visita complementaria, cierre, remisión o apertura de actuación.
        if (profile === 'asignador' || profile === 'juridica' || profile === 'gestion' || isAdmin) {
            lists.unshift({
                title: 'Listos para decisión',
                where: [{
                    type: 'equals',
                    attribute: 'status',
                    value: 'Revisión de hallazgos',
                }],
            });
        }

        return {
            profile: profile,
            showTablero: true,
            showHistorialAsignaciones: isAdmin || profile === 'asignador',
            showHistorialVisitas: canShowHistorialVisitas(user, profile, isAdmin, apiData),
            iframeUrl: iframeUrl,
            lists: lists,
        };
    };

    var homeConfig = function (profile, userId, appTimestamp, isAdmin, user, apiData) {
        return profileConfig(profile || 'gestion', userId, appTimestamp, !!isAdmin, user, apiData || null);
    };

    return Dep.extend({

        setup: function () {
            var self = this;
            var user = this.getUser();
            var userId = user.id;
            var appTimestamp = this.getConfig().get('appTimestamp');
            var isAdmin = user.isAdmin();
            var profile = detectProfileFromRoles(user);

            this.config = homeConfig(profile, userId, appTimestamp, isAdmin, user, null);
            this._pageState = {};
            this._historialAsignacionesSearch = this._historialAsignacionesSearch || '';
            this._historialVisitasSearch = this._historialVisitasSearch || '';

            Espo.Ajax.getRequest('Case/action/alcaldiaProfile').then(function (data) {
                var apiProfile = detectProfileFromApi(data);
                var apiIsAdmin = !!(data && data.isAdmin);

                if ((!apiProfile || apiProfile === self.config.profile) && apiIsAdmin === isAdmin) {
                    return;
                }

                self._gestionLoaded = false;
                self._historialLoaded = false;
                self._historialVisitasLoaded = false;
                self.config = homeConfig(apiProfile || profile, userId, appTimestamp, apiIsAdmin || isAdmin, user, data);

                if (self.isRendered()) {
                    self.renderCustomPanels();
                }
            }).catch(function () {});

            this.sanitizeDashboardPreferences();
            Dep.prototype.setup.call(this);

            $(window).on('crm:visita-historial-changed.home', function () {
                self._historialVisitasLoaded = false;

                if (self._activeHomeTab === 'historial-visitas' && self.isRendered && self.isRendered()) {
                    self.loadHistorialVisitas(true);
                }
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.renderCustomPanels();
            this.bindDashboardIframeResize();
            this.removeUnwantedDashlets();
        },

        bindDashboardIframeResize: function () {
            var self = this;

            if (this._dashboardHeightHandler) {
                window.removeEventListener('message', this._dashboardHeightHandler);
            }

            this._dashboardHeightHandler = function (event) {
                if (!event.data || !event.data.type) {
                    return;
                }

                if (event.origin !== window.location.origin) {
                    return;
                }

                if (event.data.type === 'crm-dashboard-ready') {
                    self.markDashboardIframeReady();
                    return;
                }

                if (event.data.type !== 'crm-dashboard-height') {
                    return;
                }

                var height = parseInt(event.data.height, 10);

                if (!height || height < 200) {
                    return;
                }

                self.$el.find('.custom-home-iframe').css('height', height + 'px');
            };

            window.addEventListener('message', this._dashboardHeightHandler);
        },

        remove: function () {
            $(window).off('crm:visita-historial-changed.home');

            if (this._dashboardHeightHandler) {
                window.removeEventListener('message', this._dashboardHeightHandler);
                this._dashboardHeightHandler = null;
            }

            Dep.prototype.remove.call(this);
        },

        sanitizeDashboardPreferences: function () {
            var prefs = this.getPreferences();
            var layout = _.clone(prefs.get('dashboardLayout') || []);
            var options = _.clone(prefs.get('dashletsOptions') || {});
            var changed = false;
            var keepIds = {};

            if (!layout.length) {
                layout = [{name: 'My Espo', layout: []}];
                changed = true;
            }

            layout.forEach(function (tab) {
                if (!Array.isArray(tab.layout)) {
                    tab.layout = [];
                    changed = true;

                    return;
                }

                var filtered = [];

                tab.layout.forEach(function (item) {
                    if (UNWANTED_DASHLETS.indexOf(item.name) !== -1) {
                        changed = true;

                        return;
                    }

                    filtered.push(item);

                    if (item.id) {
                        keepIds[item.id] = true;
                    }
                });

                if (filtered.length !== tab.layout.length) {
                    tab.layout = filtered;
                    changed = true;
                }
            });

            Object.keys(options).forEach(function (id) {
                if (!keepIds[id]) {
                    delete options[id];
                    changed = true;
                }
            });

            if (!changed) {
                return;
            }

            prefs.set({
                dashboardLayout: layout,
                dashletsOptions: options,
            }, {silent: true});

            this._dashboardSanitized = true;
        },

        removeUnwantedDashlets: function () {
            var self = this;
            var removed = false;

            this.$el.find('.grid-stack-item').each(function () {
                var $item = $(this);
                var title = $item.find('.panel-title, .dashlet-title, h4').first().text().trim();

                if (title === 'Memo' || title === 'Record List' || title.indexOf('Record List') === 0) {
                    $item.remove();
                    removed = true;
                }
            });

            UNWANTED_DASHLETS.forEach(function (name) {
                self.$el.find('.dashlet-container[data-name="' + name + '"]')
                    .closest('.grid-stack-item')
                    .remove();
            });

            if (!removed && !this._dashboardSanitized) {
                return;
            }

            this._dashboardSanitized = false;

            this.getPreferences().save({patch: true}).catch(function () {});
        },

        renderCustomPanels: function () {
            this.$el.find('.custom-home').remove();
            this._gestionLoaded = false;
            this._agendaLoaded = false;
            this._historialLoaded = false;
            this._historialVisitasLoaded = false;

            var cfg = this.config;
            if (sessionStorage.getItem('crm-home-default-tab-version') !== HOME_DEFAULT_TAB_VERSION) {
                sessionStorage.setItem('crm-home-default-tab-version', HOME_DEFAULT_TAB_VERSION);
                sessionStorage.setItem('crm-home-tab', 'inicio');
            }

            var activeTab = sessionStorage.getItem('crm-home-tab') || 'inicio';

            if (activeTab === 'historial-asignaciones' && !cfg.showHistorialAsignaciones) {
                activeTab = 'dashboard';
            }

            if (activeTab === 'historial-visitas' && !cfg.showHistorialVisitas) {
                activeTab = 'dashboard';
            }

            var html = '<div class="custom-home">';

            html += '<nav class="custom-home-tabs" role="tablist" aria-label="Secciones de inicio">';
            html += this.buildHomeTabButton('inicio', 'Inicio', activeTab);
            html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
            html += this.buildHomeTabButton('dashboard', 'Dashboard', activeTab);
            html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
            html += this.buildHomeTabButton('gestion', 'Gestión de casos', activeTab);
            html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
            html += this.buildHomeTabButton('agenda', 'Agenda', activeTab);

            if (cfg.showHistorialAsignaciones) {
                html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
                html += this.buildHomeTabButton('historial-asignaciones', 'Historial de asignaciones', activeTab);
            }

            if (cfg.showHistorialVisitas) {
                html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
                html += this.buildHomeTabButton('historial-visitas', 'Historial de visitas', activeTab);
            }

            html += '</nav><div class="custom-home-panels">';

            html += '<div class="custom-home-panel custom-home-welcome-panel' +
                (activeTab === 'inicio' ? ' is-active' : '') +
                '" data-panel="inicio" role="tabpanel">' + this.buildWelcomePanel() + '</div>';

            html += '<div class="custom-home-panel' + (activeTab === 'dashboard' ? ' is-active' : '') + '" data-panel="dashboard" role="tabpanel">';

            if (cfg.showTablero) {
                html += '<div class="panel panel-default custom-home-tablero">' +
                    '<div class="panel-heading"><h4 class="panel-title">Tablero de control</h4></div>' +
                    '<div class="panel-body custom-home-tablero-body">' +
                    '<div class="custom-home-iframe-wrap">' +
                    '<div class="custom-home-iframe-loading" aria-live="polite" aria-busy="true">' +
                    '<span class="custom-home-iframe-spinner" aria-hidden="true"></span>' +
                    '<span>Cargando tablero…</span>' +
                    '</div>' +
                    '<iframe src="' + _.escape(cfg.iframeUrl) + '" title="Tablero de control" class="custom-home-iframe" scrolling="no"></iframe>' +
                    '</div></div></div>';
            }

            html += '</div>';

            html += '<div class="custom-home-panel' + (activeTab === 'gestion' ? ' is-active' : '') + '" data-panel="gestion" role="tabpanel">';

            cfg.lists.forEach(function (listCfg, index) {
                html += '<div class="panel panel-default custom-home-lista">' +
                    '<div class="panel-heading"><h4 class="panel-title">' + _.escape(listCfg.title) + '</h4></div>' +
                    '<div class="panel-body">' +
                    '<div class="custom-home-lista-cuerpo" data-list-index="' + index + '">' +
                    '<p class="text-muted">Cargando casos…</p>' +
                    '</div></div></div>';
            });

            html += '</div>';

            html += '<div class="custom-home-panel custom-home-agenda-panel' + (activeTab === 'agenda' ? ' is-active' : '') + '" data-panel="agenda" role="tabpanel">' +
                '<div class="panel panel-default custom-home-lista"><div class="panel-heading"><h4 class="panel-title">Reuniones</h4></div>' +
                '<div class="panel-body"><div class="custom-home-lista-cuerpo" data-agenda-list="meetings"><p class="text-muted">Cargando reuniones…</p></div></div></div>' +
                '<div class="panel panel-default custom-home-lista"><div class="panel-heading"><h4 class="panel-title">Tareas</h4></div>' +
                '<div class="panel-body"><div class="custom-home-lista-cuerpo" data-agenda-list="tasks"><p class="text-muted">Cargando tareas…</p></div></div></div>' +
                '<div class="panel panel-default custom-home-lista"><div class="panel-heading"><h4 class="panel-title">Comunicaciones</h4></div>' +
                '<div class="panel-body"><div class="custom-home-lista-cuerpo" data-agenda-list="comunicaciones"><p class="text-muted">Cargando comunicaciones…</p></div></div></div>' +
                '</div>';

            if (cfg.showHistorialAsignaciones) {
                html += '<div class="custom-home-panel custom-home-historial-panel' +
                    (activeTab === 'historial-asignaciones' ? ' is-active' : '') +
                    '" data-panel="historial-asignaciones" role="tabpanel">' +
                    '<div class="panel panel-default custom-home-lista"><div class="panel-heading"><h4 class="panel-title">Historial de asignaciones</h4></div>' +
                    '<div class="panel-body">' + this.buildHistorialSearchToolbar('asignaciones') +
                    '<div class="custom-home-lista-cuerpo" data-historial-asignaciones="list">' +
                    '<p class="text-muted">Cargando historial…</p></div></div></div></div>';
            }

            if (cfg.showHistorialVisitas) {
                html += '<div class="custom-home-panel custom-home-historial-panel' +
                    (activeTab === 'historial-visitas' ? ' is-active' : '') +
                    '" data-panel="historial-visitas" role="tabpanel">' +
                    '<div class="panel panel-default custom-home-lista"><div class="panel-heading"><h4 class="panel-title">Historial de visitas</h4></div>' +
                    '<div class="panel-body">' + this.buildHistorialSearchToolbar('visitas') +
                    '<div class="custom-home-lista-cuerpo" data-historial-visitas="list">' +
                    '<p class="text-muted">Cargando historial…</p></div></div></div></div>';
            }

            html += '</div></div>';

            var $dashlets = this.$el.find('.dashlets').first();

            if ($dashlets.length) {
                $dashlets.before(html);
            } else {
                this.$el.prepend(html);
            }

            this.bindHomeTabs();
            this.bindHomePagination();
            this.bindHistorialSearch();
            this.bindDashboardIframeLoad();
            this.restoreHistorialSearchInputs();
            this._activeHomeTab = activeTab;

            if (activeTab === 'gestion') {
                this.loadGestionLists(true);
            } else if (activeTab === 'agenda') {
                this.loadAgendaLists(true);
            } else if (activeTab === 'historial-asignaciones') {
                this.loadHistorialAsignaciones(true);
            } else if (activeTab === 'historial-visitas') {
                this.loadHistorialVisitas(true);
            } else if (activeTab === 'dashboard') {
                this.refreshDashboardIframeHeight();
            }
        },

        buildWelcomePanel: function () {
            var user = this.getUser();
            var userName = user.get('firstName') || user.get('name') || user.get('userName') || 'equipo';
            var greeting = 'Bienvenido, ' + _.escape(userName);

            return '<section class="custom-home-welcome" aria-labelledby="crm-welcome-title">' +
                '<div class="custom-home-welcome__hero">' +
                    '<div class="custom-home-welcome__eyebrow"><span class="fas fa-leaf" aria-hidden="true"></span> CRM Alcaldía</div>' +
                    '<h1 id="crm-welcome-title">' + greeting + '.</h1>' +
                    '<p class="custom-home-welcome__subtitle">Inspección y vigilancia ambiental, con trazabilidad de principio a fin.</p>' +
                    '<p>Esta plataforma organiza la atención de solicitudes, quejas y procesos ambientales: desde su registro y radicación hasta la visita, el seguimiento y el cierre.</p>' +
                    '<div class="custom-home-welcome__actions">' +
                        '<button type="button" class="custom-home-welcome__action" data-tab="dashboard"><span class="fas fa-chart-line" aria-hidden="true"></span> Ver dashboard</button>' +
                        '<button type="button" class="custom-home-welcome__action custom-home-welcome__action--secondary" data-tab="gestion"><span class="fas fa-folder-open" aria-hidden="true"></span> Consultar casos</button>' +
                    '</div>' +
                '</div>' +
                '<div class="custom-home-welcome__purpose">' +
                    '<span class="fas fa-bullseye" aria-hidden="true"></span>' +
                    '<div><strong>Propósito de la plataforma</strong><p>Facilitar una respuesta coordinada, oportuna y verificable para proteger el territorio, sus recursos naturales y la comunidad.</p></div>' +
                '</div>' +
                '<section class="custom-home-welcome__section" aria-labelledby="crm-flow-title">' +
                    '<div class="custom-home-welcome__section-heading"><span>Flujo de atención</span><h2 id="crm-flow-title">Cada caso mantiene su historia operativa</h2></div>' +
                    '<div class="custom-home-welcome__flow">' +
                        '<article><span>01</span><h3>Registro</h3><p>Se recibe y clasifica la solicitud o hallazgo ambiental.</p></article>' +
                        '<article><span>02</span><h3>Radicación</h3><p>Se formaliza el expediente y se asegura su identificación.</p></article>' +
                        '<article><span>03</span><h3>Asignación</h3><p>Se asigna el responsable según zona, competencia y prioridad.</p></article>' +
                        '<article><span>04</span><h3>Visita</h3><p>Se registran actuaciones, evidencias, actas y compromisos.</p></article>' +
                        '<article><span>05</span><h3>Seguimiento</h3><p>Se controla el avance hasta su aprobación o cierre.</p></article>' +
                    '</div>' +
                '</section>' +
                '<section class="custom-home-welcome__section" aria-labelledby="crm-roles-title">' +
                    '<div class="custom-home-welcome__section-heading"><span>Roles y responsabilidades</span><h2 id="crm-roles-title">Un equipo, responsabilidades claras</h2></div>' +
                    '<div class="custom-home-welcome__roles">' +
                        '<article><span class="fas fa-clipboard-check" aria-hidden="true"></span><h3>Inspección</h3><p>Analiza los casos, orienta el proceso, hace seguimiento y valida las actuaciones requeridas.</p></article>' +
                        '<article><span class="fas fa-file-signature" aria-hidden="true"></span><h3>Radicación</h3><p>Formaliza la entrada, conserva la trazabilidad documental y gestiona el expediente.</p></article>' +
                        '<article><span class="fas fa-user-check" aria-hidden="true"></span><h3>Asignación</h3><p>Distribuye los casos, equilibra las cargas y coordina la atención en territorio.</p></article>' +
                        '<article><span class="fas fa-map-marked-alt" aria-hidden="true"></span><h3>Patrullaje</h3><p>Realiza visitas, registra evidencias y reporta los resultados de la actuación.</p></article>' +
                    '</div>' +
                '</section>' +
                '<section class="custom-home-welcome__vigilance" aria-labelledby="crm-vigilance-title">' +
                    '<div><span class="fas fa-shield-alt" aria-hidden="true"></span><h2 id="crm-vigilance-title">¿Qué fortalece la inspección y vigilancia?</h2></div>' +
                    '<ul><li>Seguimiento visible de responsables, fechas y estados.</li><li>Información de campo y documentos reunidos en un mismo caso.</li><li>Decisiones basadas en evidencia para responder a tiempo.</li></ul>' +
                '</section>' +
                '<section class="custom-home-welcome__learning" aria-labelledby="crm-learning-title">' +
                    '<div class="custom-home-welcome__section-heading"><span>Centro de aprendizaje</span><h2 id="crm-learning-title">Recursos que iremos incorporando</h2><p>Este espacio crecerá con materiales para el equipo y los usuarios de la plataforma.</p></div>' +
                    '<div class="custom-home-welcome__resources">' +
                        '<article><span class="fas fa-book-open" aria-hidden="true"></span><h3>Guías de uso</h3><p>Recorridos paso a paso por cada proceso.</p><em>Próximamente</em></article>' +
                        '<article><span class="fas fa-play-circle" aria-hidden="true"></span><h3>Videos</h3><p>Capacitaciones breves para operar la plataforma.</p><em>Próximamente</em></article>' +
                        '<article><span class="fas fa-file-alt" aria-hidden="true"></span><h3>Manuales y formatos</h3><p>Documentos de apoyo y criterios operativos.</p><em>Próximamente</em></article>' +
                    '</div>' +
                '</section>' +
            '</section>';
        },

        buildHomeTabButton: function (tabId, label, activeTab) {
            var isActive = tabId === activeTab;

            return '<button type="button" class="custom-home-tab' + (isActive ? ' is-active' : '') + '" data-tab="' + tabId + '" role="tab"' +
                (isActive ? ' aria-selected="true"' : ' aria-selected="false"') + '>' +
                _.escape(label) +
                '</button>';
        },

        paginationKeyAttr: function (pageKey) {
            if (typeof pageKey === 'number') {
                return 'data-list-index="' + pageKey + '"';
            }

            return 'data-agenda-key="' + pageKey + '"';
        },

        bindHomePagination: function () {
            var self = this;

            if (this._homePaginationBound) {
                return;
            }

            this._homePaginationBound = true;

            this.$el.on('click', '.custom-home-pagination [data-page-action]', function (e) {
                e.preventDefault();

                var $btn = $(e.currentTarget);

                if ($btn.prop('disabled')) {
                    return;
                }

                var action = $btn.data('page-action');
                var agendaKey = $btn.data('agenda-key');
                var listIndex = $btn.data('list-index');
                var pageKey = agendaKey != null ? agendaKey : listIndex;
                var currentPage = self._pageState[pageKey] || 1;
                var totalPages = parseInt($btn.closest('.custom-home-pagination').data('total-pages'), 10) || 1;
                var targetPage = currentPage;

                if (action === 'prev' && currentPage > 1) {
                    targetPage = currentPage - 1;
                }

                if (action === 'next' && currentPage < totalPages) {
                    targetPage = currentPage + 1;
                }

                if (action === 'goto') {
                    targetPage = parseInt($btn.data('page'), 10) || currentPage;
                }

                if (targetPage === currentPage) {
                    return;
                }

                if (agendaKey != null) {
                    self.loadAgendaList(agendaKey, targetPage);

                    return;
                }

                var listCfg = self.config.lists[listIndex];

                if (listCfg) {
                    self.loadList(listIndex, listCfg, targetPage);
                }
            });
        },

        loadAgendaList: function (agendaKey, page) {
            if (agendaKey === 'meetings') {
                this.loadMeetingList(page);

                return;
            }

            if (agendaKey === 'tasks') {
                this.loadTaskList(page);

                return;
            }

            if (agendaKey === 'comunicaciones') {
                this.loadComunicacionList(page);
            }
        },

        buildPaginationHtml: function (pageKey, currentPage, total, itemLabel) {
            itemLabel = itemLabel || 'casos';
            var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

            if (totalPages <= 1) {
                return '';
            }

            var from = (currentPage - 1) * PAGE_SIZE + 1;
            var to = Math.min(currentPage * PAGE_SIZE, total);
            var keyAttr = this.paginationKeyAttr(pageKey);
            var pagesHtml = '';

            for (var page = 1; page <= totalPages; page++) {
                var isActive = page === currentPage;

                pagesHtml += '<button type="button" class="custom-home-pagination__page' +
                    (isActive ? ' is-active' : '') + '" data-page-action="goto" data-page="' + page +
                    '" ' + keyAttr +
                    (isActive ? ' aria-current="page"' : '') + '>' + page + '</button>';
            }

            return '<nav class="custom-home-pagination" ' + keyAttr + ' data-total-pages="' + totalPages + '" aria-label="Paginación">' +
                '<button type="button" class="custom-home-pagination__arrow" data-page-action="prev" ' + keyAttr +
                    ' aria-label="Página anterior"' + (currentPage <= 1 ? ' disabled' : '') + '>' +
                    '<span class="fas fa-chevron-left" aria-hidden="true"></span>' +
                '</button>' +
                '<div class="custom-home-pagination__body">' +
                    '<div class="custom-home-pagination__pages">' + pagesHtml + '</div>' +
                    '<span class="custom-home-pagination__meta">' + from + '–' + to + ' de ' + total + ' ' + itemLabel + '</span>' +
                '</div>' +
                '<button type="button" class="custom-home-pagination__arrow" data-page-action="next" ' + keyAttr +
                    ' aria-label="Página siguiente"' + (currentPage >= totalPages ? ' disabled' : '') + '>' +
                    '<span class="fas fa-chevron-right" aria-hidden="true"></span>' +
                '</button>' +
                '</nav>';
        },

        bindHomeTabs: function () {
            var self = this;

            this.$el.find('.custom-home-tabs [data-tab], .custom-home-welcome__actions [data-tab]').on('click', function () {
                self.switchHomeTab($(this).data('tab'));
            });
        },

        switchHomeTab: function (tab) {
            if (!tab || tab === this._activeHomeTab) {
                return;
            }

            this._activeHomeTab = tab;
            sessionStorage.setItem('crm-home-tab', tab);

            this.$el.find('.custom-home-tabs [data-tab]')
                .removeClass('is-active')
                .attr('aria-selected', 'false');

            this.$el.find('.custom-home-tabs [data-tab="' + tab + '"]')
                .addClass('is-active')
                .attr('aria-selected', 'true');

            this.$el.find('.custom-home-panel').removeClass('is-active');
            this.$el.find('.custom-home-panel[data-panel="' + tab + '"]').addClass('is-active');

            if (tab === 'gestion') {
                this.loadGestionLists();
            }

            if (tab === 'agenda') {
                this.loadAgendaLists();
            }

            if (tab === 'historial-asignaciones') {
                this.loadHistorialAsignaciones(true);
            }

            if (tab === 'historial-visitas') {
                this._historialVisitasLoaded = false;
                this.loadHistorialVisitas(true);
            }

            if (tab === 'dashboard') {
                this.refreshDashboardIframeHeight();
            }
        },

        markDashboardIframeReady: function () {
            var $wrap = this.$el.find('.custom-home-iframe-wrap');

            $wrap.find('.custom-home-iframe-loading')
                .addClass('is-hidden')
                .attr('aria-busy', 'false');

            $wrap.find('.custom-home-iframe').addClass('is-ready');
        },

        bindDashboardIframeLoad: function () {
            var self = this;

            this.$el.find('.custom-home-iframe').each(function () {
                var iframe = this;

                if (iframe.dataset.dashboardBound === '1') {
                    return;
                }

                iframe.dataset.dashboardBound = '1';

                $(iframe).on('load', function () {
                    if (iframe.classList.contains('is-ready')) {
                        return;
                    }

                    setTimeout(function () {
                        if (!iframe.classList.contains('is-ready')) {
                            self.markDashboardIframeReady();
                        }
                    }, 12000);
                });
            });
        },

        refreshDashboardIframeHeight: function () {
            var iframe = this.$el.find('.custom-home-iframe')[0];

            if (!iframe || !iframe.contentWindow) {
                return;
            }

            try {
                iframe.contentWindow.postMessage({
                    type: 'crm-dashboard-resize-request',
                }, window.location.origin);
            } catch (e) {}

            setTimeout(function () {
                try {
                    var doc = iframe.contentDocument || iframe.contentWindow.document;
                    var height = doc && doc.documentElement ? doc.documentElement.scrollHeight : 0;

                    if (height > 200) {
                        iframe.style.height = height + 'px';
                    }
                } catch (err) {}
            }, 120);
        },

        loadGestionLists: function (force) {
            if (this._gestionLoaded && !force) {
                return;
            }

            this._gestionLoaded = true;

            this.config.lists.forEach(function (listCfg, index) {
                this.loadList(index, listCfg);
            }, this);
        },

        loadAgendaLists: function (force) {
            if (this._agendaLoaded && !force) {
                return;
            }

            this._agendaLoaded = true;
            this.loadMeetingList();
            this.loadTaskList();
            this.loadComunicacionList();
        },

        loadMeetingList: function (page) {
            page = page || this._pageState.meetings || 1;
            this._pageState.meetings = page;

            var $container = this.$el.find('[data-agenda-list="meetings"]');
            var userId = this.getUser().id;

            $container.html('<p class="text-muted">Cargando reuniones…</p>');

            this.getCollectionFactory().create('Meeting', function (collection) {
                collection.maxSize = PAGE_SIZE;
                collection.offset = (page - 1) * PAGE_SIZE;
                collection.orderBy = 'dateStart';
                collection.order = 'desc';
                collection.where = [{
                    type: 'equals',
                    attribute: 'createdById',
                    value: userId,
                }];

                collection.fetch({main: true})
                    .then(function () {
                        this.renderMeetingList($container, collection, page);
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar las reuniones.</p>');
                    });
            }.bind(this));
        },

        loadTaskList: function (page) {
            page = page || this._pageState.tasks || 1;
            this._pageState.tasks = page;

            var $container = this.$el.find('[data-agenda-list="tasks"]');
            var userId = this.getUser().id;

            $container.html('<p class="text-muted">Cargando tareas…</p>');

            this.getCollectionFactory().create('Task', function (collection) {
                collection.maxSize = PAGE_SIZE;
                collection.offset = (page - 1) * PAGE_SIZE;
                collection.orderBy = 'dateEnd';
                collection.order = 'desc';
                collection.where = [{
                    type: 'equals',
                    attribute: 'createdById',
                    value: userId,
                }];

                collection.fetch({main: true})
                    .then(function () {
                        this.renderTaskList($container, collection, page);
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar las tareas.</p>');
                    });
            }.bind(this));
        },

        loadComunicacionList: function (page) {
            page = page || this._pageState.comunicaciones || 1;
            this._pageState.comunicaciones = page;

            var $container = this.$el.find('[data-agenda-list="comunicaciones"]');
            var userId = this.getUser().id;

            $container.html('<p class="text-muted">Cargando comunicaciones…</p>');

            this.getCollectionFactory().create('ComunicacionCaso', function (collection) {
                collection.maxSize = PAGE_SIZE;
                collection.offset = (page - 1) * PAGE_SIZE;
                collection.orderBy = 'fecha';
                collection.order = 'desc';
                collection.where = [{
                    type: 'equals',
                    attribute: 'createdById',
                    value: userId,
                }];

                collection.fetch({main: true})
                    .then(function () {
                        this.renderComunicacionList($container, collection, page);
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar las comunicaciones.</p>');
                    });
            }.bind(this));
        },

        renderMeetingList: function ($container, collection, currentPage) {
            var total = collection.total != null ? collection.total : collection.length;

            if (!total) {
                $container.html('<p class="text-muted">Sin reuniones programadas.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                return '<tr>' +
                    '<td><a href="#Meeting/view/' + model.id + '">' + _.escape(model.get('name') || '—') + '</a></td>' +
                    '<td>' + _.escape(model.get('dateStart') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('dateEnd') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('status') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('assignedUserName') || '—') + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Reunión</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Asignado</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>' +
                this.buildPaginationHtml('meetings', currentPage, total, 'reuniones')
            );
        },

        renderTaskList: function ($container, collection, currentPage) {
            var total = collection.total != null ? collection.total : collection.length;

            if (!total) {
                $container.html('<p class="text-muted">Sin tareas pendientes.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                return '<tr>' +
                    '<td><a href="#Task/view/' + model.id + '">' + _.escape(model.get('name') || '—') + '</a></td>' +
                    '<td>' + _.escape(model.get('status') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('priority') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('dateEnd') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('assignedUserName') || '—') + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Tarea</th><th>Estado</th><th>Prioridad</th><th>Vencimiento</th><th>Asignado</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>' +
                this.buildPaginationHtml('tasks', currentPage, total, 'tareas')
            );
        },

        renderComunicacionList: function ($container, collection, currentPage) {
            var total = collection.total != null ? collection.total : collection.length;

            if (!total) {
                $container.html('<p class="text-muted">Sin comunicaciones registradas.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                var caseId = model.get('caseId');
                var radicado = model.get('numeroRadicado') || model.get('caseName') || '—';
                var casoCell = caseId
                    ? '<a href="#Case/view/' + caseId + '">' + _.escape(radicado) + '</a>'
                    : _.escape(radicado);
                var asunto = model.get('asunto') || '—';
                var asuntoCell = '<a href="#ComunicacionCaso/view/' + model.id + '">' + _.escape(asunto) + '</a>';

                return '<tr>' +
                    '<td>' + casoCell + '</td>' +
                    '<td>' + _.escape(model.get('fecha') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('tipo') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('destinatario') || '—') + '</td>' +
                    '<td>' + asuntoCell + '</td>' +
                    '<td>' + _.escape(model.get('createdByName') || '—') + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Caso</th><th>Fecha</th><th>Tipo</th><th>Destinatario</th><th>Asunto</th><th>Registrado por</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>' +
                this.buildPaginationHtml('comunicaciones', currentPage, total, 'comunicaciones')
            );
        },

        buildHistorialSearchToolbar: function (scopeKey) {
            var inputId = 'historial-search-' + scopeKey;

            return '<div class="custom-home-historial-search" data-historial-search="' + scopeKey + '">' +
                '<label class="sr-only" for="' + inputId + '">Buscar por radicado del caso</label>' +
                '<span class="fas fa-search custom-home-historial-search__icon" aria-hidden="true"></span>' +
                '<input type="search" id="' + inputId + '" class="form-control input-sm custom-home-historial-search__input" ' +
                'placeholder="Buscar por radicado del caso…" autocomplete="off" ' +
                'data-historial-search-input="' + scopeKey + '">' +
                '</div>';
        },

        normalizeHistorialSearch: function (value) {
            return String(value || '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
        },

        getHistorialRadicadoLabel: function (model) {
            return String(model.get('numeroRadicado') || model.get('caseName') || '');
        },

        matchesHistorialRadicado: function (model, query) {
            if (!query) {
                return true;
            }

            return this.normalizeHistorialSearch(this.getHistorialRadicadoLabel(model)).indexOf(query) !== -1;
        },

        filterHistorialModels: function (models, searchValue) {
            var query = this.normalizeHistorialSearch(searchValue);

            if (!query) {
                return models;
            }

            var self = this;

            return models.filter(function (model) {
                return self.matchesHistorialRadicado(model, query);
            });
        },

        restoreHistorialSearchInputs: function () {
            if (this._historialAsignacionesSearch) {
                this.$el.find('[data-historial-search-input="asignaciones"]')
                    .val(this._historialAsignacionesSearch);
            }

            if (this._historialVisitasSearch) {
                this.$el.find('[data-historial-search-input="visitas"]')
                    .val(this._historialVisitasSearch);
            }
        },

        bindHistorialSearch: function () {
            var self = this;

            if (this._historialSearchBound) {
                return;
            }

            this._historialSearchBound = true;

            var applySearch = function (scopeKey) {
                if (scopeKey === 'asignaciones') {
                    var $asignaciones = self.$el.find('[data-historial-asignaciones="list"]');

                    if (!self._historialAsignacionesModels) {
                        return;
                    }

                    self.renderHistorialAsignaciones(
                        $asignaciones,
                        self.filterHistorialModels(self._historialAsignacionesModels, self._historialAsignacionesSearch)
                    );

                    return;
                }

                if (scopeKey === 'visitas') {
                    var $visitas = self.$el.find('[data-historial-visitas="list"]');

                    if (!self._historialVisitasModels) {
                        return;
                    }

                    self.renderHistorialVisitas(
                        $visitas,
                        self.filterHistorialModels(self._historialVisitasModels, self._historialVisitasSearch)
                    );
                }
            };

            this.$el.on('input', '[data-historial-search-input]', _.debounce(function (e) {
                var scopeKey = $(e.currentTarget).data('historial-search-input');
                var value = $(e.currentTarget).val() || '';

                if (scopeKey === 'asignaciones') {
                    self._historialAsignacionesSearch = value;
                } else if (scopeKey === 'visitas') {
                    self._historialVisitasSearch = value;
                }

                applySearch(scopeKey);
            }, 200));

            this.$el.on('keydown', '[data-historial-search-input]', function (e) {
                if (e.key !== 'Escape') {
                    return;
                }

                var $input = $(e.currentTarget);
                var scopeKey = $input.data('historial-search-input');

                $input.val('');

                if (scopeKey === 'asignaciones') {
                    self._historialAsignacionesSearch = '';
                } else if (scopeKey === 'visitas') {
                    self._historialVisitasSearch = '';
                }

                applySearch(scopeKey);
            });
        },

        loadHistorialAsignaciones: function (force) {
            if (this._historialLoaded && !force) {
                return;
            }

            this._historialLoaded = true;

            var $container = this.$el.find('[data-historial-asignaciones="list"]');

            this.getCollectionFactory().create('AsignacionHistorial', function (collection) {
                collection.maxSize = 50;
                collection.orderBy = 'fecha';
                collection.order = 'desc';

                collection.fetch({main: true})
                    .then(function () {
                        this._historialAsignacionesModels = collection.models.slice();
                        this.renderHistorialAsignaciones(
                            $container,
                            this.filterHistorialModels(
                                this._historialAsignacionesModels,
                                this._historialAsignacionesSearch
                            )
                        );
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar el historial de asignaciones.</p>');
                    });
            }.bind(this));
        },

        renderHistorialAsignaciones: function ($container, models) {
            var hasAny = this._historialAsignacionesModels && this._historialAsignacionesModels.length;

            if (!models || !models.length) {
                var message = hasAny && this.normalizeHistorialSearch(this._historialAsignacionesSearch)
                    ? 'No hay asignaciones que coincidan con ese radicado.'
                    : 'Aún no hay reasignaciones registradas.';

                $container.html('<p class="text-muted">' + message + '</p>');

                return;
            }

            var rows = models.map(function (model) {
                var caseId = model.get('caseId');
                var radicado = model.get('numeroRadicado') || model.get('caseName') || '—';
                var anterior = model.get('responsableAnteriorName') || 'Sin asignar';
                var nuevo = model.get('responsableNuevoName') || 'Sin asignar';
                var caseLink = caseId
                    ? '<a href="#Case/view/' + caseId + '">' + _.escape(radicado) + '</a>'
                    : _.escape(radicado);

                return '<tr>' +
                    '<td>' + _.escape(model.get('fecha') || '—') + '</td>' +
                    '<td>' + caseLink + '<div class="text-muted small">' + _.escape(anterior + ' → ' + nuevo) + '</div></td>' +
                    '<td>' + _.escape(model.get('asignadoPorName') || '—') + '</td>' +
                    '<td>' + _.escape(anterior) + '</td>' +
                    '<td>' + _.escape(nuevo) + '</td>' +
                    '<td>' + _.escape(model.get('motivo') || '—') + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive custom-home-historial-table"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Fecha</th><th>Caso</th><th>Quién asignó</th><th>Responsable anterior</th><th>Responsable nuevo</th><th>Motivo</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>'
            );
        },

        loadHistorialVisitas: function (force) {
            if (this._historialVisitasLoaded && !force) {
                return;
            }

            this._historialVisitasLoaded = true;

            var $container = this.$el.find('[data-historial-visitas="list"]');

            this.getCollectionFactory().create('VisitaHistorial', function (collection) {
                collection.maxSize = 100;
                collection.orderBy = 'fecha';
                collection.order = 'desc';

                collection.fetch({main: true})
                    .then(function () {
                        this._historialVisitasModels = collection.models.slice();
                        this.renderHistorialVisitas(
                            $container,
                            this.filterHistorialModels(
                                this._historialVisitasModels,
                                this._historialVisitasSearch
                            )
                        );
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar el historial de visitas.</p>');
                    });
            }.bind(this));
        },

        renderHistorialVisitas: function ($container, models) {
            var hasAny = this._historialVisitasModels && this._historialVisitasModels.length;

            if (!models || !models.length) {
                var message = hasAny && this.normalizeHistorialSearch(this._historialVisitasSearch)
                    ? 'No hay visitas que coincidan con ese radicado.'
                    : 'Aún no hay visitas registradas en el historial.';

                $container.html('<p class="text-muted">' + message + '</p>');

                return;
            }

            var rows = models.map(function (model) {
                var caseId = model.get('caseId');
                var radicado = model.get('numeroRadicado') || model.get('caseName') || '—';
                var caseLink = caseId
                    ? '<a href="#Case/view/' + caseId + '">' + _.escape(radicado) + '</a>'
                    : _.escape(radicado);
                var numeroVisita = model.get('numeroVisita');

                return '<tr>' +
                    '<td>' + _.escape(model.get('fecha') || '—') + '</td>' +
                    '<td>' + caseLink + '</td>' +
                    '<td>' + _.escape(numeroVisita ? ('Visita ' + numeroVisita) : '—') + '</td>' +
                    '<td>' + _.escape(model.get('tipo') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('registradoPorName') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('motivo') || '—') + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive custom-home-historial-table"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Fecha</th><th>Caso</th><th>Visita</th><th>Evento</th><th>Registrado por</th><th>Motivo / detalle</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>'
            );
        },

        loadList: function (index, listCfg, page) {
            page = page || this._pageState[index] || 1;
            this._pageState[index] = page;

            var $container = this.$el.find('[data-list-index="' + index + '"]');

            $container.html('<p class="text-muted">Cargando casos…</p>');

            this.getCollectionFactory().create('Case', function (collection) {
                collection.maxSize = PAGE_SIZE;
                collection.offset = (page - 1) * PAGE_SIZE;
                collection.orderBy = 'cFechaCaso';
                collection.order = 'desc';
                collection.where = listCfg.where || [];

                collection.fetch({main: true})
                    .then(function () {
                        this.renderList($container, collection, index, page);
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar la lista.</p>');
                    });
            }.bind(this));
        },

        renderList: function ($container, collection, listIndex, currentPage) {
            var total = collection.total != null ? collection.total : collection.length;

            if (!total) {
                $container.html('<p class="text-muted">Sin casos en esta vista.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                var peticionario = [model.get('cNombrePeticionario'), model.get('cApellidoPeticionario')]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || '—';
                var fechaCaso = model.get('cFechaCaso')
                    ? (this.getDateTime().toDisplay(model.get('cFechaCaso')) || '—')
                    : '—';

                return '<tr>' +
                    '<td><a href="#Case/view/' + model.id + '">' + _.escape(model.get('cNumeroRadicado') || '—') + '</a></td>' +
                    '<td>' + _.escape(peticionario) + '</td>' +
                    '<td>' + _.escape(model.get('status') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('cExpediente') || '—') + '</td>' +
                    '<td>' + _.escape(model.get('assignedUserName') || '—') + '</td>' +
                    '<td>' + _.escape(fechaCaso) + '</td>' +
                    '</tr>';
            }.bind(this)).join('');

            $container.html(
                '<div class="table-responsive"><table class="table table-condensed table-striped">' +
                '<thead><tr><th>Radicado</th><th>Peticionario</th><th>Estado</th><th>Expediente</th><th>Asignado</th><th>Fecha</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table></div>' +
                this.buildPaginationHtml(listIndex, currentPage, total)
            );
        },
    });
});
