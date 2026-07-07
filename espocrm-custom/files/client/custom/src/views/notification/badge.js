define('custom:views/notification/badge', [
    'views/notification/badge',
], function (Dep) {

    return Dep.extend({

        getReadStorageKey: function () {
            return 'alcaldiaNotifReadAt_' + (this.getUser().id || '');
        },

        getSeenCountStorageKey: function () {
            return 'alcaldiaNotifSeenCount_' + (this.getUser().id || '');
        },

        persistReadState: function () {
            localStorage.setItem(this.getReadStorageKey(), String(Date.now()));
            localStorage.setItem(this.getSeenCountStorageKey(), '0');
        },

        rememberUnreadBeforeClear: function (count) {
            localStorage.setItem(this.getSeenCountStorageKey(), String(count || 0));
        },

        showNotRead: function (count) {
            var display = count > 99 ? '99+' : String(count);

            this.$badge = this.$badge || this.$el.find('.notifications-button');
            this.$number = this.$number || this.$el.find('.number-badge');

            this.$badge.attr('title', this.translate('New notifications') + ': ' + count);
            this.$number.removeClass('hidden').text(display);

            if (this.getHelper().pageTitle && typeof this.getHelper().pageTitle.setNotificationNumber === 'function') {
                this.getHelper().pageTitle.setNotificationNumber(count);
            }
        },

        checkUpdates: async function (isFirstCheck) {
            if (this.checkBypass()) {
                return;
            }

            var count = 0;

            try {
                count = await Espo.Ajax.getRequest('Notification/action/notReadCount');
            } catch (error) {
                return;
            }

            var lastReadAt = parseInt(localStorage.getItem(this.getReadStorageKey()) || '0', 10);
            var staleUnreadCount = parseInt(localStorage.getItem(this.getSeenCountStorageKey()) || '0', 10);

            if (
                isFirstCheck
                && count > 0
                && lastReadAt > 0
                && staleUnreadCount > 0
                && count === staleUnreadCount
            ) {
                try {
                    await Espo.Ajax.postRequest('Notification/action/markAllRead');
                    count = await Espo.Ajax.getRequest('Notification/action/notReadCount');

                    if (count === 0) {
                        this.persistReadState();
                    }
                } catch (error) {
                    // Si falla, se muestra el contador del servidor.
                }
            }

            if (!isFirstCheck && count > this.unreadCount) {
                var blockSound = localStorage.getItem('messageBlockPlayNotificationSound');

                if (!blockSound) {
                    this.playSound();
                    localStorage.setItem('messageBlockPlayNotificationSound', 'true');
                    setTimeout(function () {
                        delete localStorage['messageBlockPlayNotificationSound'];
                    }, this.notificationsCheckInterval * 1000);
                }
            }

            this.unreadCount = count;

            if (count) {
                this.showNotRead(count);

                return;
            }

            this.hideNotRead();
        },

        showNotifications: function () {
            var self = this;

            this.closeNotifications();
            this._panelMarkedRead = false;

            this.rememberUnreadBeforeClear(this.unreadCount || 0);

            Espo.Ajax.postRequest('Notification/action/markAllRead')
                .then(function () {
                    self.unreadCount = 0;
                    self.hideNotRead();
                    self.persistReadState();
                    self.broadcastNotificationsRead();
                })
                .catch(function () {});

            var $container = $('<div>').attr('id', 'notifications-panel');
            $container.appendTo(this.$el.find('.notifications-panel-container'));

            var panelViewName = this.getMetadata().get(['clientDefs', 'Notification', 'views', 'panel'])
                || 'views/notification/panel';

            this.createView('panel', panelViewName, {
                fullSelector: '#notifications-panel',
            }, function (view) {
                view.render();
                self.$el.closest('.navbar-body').removeClass('in');

                self.listenTo(view, 'all-read', function () {
                    self._panelMarkedRead = true;
                    self.unreadCount = 0;
                    self.hideNotRead();
                    self.persistReadState();
                    self.broadcastNotificationsRead();
                });

                self.listenTo(view, 'collection-fetched', function () {
                    self.checkUpdates();
                    self.broadcastNotificationsRead();
                });

                self.listenToOnce(view, 'close', function () {
                    self.closeNotifications();
                });
            });

            var $document = $(document);

            $document.on('mouseup.notification', function (e) {
                if (
                    !$container.is(e.target) &&
                    $container.has(e.target).length === 0 &&
                    !$(e.target).closest('div.modal-dialog').length &&
                    !e.target.classList.contains('modal')
                ) {
                    self.closeNotifications();
                }
            });

            if (window.innerWidth < this.getThemeManager().getParam('screenWidthXs')) {
                this.listenToOnce(this.getRouter(), 'route', function () {
                    self.closeNotifications();
                });
            }
        },

        closeNotifications: function () {
            Dep.prototype.closeNotifications.call(this);
            this._panelMarkedRead = false;
        },
    });
});
