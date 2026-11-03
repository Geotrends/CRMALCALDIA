define('custom:views/gestion-tecnica/record/bottom', ['views/record/detail-bottom'], function (Dep) {

    return Dep.extend({

        setup: function () {
            this.streamPanel = false;

            Dep.prototype.setup.call(this);
        },
    });
});
