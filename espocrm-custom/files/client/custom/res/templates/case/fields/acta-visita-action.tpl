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
        {{#if canConsultar}}
        <button
            type="button"
            class="btn btn-default btn-sm case-acta-visita-btn"
            data-action="consultarActa"
            data-acta-id="{{actaId}}"
        >
            <span class="fas fa-file-lines"></span> {{../buttonLabelConsultarActa}}
        </button>
        {{/if}}
        <button
            type="button"
            class="btn btn-primary btn-sm case-acta-visita-btn"
            data-action="editarActaArchivo"
            data-acta-id="{{actaId}}"
        >
            <span class="fas fa-laptop"></span> {{../buttonLabelEditarActa}}
        </button>
    </div>
    {{#if hasRevision}}
    <div class="case-visita-decision-summary" data-acta-id="{{actaId}}">
        <div class="case-visita-decision-summary__head">
            <strong>Revisión técnico-jurídica</strong>
            {{#if canEditRevision}}
            <button type="button" class="btn btn-link btn-xs" data-action="editarRevisionActa" data-acta-id="{{actaId}}">
                <span class="fas fa-pen"></span> Editar revisión
            </button>
            {{/if}}
        </div>
        <dl>
            <div><dt>Decisión</dt><dd>{{decisionTramite}}</dd></div>
            {{#if revisadoPor}}<div><dt>Registrada por</dt><dd>{{revisadoPor}}</dd></div>{{/if}}
            {{#if fechaRevision}}<div><dt>Fecha de revisión</dt><dd>{{fechaRevision}}</dd></div>{{/if}}
            {{#if entidadRemision}}<div><dt>Entidad competente</dt><dd>{{entidadRemision}}</dd></div>{{/if}}
            {{#if motivacionRevision}}<div class="case-visita-decision-motivo"><dt>Motivación</dt><dd>{{motivacionRevision}}</dd></div>{{/if}}
        </dl>
        {{#if canEditRevision}}
        <div class="case-visita-revision-edit hidden">
            <p class="text-muted small">La definición «{{decisionTramite}}» ya se ejecutó y no se cambia aquí; para otro trámite, defínalo en la visita en curso. Puede corregir {{#if esRemision}}la entidad y {{/if}}la motivación.</p>
            {{#if esRemision}}
            <label>Entidad competente</label>
            <input type="text" class="form-control js-revision-entidad" value="{{entidadRemision}}">
            {{/if}}
            <label>Motivación de la revisión</label>
            <textarea class="form-control js-revision-motivo" rows="3">{{motivacionRevision}}</textarea>
            <div class="case-visita-revision-edit__actions">
                <button type="button" class="btn btn-primary btn-sm" data-action="guardarRevisionActa" data-acta-id="{{actaId}}">Guardar cambios</button>
                <button type="button" class="btn btn-default btn-sm" data-action="cancelarRevisionActa">Cancelar</button>
            </div>
        </div>
        {{/if}}
    </div>
    {{/if}}
</div>
{{/each}}
{{#if wordDownloadEnabled}}
<div class="case-acta-word-section">
    <button
        type="button"
        class="btn btn-default btn-sm case-acta-visita-btn"
        data-action="descargarActaWord"
    >
        <span class="fas fa-file-word"></span> {{buttonLabelWord}}
    </button>
</div>
{{/if}}
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
        class="btn btn-primary btn-sm case-acta-visita-btn case-acta-cargar-btn"
        data-action="llenarActa"
        {{#unless actionsEnabled}}disabled{{/unless}}
    >
        <span class="fas fa-upload"></span> {{buttonLabelDigital}}
    </button>
</div>
{{/if}}
{{/if}}
{{/if}}
