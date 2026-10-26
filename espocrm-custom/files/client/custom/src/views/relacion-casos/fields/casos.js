define('custom:views/relacion-casos/fields/casos', [
    'views/fields/link-multiple',
], function (Dep) {

    // REL-004: el selector de casos abre con los casos ya asociados marcados.
    // REL-013: cada caso se muestra como "radicado · nombre · estado" para identificarlo.
    return Dep.extend({

        selectRecordsView: 'custom:views/relacion-casos/modals/select-casos',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.casosInfo = {};

            if (!this.isDetailMode() && !this.isEditMode()) {
                return;
            }

            this.wait(this.loadCasosInfo(this.model.get(this.idsName) || []));

            this.listenTo(this, 'add-link', id => {
                this.loadCasosInfo([id]).then(() => {
                    this.$el.find('.link-' + id + ' .text').text(this.getCasoLabel(id));
                });
            });
        },

        loadCasosInfo: function (ids) {
            const missing = ids.filter(id => !this.casosInfo[id]);

            if (!missing.length) {
                return Promise.resolve();
            }

            return Espo.Ajax.getRequest('Case', {
                select: 'id,name,cNumeroRadicado,status',
                where: [{type: 'in', attribute: 'id', value: missing}],
                maxSize: missing.length,
            }).then(response => {
                (response.list || []).forEach(item => {
                    this.casosInfo[item.id] = item;
                });
            }).catch(() => {});
        },

        getCasoLabel: function (id, name) {
            const info = this.casosInfo[id];
            const fallback = name || (this.nameHash || {})[id] || id;

            if (!info) {
                return fallback;
            }

            const estado = info.status
                ? this.getLanguage().translateOption(info.status, 'status', 'Case')
                : '';

            return [info.cNumeroRadicado || 'Sin radicar', info.name || fallback, estado]
                .filter(Boolean)
                .join(' · ');
        },

        getDetailLinkHtml: function (id, name) {
            return Dep.prototype.getDetailLinkHtml.call(this, id, this.getCasoLabel(id, name));
        },

        prepareEditItemElement: function (id, name) {
            return Dep.prototype.prepareEditItemElement.call(this, id, this.getCasoLabel(id, name));
        },
    });
});
