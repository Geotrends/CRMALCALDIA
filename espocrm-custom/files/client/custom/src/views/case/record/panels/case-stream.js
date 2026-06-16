define('custom:views/case/record/panels/case-stream', ['views/stream/panel'], function (Dep) {

    return Dep.extend({

        setup: function () {
            const self = this;

            setTimeout(function () {
                Dep.prototype.setup.call(self);
            }, 200);
        },
    });
});
