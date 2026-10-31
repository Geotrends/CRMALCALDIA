{{#if showPanel}}
<div class="case-evaluaciones-resultado">
    {{#each evaluaciones}}
    <div class="case-visita-archivo-card{{#if isCurrent}} is-current{{/if}}" data-id="{{id}}">
        <p class="case-visita-archivo-heading">
            <strong><a href="#EvaluacionResultado/view/{{id}}">{{name}}</a></strong>
            <span class="case-visita-archivo-estado">{{estadoLabel}}</span>
        </p>
        <p class="case-visita-archivo-fecha">{{cuando}} · {{responsableName}}</p>
        {{#if canCompletar}}
        <div class="case-visita-archivo-actions">
            <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="completarEvaluacion" data-id="{{id}}">
                <span class="fas fa-pen"></span> Completar evaluación de resultado
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
