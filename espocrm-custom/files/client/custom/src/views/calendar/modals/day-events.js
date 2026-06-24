define('custom:views/calendar/modals/day-events', ['views/modal'], function (Dep) {

    return Dep.extend({

        className: 'dialog dialog-record',

        template: 'custom:calendar/modals/day-events',

        events: {
            'click [data-action="open"]': function (e) {
                e.preventDefault();

                var $target = $(e.currentTarget);
                var scope = $target.data('scope');
                var recordId = $target.data('record-id');

                if (!scope || !recordId) {
                    return;
                }

                this.trigger('open-record', {
                    scope: scope,
                    recordId: recordId,
                });
            },
        },

        setup: function () {
            this.headerText = this.translate('dayEventsTitle', 'labels', 'Calendar');
            this.eventsList = (this.options.events || []).slice().sort(this.compareEvents.bind(this));

            this.buttonList = [{
                name: 'close',
                label: this.translate('Close'),
            }];
        },

        isTimedEvent: function (event) {
            if (!event || event.scope !== 'Meeting' || !event.dateStart) {
                return false;
            }

            var value = String(event.dateStart).trim();

            return value.length > 10 && value.indexOf(' ') > 0;
        },

        getEventSortTime: function (event) {
            if (this.isTimedEvent(event)) {
                return String(event.dateStart);
            }

            if (event.dateStartDate) {
                return event.dateStartDate + 'T00:00:00';
            }

            return '9999-12-31T23:59:59';
        },

        compareEvents: function (a, b) {
            var aTimed = this.isTimedEvent(a);
            var bTimed = this.isTimedEvent(b);

            if (aTimed !== bTimed) {
                return aTimed ? -1 : 1;
            }

            var aTime = this.getEventSortTime(a);
            var bTime = this.getEventSortTime(b);

            if (aTime !== bTime) {
                return aTime < bTime ? -1 : 1;
            }

            return String(a.name || '').localeCompare(String(b.name || ''));
        },

        formatEventTime: function (event) {
            if (this.isTimedEvent(event)) {
                return this.getDateTime().toMoment(event.dateStart).format(this.getDateTime().getTimeFormat());
            }

            if (event.dateStartDate || event.scope === 'Case') {
                return this.translate('allDay', 'labels', 'Calendar');
            }

            return '';
        },

        data: function () {
            var date = this.options.date || '';
            var momentDate = this.getDateTime().toMoment(date + ' 12:00:00');
            var dateLabel = momentDate.isValid()
                ? momentDate.format('dddd, D MMMM YYYY')
                : date;
            var self = this;

            return {
                dateLabel: dateLabel,
                countLabel: this.eventsList.length + ' actividad(es)',
                items: this.eventsList.map(function (event) {
                    if (event.isMoreLink || event.scope === 'CaseMore') {
                        return null;
                    }

                    return {
                        scope: event.scope,
                        recordId: event.recordId || event.id,
                        name: event.name || '',
                        color: event.color || '#1d8a6e',
                        timeLabel: self.formatEventTime(event),
                    };
                }).filter(function (item) {
                    return item && item.scope && item.recordId;
                }),
            };
        },
    });
});
