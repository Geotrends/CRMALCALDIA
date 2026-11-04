define('custom:views/intervencion-tecnica/record/detail-small', ['views/record/detail-small'], function (Dep) {
    return Dep.extend({
        isWide: true,
        sideDisabled: true,
        bottomDisabled: true,
        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.$el.find('.record-grid > .side').remove();
        },
    });
});
