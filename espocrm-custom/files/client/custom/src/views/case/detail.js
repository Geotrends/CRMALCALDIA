define('custom:views/case/detail', [
    'views/detail',
    'custom:helpers/case-radicado-label',
    'custom:helpers/safe-ui-promise',
], function (Dep, CaseRadicadoLabel, SafeUiPromise) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.nameAttribute = 'cNumeroRadicado';

            this.listenTo(this.model, 'change:cNumeroRadicado sync', function () {
                var header = this.getHeaderView && this.getHeaderView();

                if (header && typeof header.reRender === 'function') {
                    SafeUiPromise.safeReRender(header);
                }

                this.updatePageTitle();
            });
        },

        getCaseTitle: function () {
            return CaseRadicadoLabel.getLabel(this.model);
        },

        getHeader: function () {
            var scopeLabel = this.getLanguage().translate(this.scope, 'scopeNamesPlural');
            var scopeEl = document.createElement('span');

            scopeEl.textContent = scopeLabel;
            scopeEl.style.userSelect = 'none';

            if (!this.options.noHeaderLinks && !this.rootLinkDisabled) {
                var rootLink = document.createElement('a');

                rootLink.href = this.rootUrl;
                rootLink.classList.add('action');
                rootLink.dataset.action = 'navigateToRoot';
                rootLink.textContent = scopeLabel;

                scopeEl = document.createElement('span');
                scopeEl.style.userSelect = 'none';
                scopeEl.appendChild(rootLink);
            }

            var icon = this.getHeaderIconHtml();

            if (icon) {
                scopeEl.insertAdjacentHTML('afterbegin', icon);
            }

            var title = this.getCaseTitle();
            var titleEl = document.createElement('span');

            titleEl.textContent = title;

            return this.buildHeaderHtml([scopeEl, titleEl]);
        },

        updatePageTitle: function () {
            this.setPageTitle(this.getCaseTitle());
        },
    });
});
