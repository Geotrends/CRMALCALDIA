define('custom:views/notification/badge', [
    'views/notification/badge',
    'custom:helpers/safe-ui-promise',
], function (Dep, SafeUiPromise) {

    var getAckStorageKey = function (userId) {
        return 'crm-notif-ack-count-' + (userId || '');
    };

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            var userId = this.getUser().id;
            var stored = sessionStorage.getItem(getAckStorageKey(userId));

            this.acknowledgedUnreadCount = stored !== null && stored !== ''
                ? parseInt(stored, 10)
                : 0;

            if (isNaN(this.acknowledgedUnreadCount)) {
                this.acknowledgedUnreadCount = 0;
            }
        },

        acknowledgeNotifications: function () {
            this.acknowledgedUnreadCount = this.unreadCount || 0;
            sessionStorage.setItem(
                getAckStorageKey(this.getUser().id),
                String(this.acknowledgedUnreadCount)
            );
            this.hideNotRead();
        },

        resetAcknowledgement: function () {
            this.acknowledgedUnreadCount = 0;
            sessionStorage.setItem(getAckStorageKey(this.getUser().id), '0');
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

            if (count === 0) {
                this.resetAcknowledgement();
                this.hideNotRead();

                return;
            }

            if (isFirstCheck) {
                this.showNotRead(count);

                return;
            }

            if (count > this.acknowledgedUnreadCount) {
                this.showNotRead(count);

                return;
            }

            this.hideNotRead();
        },

        showNotifications: function () {
            var self = this;

            this.closeNotifications();
            this._panelMarkedRead = false;

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
                    self.resetAcknowledgement();
                    self.hideNotRead();
                    self.$el.find('.badge-circle-warning').remove();
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
            if (!this._panelMarkedRead && this.unreadCount > 0) {
                this.acknowledgeNotifications();
            }

            Dep.prototype.closeNotifications.call(this);
            this._panelMarkedRead = false;
        },
    });
});
