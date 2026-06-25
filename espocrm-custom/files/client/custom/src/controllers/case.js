define('custom:controllers/case', ['controllers/record'], function (Dep) {

    return Dep.extend({

        canCreateCase: function () {
            if (this.getUser().isAdmin()) {
                return true;
            }

            return this.getAcl().check(this.name, 'create');
        },

        getCreateBlockedMessage: function () {
            var message = 'Su rol no puede crear casos nuevos.';

            if (!this.getLanguage || typeof this.getLanguage !== 'function') {
                return message;
            }

            var translated = this.getLanguage().translate('caseCreateNotAllowed', 'messages', 'Case');

            if (translated && translated !== 'caseCreateNotAllowed') {
                return translated;
            }

            return message;
        },

        redirectCreateBlocked: function () {
            Espo.Ui.warning(this.getCreateBlockedMessage());
            this.getRouter().dispatch('Home', 'index', {trigger: true});
        },

        beforeCreate: function (options) {
            if (!this.canCreateCase()) {
                return;
            }

            Dep.prototype.beforeCreate.call(this, options);
        },

        actionCreate: function (options) {
            options = options || {};

            if (!this.canCreateCase()) {
                this.redirectCreateBlocked();

                return;
            }

            Dep.prototype.actionCreate.call(this, options);
        },
    });
});
