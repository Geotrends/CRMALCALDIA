define('custom:views/calendar/modals/edit', ['crm:views/calendar/modals/edit'], function (Dep) {

    return Dep.extend({

        scopeList: ['Meeting'],

        setup: function () {
            this.options.scope = 'Meeting';
            this.options.scopeList = ['Meeting'];
            this.options.enabledScopeList = ['Meeting'];

            Dep.prototype.setup.call(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.$el.find('.scope-switcher').remove();
        },
    });
});
