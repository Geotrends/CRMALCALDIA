define('custom:views/team/record/panels/users-cards', [
    'views/record/panels/relationship',
    'custom:helpers/team-member-cards',
], function (Dep, TeamMemberCards) {

    return Dep.extend({

        className: 'panel panel-default team-members-cards-panel',

        templateContent: '<div class="team-members-grid" data-role="members-grid"></div>',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.collection, 'sync update reset remove', function () {
                this.renderCards();
            });
        },

        loadList: function () {
            this.fetchMembers();
        },

        createListRecordView: function (fetch) {
            if (fetch) {
                return this.fetchMembers();
            }

            this.renderCards();

            return Promise.resolve();
        },

        fetchMembers: function () {
            if (this.collection.isFetched) {
                this.renderCards();

                return Promise.resolve();
            }

            Espo.Ui.notifyWait();

            return this.collection.fetch({main: true})
                .then(function () {
                    Espo.Ui.notify();
                    this.renderCards();
                }.bind(this))
                .catch(function () {
                    Espo.Ui.notify();
                });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.renderCards();
        },

        renderCards: function () {
            var $grid = this.$el.find('[data-role="members-grid"]');

            if (!$grid.length) {
                return;
            }

            var models = this.collection.models || [];
            var total = this.collection.total != null ?
                this.collection.total :
                models.length;

            this.updateHeaderCount(total);
            $grid.html(TeamMemberCards.buildGridHtml(models, this));
            TeamMemberCards.bindUserClicks($grid, this);
        },

        updateHeaderCount: function (total) {
            var $header = this.$el.find('.panel-heading .panel-title');

            if (!$header.length) {
                $header = this.$el.closest('.panel').find('.panel-heading .panel-title');
            }

            if (!$header.length) {
                return;
            }

            var $count = $header.find('[data-role="member-count"]');

            if (!$count.length) {
                $header.append(' <span class="team-members-count" data-role="member-count"></span>');
                $count = $header.find('[data-role="member-count"]');
            }

            $count.text('(' + total + ')');
        },
    });
});
