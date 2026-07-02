define('custom:views/notification/badge', [
    'views/notification/badge',
], function (Dep) {

    return Dep.extend({

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
