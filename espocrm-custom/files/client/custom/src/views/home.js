define('custom:views/home', ['views/dashboard', 'search-manager'], function (Dep, SearchManager) {

    var PAGE_SIZE = 5;

    var detectProfile = function (user) {
        if (user.isAdmin()) {
            return 'gestion';
        }

        var userName = user.get('userName') || '';

        if (userName.indexOf('patrullero') === 0) {
            return 'patrullero';
        }

        if (userName === 'edwin.radicacion') {
            return 'radicacion';
        }

        if (userName === 'julian.asignador') {
            return 'asignador';
        }

        return 'gestion';
    };

    var profileConfig = function (profile, userId, appTimestamp) {
        var lists = {
            gestion: [
                {title: 'Todos los casos', primary: 'todos'},
                {title: 'En seguimiento', primary: 'enSeguimiento'},
            ],
            radicacion: [
                {title: 'Pendientes de radicación', primary: 'pendienteRadicacion'},
            ],
            asignador: [
                {title: 'Pendientes de asignación', primary: 'pendienteAsignacion'},
                {title: 'En seguimiento', primary: 'enSeguimiento'},
            ],
            patrullero: [
                {title: 'Mis casos asignados', primary: 'misCasos'},
            ],
        };

        var showTablero = true;
        var cacheBuster = String(appTimestamp || Date.now()) + '-dash5';
        var iframeUrl = '/client/custom/dashboard.html?v=' + encodeURIComponent(cacheBuster);

        if (profile === 'patrullero') {
            iframeUrl += '&assignedUserId=' + encodeURIComponent(userId);
        }

        return {
            showTablero: showTablero,
            showHistorialAsignaciones: profile === 'asignador',
            iframeUrl: iframeUrl,
            lists: lists[profile] || lists.gestion,
        };
    };

    var UNWANTED_DASHLETS = ['Memo', 'Records'];

    return Dep.extend({

        setup: function () {
            var profile = detectProfile(this.getUser());
            var userId = this.getUser().id;
            var appTimestamp = this.getConfig().get('appTimestamp');
            this.config = profileConfig(profile, userId, appTimestamp);
            this._pageState = {};

            this.sanitizeDashboardPreferences();
            Dep.prototype.setup.call(this);
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
                if (!event.data || event.data.type !== 'crm-dashboard-height') {
                    return;
                }

                if (event.origin !== window.location.origin) {
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
            if (this.$el.find('.custom-home').length) {
                return;
            }

            var cfg = this.config;
            var activeTab = sessionStorage.getItem('crm-home-tab') || 'dashboard';

            if (activeTab === 'historial-asignaciones' && !cfg.showHistorialAsignaciones) {
                activeTab = 'dashboard';
            }

            var html = '<div class="custom-home">';

            html += '<nav class="custom-home-tabs" role="tablist" aria-label="Secciones de inicio">';
            html += this.buildHomeTabButton('dashboard', 'Dashboard', activeTab);
            html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
            html += this.buildHomeTabButton('gestion', 'Gestión de casos', activeTab);
            html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
            html += this.buildHomeTabButton('agenda', 'Agenda', activeTab);

            if (cfg.showHistorialAsignaciones) {
                html += '<span class="custom-home-tab-sep" aria-hidden="true">/</span>';
                html += this.buildHomeTabButton('historial-asignaciones', 'Historial de asignaciones', activeTab);
            }

            html += '</nav>';

            html += '<div class="custom-home-panels">';

            html += '<div class="custom-home-panel' + (activeTab === 'dashboard' ? ' is-active' : '') + '" data-panel="dashboard" role="tabpanel">';

            if (cfg.showTablero) {
                html += '<div class="panel panel-default custom-home-tablero">' +
                    '<div class="panel-heading"><h4 class="panel-title">Tablero de control</h4></div>' +
                    '<div class="panel-body custom-home-tablero-body">' +
                    '<iframe src="' + _.escape(cfg.iframeUrl) + '" title="Tablero de control" class="custom-home-iframe" scrolling="no"></iframe>' +
                    '</div></div>';
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
                '<div class="panel panel-default custom-home-lista">' +
                '<div class="panel-heading"><h4 class="panel-title">Reuniones</h4></div>' +
                '<div class="panel-body">' +
                '<div class="custom-home-lista-cuerpo" data-agenda-list="meetings">' +
                '<p class="text-muted">Cargando reuniones…</p>' +
                '</div></div></div>' +
                '<div class="panel panel-default custom-home-lista">' +
                '<div class="panel-heading"><h4 class="panel-title">Tareas</h4></div>' +
                '<div class="panel-body">' +
                '<div class="custom-home-lista-cuerpo" data-agenda-list="tasks">' +
                '<p class="text-muted">Cargando tareas…</p>' +
                '</div></div></div>' +
                '<div class="panel panel-default custom-home-lista">' +
                '<div class="panel-heading"><h4 class="panel-title">Comunicaciones</h4></div>' +
                '<div class="panel-body">' +
                '<div class="custom-home-lista-cuerpo" data-agenda-list="comunicaciones">' +
                '<p class="text-muted">Cargando comunicaciones…</p>' +
                '</div></div></div>' +
                '</div>';

            if (cfg.showHistorialAsignaciones) {
                html += '<div class="custom-home-panel custom-home-historial-panel' +
                    (activeTab === 'historial-asignaciones' ? ' is-active' : '') +
                    '" data-panel="historial-asignaciones" role="tabpanel">' +
                    '<div class="panel panel-default custom-home-lista">' +
                    '<div class="panel-heading"><h4 class="panel-title">Historial de asignaciones</h4></div>' +
                    '<div class="panel-body">' +
                    '<div class="custom-home-lista-cuerpo" data-historial-asignaciones="list">' +
                    '<p class="text-muted">Cargando historial…</p>' +
                    '</div></div></div>' +
                    '</div>';
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
            this._activeHomeTab = activeTab;

            if (activeTab === 'gestion') {
                this.loadGestionLists();
            } else if (activeTab === 'agenda') {
                this.loadAgendaLists();
            } else if (activeTab === 'historial-asignaciones') {
                this.loadHistorialAsignaciones();
            } else if (activeTab === 'dashboard') {
                this.refreshDashboardIframeHeight();
            }
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

            this.$el.find('.custom-home-tabs [data-tab]').on('click', function () {
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

            this.$el.find('.custom-home-panel')
                .removeClass('is-active');

            this.$el.find('.custom-home-panel[data-panel="' + tab + '"]')
                .addClass('is-active');

            if (tab === 'gestion') {
                this.loadGestionLists();
            }

            if (tab === 'agenda') {
                this.loadAgendaLists();
            }

            if (tab === 'historial-asignaciones') {
                this.loadHistorialAsignaciones();
            }

            if (tab === 'dashboard') {
                this.refreshDashboardIframeHeight();
            }
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

        loadGestionLists: function () {
            if (this._gestionLoaded) {
                return;
            }

            this._gestionLoaded = true;

            this.config.lists.forEach(function (listCfg, index) {
                this.loadList(index, listCfg);
            }, this);
        },

        loadAgendaLists: function () {
            if (this._agendaLoaded) {
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
                    type: 'or',
                    value: [
                        {
                            type: 'equals',
                            attribute: 'assignedUserId',
                            value: userId,
                        },
                        {
                            type: 'linkedWith',
                            attribute: 'users',
                            value: userId,
                        },
                    ],
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
                    attribute: 'assignedUserId',
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
                var id = model.id;
                var name = model.get('name') || '—';
                var dateStart = model.get('dateStart') || '—';
                var dateEnd = model.get('dateEnd') || '—';
                var status = model.get('status') || '—';
                var assigned = model.get('assignedUserName') || '—';

                return '<tr>' +
                    '<td><a href="#Meeting/view/' + id + '">' + _.escape(name) + '</a></td>' +
                    '<td>' + _.escape(dateStart) + '</td>' +
                    '<td>' + _.escape(dateEnd) + '</td>' +
                    '<td>' + _.escape(status) + '</td>' +
                    '<td>' + _.escape(assigned) + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive">' +
                    '<table class="table table-condensed table-striped">' +
                        '<thead><tr>' +
                            '<th>Reunión</th><th>Inicio</th><th>Fin</th>' +
                            '<th>Estado</th><th>Asignado</th>' +
                        '</tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>' +
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
                var id = model.id;
                var name = model.get('name') || '—';
                var status = model.get('status') || '—';
                var priority = model.get('priority') || '—';
                var dateEnd = model.get('dateEnd') || '—';
                var assigned = model.get('assignedUserName') || '—';

                return '<tr>' +
                    '<td><a href="#Task/view/' + id + '">' + _.escape(name) + '</a></td>' +
                    '<td>' + _.escape(status) + '</td>' +
                    '<td>' + _.escape(priority) + '</td>' +
                    '<td>' + _.escape(dateEnd) + '</td>' +
                    '<td>' + _.escape(assigned) + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive">' +
                    '<table class="table table-condensed table-striped">' +
                        '<thead><tr>' +
                            '<th>Tarea</th><th>Estado</th><th>Prioridad</th>' +
                            '<th>Vencimiento</th><th>Asignado</th>' +
                        '</tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>' +
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
                var id = model.id;
                var fecha = model.get('fecha') || '—';
                var tipo = model.get('tipo') || '—';
                var radicado = model.get('numeroRadicado') || model.get('caseName') || '—';
                var caseId = model.get('caseId');
                var destinatario = model.get('destinatario') || '—';
                var asunto = model.get('asunto') || '—';
                var createdBy = model.get('createdByName') || '—';
                var casoCell = caseId
                    ? '<a href="#Case/view/' + caseId + '">' + _.escape(radicado) + '</a>'
                    : _.escape(radicado);
                var asuntoCell = id
                    ? '<a href="#ComunicacionCaso/view/' + id + '">' + _.escape(asunto) + '</a>'
                    : _.escape(asunto);

                return '<tr>' +
                    '<td>' + casoCell + '</td>' +
                    '<td>' + _.escape(fecha) + '</td>' +
                    '<td>' + _.escape(tipo) + '</td>' +
                    '<td>' + _.escape(destinatario) + '</td>' +
                    '<td>' + asuntoCell + '</td>' +
                    '<td>' + _.escape(createdBy) + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive">' +
                    '<table class="table table-condensed table-striped">' +
                        '<thead><tr>' +
                            '<th>Caso</th><th>Fecha</th><th>Tipo</th>' +
                            '<th>Destinatario</th><th>Asunto</th><th>Registrado por</th>' +
                        '</tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>' +
                this.buildPaginationHtml('comunicaciones', currentPage, total, 'comunicaciones')
            );
        },

        loadHistorialAsignaciones: function () {
            if (this._historialLoaded) {
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
                        this.renderHistorialAsignaciones($container, collection);
                    }.bind(this))
                    .catch(function () {
                        $container.html('<p class="text-danger">No se pudo cargar el historial de asignaciones.</p>');
                    });
            }.bind(this));
        },

        renderHistorialAsignaciones: function ($container, collection) {
            if (!collection.length) {
                $container.html('<p class="text-muted">Aún no hay reasignaciones registradas.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                var fecha = model.get('fecha') || '—';
                var caseId = model.get('caseId');
                var radicado = model.get('numeroRadicado') || model.get('caseName') || '—';
                var asignadoPor = model.get('asignadoPorName') || '—';
                var anterior = model.get('responsableAnteriorName') || 'Sin asignar';
                var nuevo = model.get('responsableNuevoName') || 'Sin asignar';
                var motivo = model.get('motivo') || '—';
                var resumen = anterior + ' → ' + nuevo;
                var caseLink = caseId
                    ? '<a href="#Case/view/' + caseId + '">' + _.escape(radicado) + '</a>'
                    : _.escape(radicado);

                return '<tr>' +
                    '<td>' + _.escape(fecha) + '</td>' +
                    '<td>' + caseLink + '<div class="text-muted small">' + _.escape(resumen) + '</div></td>' +
                    '<td>' + _.escape(asignadoPor) + '</td>' +
                    '<td>' + _.escape(anterior) + '</td>' +
                    '<td>' + _.escape(nuevo) + '</td>' +
                    '<td>' + _.escape(motivo) + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive custom-home-historial-table">' +
                    '<table class="table table-condensed table-striped">' +
                        '<thead><tr>' +
                            '<th>Fecha</th><th>Caso</th><th>Quién asignó</th>' +
                            '<th>Responsable anterior</th><th>Responsable nuevo</th>' +
                            '<th>Motivo</th>' +
                        '</tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>'
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

                var searchManager = new SearchManager(collection, {
                    defaultData: {
                        primary: listCfg.primary,
                        bool: {},
                    },
                });

                collection.where = searchManager.getWhere();

                collection.fetch({main: true})
                    .then(function () {
                        this.renderList($container, collection, index, page);
                    }.bind(this))
                    .catch(function () {
                        $container.html(
                            '<p class="text-danger">No se pudo cargar la lista.</p>'
                        );
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
                var id = model.id;
                var radicado = model.get('cNumeroRadicado') || '—';
                var peticionario = [model.get('cNombrePeticionario'), model.get('cApellidoPeticionario')]
                    .filter(Boolean)
                    .join(' ')
                    .trim() || '—';
                var status = model.get('status') || '—';
                var expediente = model.get('cExpediente') || '—';
                var assigned = model.get('assignedUserName') || '—';
                var fecha = model.get('cFechaCaso') || '—';

                return '<tr>' +
                    '<td><a href="#Case/view/' + id + '">' + _.escape(radicado) + '</a></td>' +
                    '<td>' + _.escape(peticionario) + '</td>' +
                    '<td>' + _.escape(status) + '</td>' +
                    '<td>' + _.escape(expediente) + '</td>' +
                    '<td>' + _.escape(assigned) + '</td>' +
                    '<td>' + _.escape(fecha) + '</td>' +
                    '</tr>';
            }).join('');

            $container.html(
                '<div class="table-responsive">' +
                    '<table class="table table-condensed table-striped">' +
                        '<thead><tr>' +
                            '<th>Radicado</th><th>Peticionario</th><th>Estado</th>' +
                            '<th>Expediente</th><th>Asignado</th><th>Fecha</th>' +
                        '</tr></thead>' +
                        '<tbody>' + rows + '</tbody>' +
                    '</table>' +
                '</div>' +
                this.buildPaginationHtml(listIndex, currentPage, total)
            );
        },
    });
});
