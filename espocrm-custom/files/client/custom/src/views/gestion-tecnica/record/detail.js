define('custom:views/gestion-tecnica/record/detail', ['views/record/detail'], function (Dep) {

    // La historia va en el panel lateral (clientDefs.sidePanels), no en el inferior.
    return Dep.extend({

        bottomView: 'custom:views/gestion-tecnica/record/bottom',
    });
});
