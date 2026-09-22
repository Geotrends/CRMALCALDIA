define('custom:views/notification/panel', [
    'views/notification/panel',
    'custom:helpers/safe-ui-promise',
], function (Dep, SafeUiPromise) {

    return Dep.extend({

        createRecordView: function () {
            const viewName = this.getMetadata().get(['clientDefs', 'Notification', 'recordViews', 'list'])
                || 'views/notification/record/list';
            const containerView = this.getMetadata().get(['clientDefs', 'Notification', 'fields', 'data', 'view'])
                || 'custom:views/notification/fields/container';

            return this.createView('list', viewName, {
                selector: '.list-container',
                collection: this.collection,
                showCount: false,
                listLayout: {
                    rows: [
                        [
                            {
                                name: 'data',
                                view: containerView,
                                options: {
                                    containerSelector: this.getSelector(),
                                    groupingEnabled: this.groupingEnabled,
                                },
                            },
                        ],
                    ],
                },
            });
        },

        getReadStorageKey: function () {
            return 'alcaldiaNotifReadAt_' + (this.getUser().id || '');
        },

        persistReadState: function () {
            localStorage.setItem(this.getReadStorageKey(), String(Date.now()));
        },

        markAllAsRead: function () {
            var self = this;

            if (this._markAllReadPromise) {
                return this._markAllReadPromise;
            }

            this._markAllReadPromise = Espo.Ajax.postRequest('Notification/action/markAllRead')
                .then(function () {
                    self.persistReadState();
                    self.trigger('all-read');

                    return self.collection.fetch();
                })
                .then(function () {
                    self.collection.models.forEach(function (model) {
                        model.set('read', true, {sync: true});
                    });

                    var listView = self.getView('list');

                    if (listView && typeof listView.reRender === 'function') {
                        return SafeUiPromise.absorb(listView.reRender());
                    }
                })
                .catch(function () {
                    // Mantener panel usable aunque falle markAllRead.
                })
                .finally(function () {
                    self._markAllReadPromise = null;
                });

            return this._markAllReadPromise;
        },

        afterRender: function () {
            var self = this;
            var $window = $(window);

            $window.off('resize.notifications-height');
            $window.on('resize.notifications-height', this.processSizing.bind(this));

            Dep.prototype.afterRender.call(this);
            this.processSizing();

            $('#navbar li.notifications-badge-container').addClass('open');
            this.$el.find('> .panel').focus();

            this.addClearReadAction();

            this.markAllAsRead();
        },

        addClearReadAction: function () {
            const $group = this.$el.find('.panel-heading .link-group').first();

            if (!$group.length || $group.find('[data-action="clear-read-notifications"]').length) {
                return;
            }

            const $button = $(
                '<a role="button" tabindex="0" data-action="clear-read-notifications" ' +
                'class="notification-clear-read-button" title="Eliminar notificaciones leídas">' +
                '<span class="fas fa-trash-alt"></span></a>'
            );

            $button.on('click', function (event) {
                event.preventDefault();
                this.clearReadNotifications();
            }.bind(this));

            $group.prepend($button);
        },

        clearReadNotifications: function () {
            const models = this.collection.models.filter(model => model.get('read'));

            if (!models.length || this._clearReadPromise) {
                return;
            }

            this._clearReadPromise = Promise.all(
                models.map(model => Espo.Ajax.deleteRequest('Notification/' + model.id))
            ).then(function () {
                models.forEach(model => this.collection.remove(model));

                const listView = this.getView('list');

                return listView && typeof listView.reRender === 'function'
                    ? SafeUiPromise.absorb(listView.reRender())
                    : null;
            }.bind(this)).catch(function () {
                Espo.Ui.error('No fue posible eliminar las notificaciones leídas.');
            }).finally(function () {
                this._clearReadPromise = null;
            }.bind(this));
        },
    });
});
