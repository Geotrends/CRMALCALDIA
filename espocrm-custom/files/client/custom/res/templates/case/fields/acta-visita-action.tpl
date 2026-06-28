{{#if showPanel}}
<p class="text-muted small case-acta-visita-help">{{helpText}}</p>
<div class="btn-group-vertical w-100 case-acta-visita-actions">
    {{#if showLlenarActa}}
    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="llenarActa">
        <span class="fas fa-laptop"></span> {{buttonLabelDigital}}
    </button>
    {{/if}}
    {{#if showPrintManual}}
    <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="imprimirActaManual">
        <span class="fas fa-print"></span> {{buttonLabelManual}}
    </button>
    {{/if}}
</div>
{{/if}}
