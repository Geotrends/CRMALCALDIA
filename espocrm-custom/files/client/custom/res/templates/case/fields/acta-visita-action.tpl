{{#if showPanel}}
{{#if showVisitaCheck}}
<div class="case-visita-realizada-check form-group">
    <label class="case-visita-realizada-check-label">
        <input
            type="checkbox"
            class="case-visita-realizada-checkbox"
            data-action="confirmarVisita"
            {{#if visitaHabilitada}}checked{{/if}}
            {{#if visitaCheckDisabled}}disabled{{/if}}
        />
        <span>{{visitaCheckLabel}}</span>
    </label>
    <p class="text-muted small case-visita-visita-check-help">{{visitaCheckHelp}}</p>
</div>
{{/if}}
{{#if showActions}}
<p class="text-muted small case-acta-visita-help">{{helpText}}</p>
<div class="btn-group-vertical w-100 case-acta-visita-actions">
    <button
        type="button"
        class="btn btn-primary btn-sm case-acta-visita-btn"
        data-action="llenarActa"
        {{#unless actionsEnabled}}disabled{{/unless}}
    >
        <span class="fas fa-laptop"></span> {{buttonLabelDigital}}
    </button>
    <button
        type="button"
        class="btn btn-default btn-sm case-acta-visita-btn"
        data-action="imprimirActaManual"
        {{#unless actionsEnabled}}disabled{{/unless}}
    >
        <span class="fas fa-print"></span> {{buttonLabelManual}}
    </button>
</div>
{{/if}}
{{/if}}
