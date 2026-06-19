define('custom:views/notification/panel', ['views/notification/panel'], function (Dep) {

    const hideNavbarBadge = function () {
        $('.notifications-button .number-badge').addClass('hidden').html('');
        $('.notifications-badge-container .badge-circle-warning').remove();
    };

    return Dep.extend({

        afterRender: function () {
            const $window = $(window);

            $window.off('resize.notifications-height');
            $window.on('resize.notifications-height', this.processSizing.bind(this));
            this.processSizing();

            $('#navbar li.notifications-badge-container').addClass('open');
            this.$el.find('> .panel').focus();

            Espo.Ajax.postRequest('Notification/action/markAllRead')
                .then(() => {
                    this.trigger('all-read');
                    hideNavbarBadge();

                    return this.collection.fetch();
                })
                .then(() => {
                    this.collection.models.forEach((model) => {
                        model.set('read', true, {sync: true});
                    });

                    return this.createRecordView();
                })
                .then((view) => view.render());
        },
    });
});
