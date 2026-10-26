define('custom:views/relacion-casos/fields/casos', [
    'views/fields/link-multiple',
], function (Dep) {

    // REL-004: el selector de casos abre con los casos ya asociados marcados.
    return Dep.extend({

        selectRecordsView: 'custom:views/relacion-casos/modals/select-casos',
    });
});
