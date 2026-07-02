define('custom:views/party/record/panels/casos-relacion', ['views/record/panels/relationship'], function (Dep) {

    return Dep.extend({

        setup: function () {
            this.recordsPerPage = 5;

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
    });
});
