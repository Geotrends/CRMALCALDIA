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

            this.markAllAsRead();
        },
    });
});
