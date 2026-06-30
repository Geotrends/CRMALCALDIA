define('custom:views/case/record/detail', [
    'views/record/detail',
    'custom:helpers/persona-tipo-fields',
    'custom:helpers/inspeccion-case-flow',
    'custom:helpers/radicacion-case-flow',
    'custom:helpers/asignador-case-flow',
], function (Dep, PersonaTipoFields, InspeccionCaseFlow, RadicacionCaseFlow, AsignadorCaseFlow) {

    return Dep.extend({

        bottomDisabled: true,

        setup: function () {
            Dep.prototype.setup.call(this);

            PersonaTipoFields.setup(this);
            InspeccionCaseFlow.setup(this);
            RadicacionCaseFlow.setup(this);
            AsignadorCaseFlow.setup(this);
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            AsignadorCaseFlow.schedule(this);
            InspeccionCaseFlow.schedule(this);
            RadicacionCaseFlow.schedule(this);
        },

        prepareModelForSave: function () {
            InspeccionCaseFlow.prepareModelForSave(this);
            RadicacionCaseFlow.prepareModelForSave(this);
            AsignadorCaseFlow.prepareModelForSave(this);

            Dep.prototype.prepareModelForSave.apply(this, arguments);
        },
    });
});
