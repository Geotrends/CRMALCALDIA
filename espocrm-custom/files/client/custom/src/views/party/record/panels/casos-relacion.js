define('custom:views/party/record/panels/casos-relacion', ['views/record/panels/relationship'], function (Dep) {

    var PAGE_SIZE = 5;

    return Dep.extend({

        setup: function () {
            this.recordsPerPage = PAGE_SIZE;

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

            if (this.buttonList) {
                this.buttonList = [];
            }

            if (this.actionList) {
                this.actionList = this.actionList.filter(function (item) {
                    if (!item || item === false) {
                        return true;
                    }

                    var action = item.action || item.name || '';

                    return action !== 'createRelated' && action !== 'selectRelated';
                });
            }
        },
    });
});
