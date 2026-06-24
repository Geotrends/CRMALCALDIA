define('custom:views/calendar/calendar', [
    'crm:views/calendar/calendar',
    'helpers/record-modal',
], function (Dep, RecordModal) {

    var RecordModalHelper = RecordModal.default || RecordModal;
    var MAX_EVENTS_PER_DAY = 4;

    return Dep.extend({

        scopeList: ['Meeting', 'Task', 'Case'],

        setup: function () {
            Dep.prototype.setup.call(this);

            this.scopeList = this.getConfig().get('calendarEntityList') || ['Meeting', 'Task', 'Case'];
            this.scopeList = this.scopeList.filter(function (scope) {
                return this.getAcl().check(scope);
            }, this);

            if (!this.scopeList.includes('Case') && this.getAcl().check('Case')) {
                this.scopeList.push('Case');
            }

            if (this.header) {
                this.enabledScopeList = this.getStoredEnabledScopeList() || Espo.Utils.clone(this.scopeList);
            } else {
                this.enabledScopeList = this.options.enabledScopeList || Espo.Utils.clone(this.scopeList);
            }

            this.colors.Case = this.colors.Case || '#1d8a6e';
            this.colors.CaseMore = '#7f8c8d';
            this.colors.Meeting = this.colors.Meeting || '#558BBD';
            this.colors.Task = this.colors.Task || '#76BAED';

            this._dayEventsByDate = {};
            this._recordModal = new RecordModalHelper();

            ['isMoreLink', 'moreDate', 'caseEventType'].forEach(function (prop) {
                if (this.extendedProps.indexOf(prop) < 0) {
                    this.extendedProps.push(prop);
                }
            }, this);
        },

        getEventDateKey: function (event) {
            if (event.dateStartDate) {
                return event.dateStartDate;
            }

            if (event.dateStart) {
                return String(event.dateStart).substring(0, 10);
            }

            return '';
        },

        isTimedEvent: function (event) {
            if (!event || !event.dateStart) {
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

        applyDayEventLimit: function (events) {
            var self = this;
            var byDate = {};

            events.forEach(function (event) {
                var dateKey = self.getEventDateKey(event);

                if (!dateKey) {
                    return;
                }

                if (!byDate[dateKey]) {
                    byDate[dateKey] = [];
                }

                byDate[dateKey].push(event);
            });

            var limited = [];
            this._dayEventsByDate = {};

            Object.keys(byDate).sort().forEach(function (dateKey) {
                var list = byDate[dateKey].slice().sort(function (a, b) {
                    return self.compareEvents(a, b);
                });

                self._dayEventsByDate[dateKey] = list;

                if (list.length <= MAX_EVENTS_PER_DAY) {
                    limited = limited.concat(list);

                    return;
                }

                var timed = [];
                var allDay = [];

                list.forEach(function (event) {
                    if (self.isTimedEvent(event)) {
                        timed.push(event);
                    } else {
                        allDay.push(event);
                    }
                });

                var visibleAllDayCount = Math.max(0, MAX_EVENTS_PER_DAY - timed.length);
                var visible = timed.concat(allDay.slice(0, visibleAllDayCount));
                var hiddenCount = list.length - visible.length;

                limited = limited.concat(visible);

                if (hiddenCount <= 0) {
                    return;
                }

                limited.push({
                    scope: 'CaseMore',
                    uid: 'more-' + dateKey,
                    recordId: null,
                    id: 'more-' + dateKey,
                    name: '+' + hiddenCount + ' más · Ver día',
                    dateStartDate: dateKey,
                    dateEndDate: dateKey,
                    color: self.colors.CaseMore,
                    isMoreLink: true,
                    moreDate: dateKey,
                });
            });

            return limited;
        },

        convertToFcEvent: function (event) {
            if (event.isMoreLink) {
                var moreEvent = Dep.prototype.convertToFcEvent.call(this, {
                    scope: 'CaseMore',
                    id: 'more-' + event.moreDate,
                    name: event.name,
                    dateStartDate: event.dateStartDate,
                    dateEndDate: event.dateEndDate,
                    color: event.color || this.colors.CaseMore,
                });

                moreEvent.id = 'CaseMore-more-' + event.moreDate;
                moreEvent.recordId = null;
                moreEvent.isMoreLink = true;
                moreEvent.moreDate = event.moreDate;
                moreEvent.editable = false;
                moreEvent.className = ['calendar-more-link'];

                return moreEvent;
            }

            var fcEvent = Dep.prototype.convertToFcEvent.call(this, event);
            var uniqueId = event.uid || event.id;

            fcEvent.id = event.scope + '-' + uniqueId;
            fcEvent.recordId = event.recordId || event.id;

            if (event.caseEventType) {
                fcEvent.caseEventType = event.caseEventType;
            }

            return fcEvent;
        },

        fetchEvents: function (from, to, callback) {
            var self = this;
            var activityScopes = this.enabledScopeList.filter(function (scope) {
                return scope !== 'Case' && scope !== 'CaseMore';
            });

            var url = 'Activities?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);

            if (this.options.userId) {
                url += '&userId=' + encodeURIComponent(this.options.userId);
            }

            url += '&scopeList=' + encodeURIComponent(activityScopes.join(','));

            if (this.teamIdList && this.teamIdList.length) {
                url += '&teamIdList=' + encodeURIComponent(this.teamIdList.join(','));
            }

            var agenda = this.mode === 'agendaWeek' || this.mode === 'agendaDay';

            url += '&agenda=' + encodeURIComponent(String(agenda));

            var requests = [Espo.Ajax.getRequest(url)];

            if (this.getAcl().check('Case') && this.enabledScopeList.indexOf('Case') >= 0) {
                requests.push(Espo.Ajax.getRequest(
                    'Case/action/calendarEvents?from=' + encodeURIComponent(from) +
                    '&to=' + encodeURIComponent(to)
                ));
            }

            if (!this.suppressLoadingAlert) {
                Espo.Ui.notifyWait();
            }

            Promise.all(requests).then(function (results) {
                var merged = (results[0] || []).concat(results[1] || []);
                var limited = self.applyDayEventLimit(merged);

                callback(self.convertToFcEvents(limited));
                Espo.Ui.notify(false);
                self.fetching = true;

                setTimeout(function () {
                    self.fetching = false;
                }, 50);
            }).catch(function () {
                Espo.Ui.notify(false);
            });

            this.suppressLoadingAlert = false;
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            var self = this;

            setTimeout(function () {
                self.bindCalendarInteractions();
            }, 200);
        },

        bindCalendarInteractions: function () {
            if (!this.calendar) {
                return;
            }

            var self = this;

            this.calendar.setOption('eventClick', function (info) {
                self.handleCalendarEventClick(info);
            });

            this.calendar.setOption('eventAllow', function (dropInfo, draggedEvent) {
                var scope = draggedEvent.extendedProps.scope;

                if (scope === 'Case' || scope === 'CaseMore') {
                    return false;
                }

                if (draggedEvent.extendedProps.isMoreLink) {
                    return false;
                }

                return true;
            });
        },

        handleCalendarEventClick: async function (info) {
            var props = info.event.extendedProps || {};
            var eventId = String(info.event.id || '');

            if (
                props.isMoreLink
                || props.scope === 'CaseMore'
                || eventId.indexOf('CaseMore-more-') === 0
            ) {
                this.showDayEventsModal(
                    props.moreDate
                    || (eventId.indexOf('CaseMore-more-') === 0 ? eventId.slice('CaseMore-more-'.length) : '')
                    || this.getEventDateKey(props)
                );

                return;
            }

            var scope = props.scope;
            var recordId = props.recordId;

            if (!scope || !recordId) {
                return;
            }

            var modal = this._recordModal;
            var panel = null;

            panel = await modal.showDetail(this, {
                entityType: scope,
                id: recordId,
                removeDisabled: scope === 'Case',
                beforeSave: () => {
                    if (this.options.onSave) {
                        this.options.onSave();
                    }
                },
                beforeDestroy: () => {
                    if (this.options.onSave) {
                        this.options.onSave();
                    }
                },
                afterSave: (model, options) => {
                    if (!options.bypassClose && panel) {
                        panel.close();
                    }

                    this.actionRefresh({suppressLoadingAlert: true});
                },
                afterDestroy: () => {
                    this.actionRefresh({suppressLoadingAlert: true});
                },
            });
        },

        showDayEventsModal: async function (dateKey) {
            if (!dateKey) {
                return;
            }

            var events = this._dayEventsByDate[dateKey] || [];

            if (!events.length) {
                Espo.Ui.warning(this.translate('dayEventsEmpty', 'labels', 'Calendar'));

                return;
            }

            Espo.Ui.notifyWait();

            var view = await this.createView('dayEventsDialog', 'custom:views/calendar/modals/day-events', {
                date: dateKey,
                events: events,
            });

            this.listenToOnce(view, 'open-record', function (data) {
                view.close();

                this.handleOpenRecordFromDayModal(data.scope, data.recordId);
            });

            await view.render();

            Espo.Ui.notify(false);
        },

        handleOpenRecordFromDayModal: async function (scope, recordId) {
            if (!scope || !recordId) {
                return;
            }

            await this._recordModal.showDetail(this, {
                entityType: scope,
                id: recordId,
                removeDisabled: scope === 'Case',
                afterSave: () => {
                    this.actionRefresh({suppressLoadingAlert: true});
                },
                afterDestroy: () => {
                    this.actionRefresh({suppressLoadingAlert: true});
                },
            });
        },

        createEvent: async function (values) {
            values = values || {};

            if (
                !values.dateStart &&
                this.date !== this.getDateTime().getToday() &&
                (this.mode === 'day' || this.mode === 'agendaDay')
            ) {
                values.allDay = true;
                values.dateStartDate = this.date;
                values.dateEndDate = this.date;
            }

            var attributes = {};

            if (this.options.userId) {
                attributes.assignedUserId = this.options.userId;
                attributes.assignedUserName = this.options.userName || this.options.userId;
            }

            var scopeList = this.enabledScopeList.filter(function (scope) {
                return scope !== 'Case' && scope !== 'CaseMore';
            });

            if (!scopeList.length) {
                scopeList = ['Meeting', 'Task'];
            }

            Espo.Ui.notifyWait();

            var view = await this.createView('dialog', 'custom:views/calendar/modals/edit', {
                attributes: attributes,
                enabledScopeList: scopeList,
                scopeList: scopeList,
                scope: scopeList[0],
                allDay: values.allDay,
                dateStartDate: values.dateStartDate,
                dateEndDate: values.dateEndDate,
                dateStart: values.dateStart,
                dateEnd: values.dateEnd,
            });

            var added = false;

            this.listenTo(view, 'before:save', function () {
                if (this.options.onSave) {
                    this.options.onSave();
                }
            }.bind(this));

            this.listenTo(view, 'after:save', function (model) {
                if (!added) {
                    this.addModel(model);
                    added = true;

                    return;
                }

                this.updateModel(model);
            }.bind(this));

            await view.render();

            Espo.Ui.notify();
        },
    });
});
