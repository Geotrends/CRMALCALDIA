define('custom:views/party/record/panels/casos-relacion', ['views/record/panels/relationship'], function (Dep) {

    var PAGE_SIZE = 5;
    var DEBOUNCE_MS = 350;

    return Dep.extend({

        template: 'custom:party/record/panels/casos-relacion',

        setup: function () {
            this.recordsPerPage = PAGE_SIZE;
            this._partyCasosSearchText = '';

            var self = this;
            var originalCreateView = this.createView;

            this.createView = function (name, view, options, callback) {
                if (name === 'list') {
                    options = options || {};
                    options.displayTotalCount = true;
                    options.pagination = true;
                    options.showMore = false;
                }

                return originalCreateView.call(self, name, view, options, callback);
            };

            Dep.prototype.setup.call(this);

            this.defs.create = false;
            this.defs.select = false;
            this.defs.view = false;

            if (this.actionList) {
                this.actionList = [];
            }

            if (this.buttonList) {
                this.buttonList = [];
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.apply(this, arguments);
            this.bindCasosSearch();
        },

        bindCasosSearch: function () {
            var self = this;
            var $input = this.$el.find('[data-action="partyCasosSearch"]');

            if (!$input.length) {
                return;
            }

            $input.val(this._partyCasosSearchText);

            $input.off('.partyCasosSearch').on('input.partyCasosSearch', function () {
                clearTimeout(self._partyCasosSearchTimer);
                self._partyCasosSearchTimer = setTimeout(function () {
                    self.applyCasosSearch($input.val());
                }, DEBOUNCE_MS);
            });

            $input.on('keydown.partyCasosSearch', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(self._partyCasosSearchTimer);
                    self.applyCasosSearch($input.val());
                }
            });
        },

        applyCasosSearch: function (text) {
            if (!this.collection) {
                return;
            }

            var normalized = String(text || '').trim();

            if (normalized === this._partyCasosSearchText) {
                return;
            }

            this._partyCasosSearchText = normalized;
            this.collection.data = this.collection.data || {};

            if (normalized) {
                this.collection.data.textFilter = normalized;
            } else {
                delete this.collection.data.textFilter;
            }

            this.collection.offset = 0;
            this.collection.fetch({reset: true});
        },
    });
});
