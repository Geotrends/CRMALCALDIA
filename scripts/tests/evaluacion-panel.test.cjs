const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
let methods;
let opened;
class RecordModal {
    showEdit(host, options) { opened = options; return Promise.resolve(); }
}
runInNewContext(readFileSync(resolve(__dirname, '../../espocrm-custom/files/client/custom/src/views/case/fields/evaluacion-resultado-panel.js'), 'utf8'), {
    define: (_name, _deps, factory) => { methods = factory({extend: value => value}, RecordModal); },
});
function view(evaluation) {
    return {...methods, estado: {puedeVerEvaluaciones: true, evaluaciones: [evaluation]},
        getLanguage: () => ({translateOption: x => x}), getDateTime: () => ({toDisplayDate: x => x}),
    };
}
test('una evaluación pendiente permite completarla en modal solo si el usuario puede editarla', () => {
    const current = view({id: 'eval', completada: false, puedeEditar: true});
    assert.equal(current.data().evaluaciones[0].canCompletar, true);
    current.actionCompletarEvaluacion('eval');
    assert.equal(opened.entityType, 'EvaluacionResultado');
    assert.equal(opened.id, 'eval');
    assert.equal(opened.layoutName, 'edit');
    assert.equal(opened.fullFormDisabled, true);
    assert.equal(view({completada: false, puedeEditar: false}).data().evaluaciones[0].canCompletar, false);
});
test('una evaluación completada presenta resultado, respuestas y observaciones en lugar del botón', () => {
    const summary = view({completada: true, puedeEditar: true, resultadoTecnico: 'Resultado de la visita', informacionSuficiente: true, situacionResuelta: false, observaciones: 'Seguimiento registrado'}).data().evaluaciones[0];
    assert.equal(summary.canCompletar, false);
    assert.equal(summary.completada, true);
    assert.equal(summary.resultadoTecnico, 'Resultado de la visita');
    assert.equal(summary.informacionSuficiente, 'Sí');
    assert.equal(summary.situacionResuelta, 'No');
    assert.equal(summary.observaciones, 'Seguimiento registrado');
});
test('los valores ausentes en datos históricos no se presentan como respuestas negativas', () => {
    const summary = view({completada: true}).data().evaluaciones[0];
    assert.equal(summary.informacionSuficiente, 'Sin registrar');
    assert.equal(summary.situacionResuelta, 'Sin registrar');
    assert.equal(summary.resultadoTecnico, 'Sin resultado técnico registrado.');
});
