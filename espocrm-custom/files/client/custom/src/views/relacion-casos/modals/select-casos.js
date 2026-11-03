define('custom:views/relacion-casos/modals/select-casos', [
    'views/modals/select-records',
], function (Dep) {

    // REL-004: los casos ya asociados a la relación (ids del campo que abre el modal) se
    // muestran marcados; al confirmar, los que el usuario desmarca se quitan del campo.
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.linkedField = null;
            this.linkedIds = [];
            this.shownLinkedIds = [];
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            // La vista padre (el campo) solo está disponible después de setup.
            if (!this.linkedField) {
                const field = this.getParentView();

                this.linkedField = field && Array.isArray(field.ids) ? field : null;
                this.linkedIds = this.linkedField ? this.linkedField.ids.slice() : [];
            }

            const list = this.getRecordView();

            if (!list || !this.linkedIds.length) {
                return;
            }

            this.listenTo(list, 'after:render', () => this.checkLinked(list));
            this.listenTo(list, 'check', () => this.enableButton('select'));
            this.checkLinked(list);
        },

        checkLinked: function (list) {
            this.linkedIds.forEach(id => {
                if (this.shownLinkedIds.includes(id) || !this.collection.get(id)) {
                    return;
                }

                this.shownLinkedIds.push(id);
                list.checkRecord(id, true);
            });

            // Con casos ya asociados se puede confirmar aunque se desmarquen todos.
            this.enableButton('select');
        },

        actionSelect: function () {
            const list = this.getRecordView();

            if (this.linkedField && list && !list.allResultIsChecked) {
                this.shownLinkedIds
                    .filter(id => !list.checkedList.includes(id))
                    .forEach(id => this.linkedField.deleteLink(id));
            }

            Dep.prototype.actionSelect.call(this);
        },
    });
});
