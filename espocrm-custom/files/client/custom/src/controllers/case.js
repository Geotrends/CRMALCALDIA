define('custom:controllers/case', [
    'controllers/record',
    'custom:helpers/radicacion-edit-mode',
], function (Dep, RadicacionEditMode) {

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

        actionEdit: function (options) {
            options = options || {};

            if (options.id && RadicacionEditMode.isPureRadicacionUser(this.getUser())) {
                RadicacionEditMode.activateRadicarMode(options.id);

                const hash = String(window.location.hash || '');

                if (!/[?&]radicar=1(?:&|$)/.test(hash)) {
                    this.getRouter().navigate('#Case/edit/' + options.id + '?radicar=1', {trigger: true});

                    return;
                }
            }

            Dep.prototype.actionEdit.call(this, options);
        },

        actionRadicar: function (options) {
            options = options || {};

            var id = options.id;

            if (!id) {
                throw new Error('Case id required for radicar.');
            }

            if (!this.getAcl().check(this.name, 'edit')) {
                this.accessDenied();

                return;
            }

            RadicacionEditMode.activateRadicarMode(id);
            this.getRouter().navigate('#Case/edit/' + id + '?radicar=1', {trigger: true});
        },
    });
});
