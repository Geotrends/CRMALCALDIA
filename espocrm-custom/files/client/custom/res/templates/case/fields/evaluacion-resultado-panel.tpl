{{#if showPanel}}
<div class="case-evaluaciones-resultado">
    {{#each evaluaciones}}
    <div class="case-visita-archivo-card{{#if isCurrent}} is-current{{/if}}{{#if completada}} is-completed{{/if}}" data-id="{{id}}">
        <p class="case-visita-archivo-heading">
            <strong>{{name}}</strong>
            <span class="case-visita-archivo-estado">{{estadoLabel}}</span>
        </p>
        <p class="case-visita-archivo-fecha">{{cuando}} · {{responsableName}}</p>
        {{#if completada}}
        <dl class="case-evaluacion-resumen">
            <div class="case-evaluacion-resumen__resultado"><dt>Resultado técnico</dt><dd>{{resultadoTecnico}}</dd></div>
            <div><dt>Información suficiente</dt><dd>{{informacionSuficiente}}</dd></div>
            <div><dt>Situación resuelta</dt><dd>{{situacionResuelta}}</dd></div>
            {{#if observaciones}}<div class="case-evaluacion-resumen__observaciones"><dt>Observaciones</dt><dd>{{observaciones}}</dd></div>{{/if}}
        </dl>
        {{else}}
        <p class="case-evaluacion-help text-muted">Pendiente de completar por {{responsableName}}.</p>
        {{/if}}
        {{#if canCompletar}}
        <div class="case-visita-archivo-actions">
            <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="completarEvaluacion" data-id="{{id}}">
                <span class="fas fa-pen"></span> Completar evaluación
            </button>
        </div>
        {{/if}}
    </div>
    {{/each}}
    {{#if puedeRegistrar}}
    {{#if sinEvaluaciones}}
    <p class="text-muted small case-evaluacion-help">La evaluación se crea sola al terminar las visitas. Si no existe, puede registrarla aquí.</p>
    {{/if}}
    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="registrarEvaluacion">
        <span class="fas fa-clipboard-check"></span> Registrar evaluación de resultado
    </button>
    {{/if}}
</div>
{{/if}}
