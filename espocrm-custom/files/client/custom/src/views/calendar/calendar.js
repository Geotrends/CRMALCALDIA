define('custom:views/calendar/calendar', ['crm:views/calendar/calendar'], function (Dep) {

    return Dep.extend({

        scopeList: ['Meeting'],

        setup: function () {
            Dep.prototype.setup.call(this);

            this.scopeList = ['Meeting'];
            this.enabledScopeList = ['Meeting'];
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

            var scopeList = ['Meeting'];

            Espo.Ui.notifyWait();

            var view = await this.createView('dialog', 'custom:views/calendar/modals/edit', {
                attributes: attributes,
                enabledScopeList: scopeList,
                scopeList: scopeList,
                scope: 'Meeting',
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
