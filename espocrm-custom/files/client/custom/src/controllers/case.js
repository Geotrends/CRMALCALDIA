define('custom:controllers/case', [
    'controllers/record',
    'custom:helpers/radicacion-edit-mode',
    'custom:helpers/radicacion-fields',
], function (Dep, RadicacionEditMode, RadicacionFields) {

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

        getRadicarViewName: function () {
            return this.getMetadata().get(['clientDefs', this.name, 'views', 'radicar'])
                || 'custom:views/case/radicar';
        },

        openRadicarScreen: function (id, options) {
            options = options || {};

            if (!id) {
                throw new Error('Case id required for radicar.');
            }

            if (!this.getAcl().check(this.name, 'edit')) {
                this.accessDenied();

                return;
            }

            RadicacionEditMode.activateRadicarMode(id);
            this.getRouter().navigate('#Case/radicar/' + id, {trigger: true});
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
            var self = this;

            if (!options.id) {
                Dep.prototype.actionEdit.call(this, options);

                return;
            }

            var proceed = function () {
                if (RadicacionEditMode.isPureRadicacionUser(self.getUser())) {
                    self.openRadicarScreen(options.id, options);

                    return;
                }

                Dep.prototype.actionEdit.call(self, options);
            };

            if (RadicacionFields.isProfileLoaded()) {
                proceed();

                return;
            }

            RadicacionFields.ensureProfile(this.getUser()).then(proceed);
        },

        actionRadicar: function (options) {
            options = options || {};

            var id = options.id;
            var self = this;

            if (!id) {
                throw new Error('Case id required for radicar.');
            }

            if (!this.getAcl().check(this.name, 'edit')) {
                this.accessDenied();

                return;
            }

            RadicacionEditMode.activateRadicarMode(id);

            var proceed = function () {
                if (!RadicacionEditMode.isPureRadicacionUser(self.getUser())) {
                    Espo.Ui.warning(self.translate('Access denied', 'messages'));
                    self.getRouter().navigate('#Case/view/' + id, {trigger: true});

                    return;
                }

                self.getModelFactory().create(self.name, function (model) {
                    model.id = id;

                    self.listenToOnce(model, 'sync', function () {
                        self.main(self.getRadicarViewName(), {
                            scope: self.name,
                            model: model,
                            returnUrl: options.returnUrl || ('#Case/view/' + id),
                            returnDispatchParams: options.returnDispatchParams,
                            isReturned: options.isReturned || self.store.get('isReturned'),
                        });
                    }, self);

                    model.fetch({main: true});
                }, self);
            };

            if (RadicacionFields.isProfileLoaded()) {
                proceed();

                return;
            }

            RadicacionFields.ensureProfile(this.getUser()).then(proceed);
        },
    });
});
