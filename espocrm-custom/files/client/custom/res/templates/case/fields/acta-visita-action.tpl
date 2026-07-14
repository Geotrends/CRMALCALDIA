{{#if showPanel}}
{{#if showVisitasArchivo}}
<p class="case-visitas-archivo-title">{{visitasArchivoTitle}}</p>
{{/if}}
{{#each visitasArchivo}}
<div class="case-visita-archivo-card{{#if isCurrent}} is-current{{/if}}" data-acta-id="{{actaId}}">
    <p class="case-visita-archivo-heading">
        <strong>{{../visitaLabel}} {{numeroVisita}}</strong>
        <span class="case-visita-archivo-estado">{{estadoLabel}}</span>
    </p>
    {{#if isAprobada}}
    <div class="case-visita-aprobada-check is-readonly">
        <label class="case-visita-aprobada-check-label">
            <input
                type="checkbox"
                class="case-visita-aprobada-checkbox"
                checked
                disabled
            />
            <span>{{../visitaAprobadaLabel}}</span>
        </label>
        <p class="text-muted small case-visita-aprobada-help">{{../visitaAprobadaArchivoHelp}}</p>
    </div>
    {{else}}
        {{#if canApproveThis}}
        <div class="case-visita-aprobada-check form-group">
            <p class="text-muted small case-visita-aprobada-help">{{../visitaAprobadaHelp}}</p>
            <button
                type="button"
                class="btn btn-success btn-sm case-acta-visita-btn case-aprobar-visita-btn"
                data-action="aprobarVisitaActa"
                data-acta-id="{{actaId}}"
            >
                <span class="fas fa-check"></span> {{../visitaAprobarButtonLabel}}
            </button>
        </div>
        {{/if}}
    {{/if}}
    <p class="text-muted small case-visita-archivo-help">{{archivoHelp}}</p>
    <div class="btn-group-vertical w-100 case-visita-archivo-actions">
        <button
            type="button"
            class="btn btn-primary btn-sm case-acta-visita-btn"
            data-action="editarActaArchivo"
            data-acta-id="{{actaId}}"
        >
            <span class="fas fa-laptop"></span> {{../buttonLabelEditarActa}}
        </button>
        <button
            type="button"
            class="btn btn-default btn-sm case-acta-visita-btn"
            data-action="imprimirActaArchivo"
            data-acta-id="{{actaId}}"
        >
            <span class="fas fa-print"></span> {{../buttonLabelManual}}
        </button>
    </div>
</div>
{{/each}}
{{#if showAgregarVisitaArchivo}}
<div class="case-agregar-visita-section">
    <p class="text-muted small case-agregar-visita-help">{{agregarVisitaHelp}}</p>
    <button
        type="button"
        class="btn btn-default btn-sm case-acta-visita-btn"
        data-action="agregarVisita"
        {{#unless agregarVisitaEnabled}}disabled{{/unless}}
    >
        <span class="fas fa-plus"></span> {{buttonLabelAgregarVisita}}
    </button>
</div>
{{/if}}
{{#if showCurrentVisitaSection}}
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
{{#if showVisitaAprobacion}}
<div class="case-visita-aprobada-check form-group case-visita-aprobada-check-current">
    {{#if visitaAprobada}}
    <label class="case-visita-aprobada-check-label">
        <input
            type="checkbox"
            class="case-visita-aprobada-checkbox"
            data-action="aprobarVisita"
            checked
            {{#if visitaAprobadaDisabled}}disabled{{/if}}
        />
        <span>{{visitaAprobadaLabel}}</span>
    </label>
    <p class="text-muted small case-visita-aprobada-help">{{visitaAprobadaHelp}}</p>
    {{else}}
    <p class="text-muted small case-visita-aprobada-help">{{visitaAprobadaHelp}}</p>
    <button
        type="button"
        class="btn btn-success btn-sm case-acta-visita-btn case-aprobar-visita-btn"
        data-action="aprobarVisitaActa"
    >
        <span class="fas fa-check"></span> {{visitaAprobarButtonLabel}}
    </button>
    {{/if}}
</div>
{{/if}}
{{#if showActaButtons}}
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
{{/if}}
