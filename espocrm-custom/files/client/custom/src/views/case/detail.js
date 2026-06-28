define('custom:views/case/detail', [
    'views/detail',
    'custom:helpers/case-radicado-label',
], function (Dep, CaseRadicadoLabel) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.nameAttribute = 'cNumeroRadicado';

            this.listenTo(this.model, 'change:cNumeroRadicado sync', function () {
                var header = this.getHeaderView && this.getHeaderView();

                if (header) {
                    header.reRender();
                }

                this.updatePageTitle();
            });
        },

        actionRadicarCaso: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.dispatchRadicarCase === 'function') {
                record.dispatchRadicarCase();

                return;
            }

            if (record && typeof record.actionRadicarCaso === 'function') {
                record.actionRadicarCaso();
            }
        },

        actionEdit: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.actionEdit === 'function') {
                record.actionEdit();

                return;
            }

            Dep.prototype.actionEdit.call(this);
        },

        actionSaveAsignacion: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.actionSaveAsignacion === 'function') {
                record.actionSaveAsignacion();
            }
        },

        actionCancelAsignacion: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.actionCancelAsignacion === 'function') {
                record.actionCancelAsignacion();
            }
        },

        actionLlenarActaVisita: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.actionLlenarActaVisita === 'function') {
                record.actionLlenarActaVisita();
            }
        },

        actionImprimirActaManual: function () {
            var record = typeof this.getRecordView === 'function' ? this.getRecordView() : null;

            if (record && typeof record.actionImprimirActaManual === 'function') {
                record.actionImprimirActaManual();
            }
        },

        getCaseTitle: function () {
            return CaseRadicadoLabel.getLabel(this.model);
        },

        getHeader: function () {
            var title = this.getCaseTitle();
            var titleEl = document.createElement('span');

            titleEl.classList.add('font-size-flexible', 'title');
            titleEl.textContent = title;

            if (this.model.attributes.deleted) {
                titleEl.style.textDecoration = 'line-through';
            }

            if (this.getRecordMode && this.getRecordMode() === 'detail') {
                titleEl.title = this.translate('clickToRefresh', 'messages');
                titleEl.dataset.action = 'fullRefresh';
                titleEl.style.cursor = 'pointer';
            }

            var scopeLabel = this.getLanguage().translate(this.scope, 'scopeNamesPlural');
            var scopeEl = document.createElement('span');

            scopeEl.textContent = scopeLabel;
            scopeEl.style.userSelect = 'none';

            if (!this.rootLinkDisabled) {
                var link = document.createElement('a');

                link.href = this.rootUrl;
                link.classList.add('action');
                link.dataset.action = 'navigateToRoot';
                link.textContent = scopeLabel;

                scopeEl = document.createElement('span');
                scopeEl.style.userSelect = 'none';
                scopeEl.appendChild(link);
            }

            var icon = this.getHeaderIconHtml();

            if (icon) {
                scopeEl.insertAdjacentHTML('afterbegin', icon);
            }

            return this.buildHeaderHtml([scopeEl, titleEl]);
        },

        updatePageTitle: function () {
            this.setPageTitle(this.getCaseTitle());
        },
    });
});
