define('custom:views/team/record/list', [
    'views/team/record/list',
    'custom:helpers/team-member-cards',
    'handlebars',
], function (Dep, TeamMemberCards, Handlebars) {

    var escapeHtml = function (value) {
        return Handlebars.Utils.escapeExpression(String(value || ''));
    };

    return Dep.extend({

        activeTeamId: null,
        activeTeamName: null,

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.collection, 'sync update reset', function () {
                if (!this.activeTeamId) {
                    this.scheduleRenderTeamCards();
                }
            });

            this.listenTo(this, 'after:render', function () {
                if (!this.activeTeamId) {
                    this.scheduleRenderTeamCards();
                }
            });
        },

        scheduleRenderTeamCards: function () {
            setTimeout(function () {
                if (!this.activeTeamId) {
                    this.renderTeamCards();
                }
            }.bind(this), 0);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (this.activeTeamId) {
                this.loadTeamMembers(this.activeTeamId, this.activeTeamName);

                return;
            }

            this.scheduleRenderTeamCards();
        },

        getCardsContainer: function () {
            var $grid = this.$el.children('[data-role="teams-grid"]');

            if (!$grid.length) {
                $grid = $('<div class="team-list-grid" data-role="teams-grid"></div>');
                this.$el.append($grid);
            }

            return $grid;
        },

        renderTeamCards: function () {
            var $grid = this.getCardsContainer();

            if (!$grid || !$grid.length) {
                return;
            }

            this.$el.addClass('team-list-cards-mode');
            this.$el.removeClass('team-members-view-mode');
            $grid.removeClass('team-members-grid').addClass('team-list-grid');

            var models = this.collection.models || [];
            var total = this.collection.total != null ? this.collection.total : models.length;

            this.updateListHeader(total);
            $grid.html(this.buildTeamsGridHtml(models));
            this.bindTeamCardClicks($grid);
        },

        bindTeamCardClicks: function ($grid) {
            $grid.find('[data-action="openTeam"]').off('click').on('click', function (e) {
                e.preventDefault();

                var id = $(e.currentTarget).data('id');
                var name = $(e.currentTarget).data('name');

                if (!id) {
                    return;
                }

                this.activeTeamId = id;
                this.activeTeamName = name;
                this.loadTeamMembers(id, name);
            }.bind(this));
        },

        loadTeamMembers: function (teamId, teamName) {
            var $grid = this.getCardsContainer();

            if (!$grid || !$grid.length) {
                return;
            }

            this.$el.removeClass('team-list-cards-mode');
            this.$el.addClass('team-members-view-mode');
            $grid.removeClass('team-list-grid').addClass('team-members-grid');

            $grid.html('<p class="team-members-empty text-muted">Cargando integrantes...</p>');
            this.updateMembersHeader(teamName, '…');

            Espo.Ajax.getRequest('Team/' + teamId + '/users', {
                maxSize: 200,
            }).then(function (response) {
                var users = response.list || [];

                this.renderMemberCards(users, teamName);
            }.bind(this)).catch(function () {
                $grid.html('<p class="team-members-empty text-danger">No se pudieron cargar los integrantes.</p>');
            });
        },

        renderMemberCards: function (users, teamName) {
            var $grid = this.getCardsContainer();

            if (!$grid || !$grid.length) {
                return;
            }

            var html =
                '<div class="team-members-toolbar">' +
                    '<button type="button" class="btn btn-default btn-sm team-back-btn" data-action="backToTeams">' +
                        '<span class="fas fa-arrow-left"></span> Volver a equipos' +
                    '</button>' +
                    '<div class="team-members-heading-wrap">' +
                        '<h4 class="team-members-heading">' + escapeHtml(teamName) + '</h4>' +
                        '<span class="team-members-subheading">' + users.length + ' integrantes</span>' +
                    '</div>' +
                '</div>' +
                TeamMemberCards.buildGridHtml(users, this);

            $grid.html(html);
            this.updateMembersHeader(teamName, users.length);
            TeamMemberCards.bindUserClicks($grid, this);

            $grid.find('[data-action="backToTeams"]').off('click').on('click', function () {
                this.activeTeamId = null;
                this.activeTeamName = null;
                this.renderTeamCards();
            }.bind(this));
        },

        updateListHeader: function (total) {
            var $header = this.getPageHeader();

            if (!$header.length) {
                return;
            }

            var label = this.translate('Teams', 'scopeNames') || 'Equipos';

            $header.html(
                '<span class="team-list-title">' + escapeHtml(label) + '</span> ' +
                '<span class="team-list-count" data-role="team-count">' + total + '</span>'
            );
        },

        updateMembersHeader: function (teamName, total) {
            var $header = this.getPageHeader();

            if (!$header.length) {
                return;
            }

            $header.html(
                '<span class="team-list-title">' + escapeHtml(teamName) + '</span> ' +
                '<span class="team-list-count">' + escapeHtml(String(total)) + ' integrantes</span>'
            );
        },

        getPageHeader: function () {
            var $header = this.$el.closest('.page').find('.page-header-row h3');

            if (!$header.length) {
                $header = this.$el.closest('.page').find('h3.title');
            }

            return $header;
        },

        buildTeamsGridHtml: function (models) {
            if (!models.length) {
                return '<p class="team-list-empty text-muted">No hay equipos registrados.</p>';
            }

            return models.map(function (model) {
                var id = model.id;
                var name = model.get('name') || '—';
                var description = model.get('description') || '';

                return (
                    '<article class="team-card">' +
                        '<a class="team-card-link" href="#" data-action="openTeam" data-id="' + escapeHtml(id) + '" data-name="' + escapeHtml(name) + '">' +
                            '<div class="team-card-icon">' +
                                '<span class="fas fa-users"></span>' +
                            '</div>' +
                            '<div class="team-card-body">' +
                                '<h4 class="team-card-name">' + escapeHtml(name) + '</h4>' +
                                (description ?
                                    '<p class="team-card-desc">' + escapeHtml(description) + '</p>' :
                                    '<p class="team-card-desc team-card-desc--muted">Ver integrantes del equipo</p>') +
                            '</div>' +
                            '<div class="team-card-arrow">' +
                                '<span class="fas fa-chevron-right"></span>' +
                            '</div>' +
                        '</a>' +
                    '</article>'
                );
            }).join('');
        },
    });
});
