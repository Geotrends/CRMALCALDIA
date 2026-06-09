define('custom:views/home', ['views/dashboard', 'search-manager'], function (Dep, SearchManager) {

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

    var profileConfig = function (profile, userId) {
        var lists = {
            gestion: [
                {title: 'Todos los casos', primary: 'todos', limit: 15},
                {title: 'En seguimiento', primary: 'enSeguimiento', limit: 10},
            ],
            radicacion: [
                {title: 'Pendientes de radicación', primary: 'pendienteRadicacion', limit: 15},
            ],
            asignador: [
                {title: 'Pendientes de asignación', primary: 'pendienteAsignacion', limit: 10},
                {title: 'En seguimiento', primary: 'enSeguimiento', limit: 10},
            ],
            patrullero: [
                {title: 'Mis casos asignados', primary: 'misCasos', limit: 15},
            ],
        };

        var showTablero = profile !== 'radicacion';
        var iframeUrl = '/client/custom/dashboard.html';

        if (profile === 'patrullero') {
            iframeUrl += '?assignedUserId=' + encodeURIComponent(userId);
        }

        return {
            showTablero: showTablero,
            iframeUrl: iframeUrl,
            lists: lists[profile] || lists.gestion,
        };
    };

    return Dep.extend({

        setup: function () {
            this.config = profileConfig(detectProfile(this.getUser()), this.getUser().id);

            if (!document.getElementById('custom-home-css')) {
                var link = document.createElement('link');
                link.id = 'custom-home-css';
                link.rel = 'stylesheet';
                link.href = 'client/custom/res/css/custom-home.css';
                document.head.appendChild(link);
            }

            Dep.prototype.setup.call(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.renderCustomPanels();
        },

        renderCustomPanels: function () {
            if (this.$el.find('.custom-home').length) {
                return;
            }

            var cfg = this.config;
            var html = '<div class="custom-home">';

            if (cfg.showTablero) {
                html += '<div class="panel panel-default custom-home-tablero">' +
                    '<div class="panel-heading"><h4 class="panel-title">Tablero de control</h4></div>' +
                    '<div class="panel-body custom-home-tablero-body">' +
                    '<iframe src="' + _.escape(cfg.iframeUrl) + '" title="Tablero de control" class="custom-home-iframe"></iframe>' +
                    '</div></div>';
            }

            cfg.lists.forEach(function (listCfg, index) {
                html += '<div class="panel panel-default custom-home-lista">' +
                    '<div class="panel-heading"><h4 class="panel-title">' + _.escape(listCfg.title) + '</h4></div>' +
                    '<div class="panel-body">' +
                    '<div class="custom-home-lista-cuerpo" data-list-index="' + index + '">' +
                    '<p class="text-muted">Cargando casos…</p>' +
                    '</div></div></div>';
            });

            html += '</div>';

            this.$el.find('> .dashlets').before(html);

            cfg.lists.forEach(function (listCfg, index) {
                this.loadList(index, listCfg);
            }, this);
        },

        loadList: function (index, listCfg) {
            var $container = this.$el.find('[data-list-index="' + index + '"]');

            this.getCollectionFactory().create('Case', function (collection) {
                collection.maxSize = listCfg.limit;
                collection.orderBy = 'cFechaCaso';
                collection.order = 'desc';

                var searchManager = new SearchManager(collection, {
                    defaultData: {
                        primary: listCfg.primary,
                        bool: {},
                    },
                });

                collection.where = searchManager.getWhere();

                collection.fetch()
                    .then(function () {
                        this.renderList($container, collection);
                    }.bind(this))
                    .catch(function () {
                        $container.html(
                            '<p class="text-danger">No se pudo cargar la lista.</p>'
                        );
                    });
            }.bind(this));
        },

        renderList: function ($container, collection) {
            if (!collection.length) {
                $container.html('<p class="text-muted">Sin casos en esta vista.</p>');

                return;
            }

            var rows = collection.models.map(function (model) {
                var id = model.id;
                var radicado = model.get('cNumeroRadicado') || '—';
                var peticionario = model.get('cPeticionario') || '—';
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
                '</div>'
            );
        },
    });
});
