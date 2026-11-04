{{#if showPanel}}
{{#if showProgramaciones}}
<div class="case-programaciones">
    <p class="case-visitas-archivo-title">Visitas programadas</p>
    {{#if puedeProgramar}}
    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn case-programar-visita-btn" data-action="programarVisita">
        <span class="fas fa-calendar-plus"></span> Programar visita
    </button>
    {{/if}}
    {{#if motivoNoProgramar}}
    <p class="text-muted small case-programar-visita-help">{{motivoNoProgramar}}</p>
    {{/if}}
    {{#each programaciones}}
    <div class="case-visita-archivo-card case-programacion-card{{#if isCurrent}} is-current{{/if}}" data-id="{{id}}">
        <p class="case-visita-archivo-heading">
            <strong><a href="#ProgramacionVisita/view/{{id}}">{{name}}</a></strong>
            <span class="case-visita-archivo-estado">{{estadoLabel}}</span>
        </p>
        <p class="case-visita-archivo-fecha">{{cuando}} · {{responsableName}}</p>
        <div class="case-programacion-tarjetas">
            <div class="case-programacion-tarjeta" data-tarjeta="acta">
                <p class="case-programacion-tarjeta__titulo">
                    <span class="fas fa-file-lines"></span> Acta de visita
                    <span class="case-programacion-tarjeta__estado">{{#if actaEstadoLabel}}{{actaEstadoLabel}}{{else}}Pendiente{{/if}}</span>
                </p>
                {{#if actaId}}
                <p class="case-programacion-acta"><a href="#ActaVisita/view/{{actaId}}" data-case-record-type="ActaVisita" data-case-record-id="{{actaId}}">{{actaName}}</a></p>
                {{/if}}
                {{#if canDescargarBlanco}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="descargarActaBlanco" data-id="{{id}}">
                        <span class="fas fa-download"></span> Descargar acta en blanco
                    </button>
                    {{#if canAdjuntar}}
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="adjuntarActa" data-id="{{id}}">
                        <span class="fas fa-upload"></span> Adjuntar acta diligenciada
                    </button>
                    {{/if}}
                </div>
                {{/if}}
                {{#if canCompletar}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="completarActa" data-acta-id="{{actaId}}">
                        <span class="fas fa-pen"></span> Completar acta de visita
                    </button>
                </div>
                {{/if}}
            </div>
            {{#if intervencionId}}
            <p class="case-programacion-acta"><a href="#IntervencionTecnica/view/{{intervencionId}}" data-case-record-type="IntervencionTecnica" data-case-record-id="{{intervencionId}}"><span class="fas fa-clipboard-check" aria-hidden="true"></span> Ver intervención técnica</a></p>
            <div class="case-programacion-tarjeta" data-tarjeta="informe">
                <p class="case-programacion-tarjeta__titulo">
                    <span class="fas fa-file-signature"></span> Informe técnico (opcional)
                    <span class="case-programacion-tarjeta__estado">{{informeEstadoLabel}}</span>
                </p>
                {{#if informeId}}
                <p class="case-programacion-acta"><a href="?entryPoint=download&id={{informeId}}" target="_blank" rel="noopener">{{informeName}}</a></p>
                {{/if}}
                {{#if correccionSolicitada}}
                <p class="case-programacion-correccion"><span class="fas fa-triangle-exclamation"></span> El Director Técnico solicitó correcciones{{#if observacionesRevision}}: {{observacionesRevision}}{{/if}}</p>
                {{/if}}
                {{#if canDescargarPlantilla}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="descargarInformePlantilla" data-intervencion-id="{{intervencionId}}">
                        <span class="fas fa-download"></span> Descargar plantilla del informe
                    </button>
                    {{#if canAdjuntarInforme}}
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="adjuntarInforme" data-intervencion-id="{{intervencionId}}">
                        <span class="fas fa-upload"></span> {{#if informeId}}Reemplazar informe{{else}}Adjuntar informe diligenciado y firmado{{/if}}
                    </button>
                    {{/if}}
                </div>
                {{/if}}
            </div>
            {{/if}}
        </div>
    </div>
    {{else}}
    <p class="text-muted small">Aún no hay visitas programadas.</p>
    {{/each}}
</div>
{{/if}}
{{#if showVisitasArchivo}}
<p class="case-visitas-archivo-title">{{visitasArchivoTitle}}</p>
{{/if}}
{{#each visitasArchivo}}
<div class="case-visita-archivo-card{{#if isCurrent}} is-current{{/if}}" data-acta-id="{{actaId}}">
    <p class="case-visita-archivo-heading">
        <strong>{{../visitaLabel}} {{numeroVisita}} - {{#if actaId}}<a href="#ActaVisita/view/{{actaId}}" data-case-record-type="ActaVisita" data-case-record-id="{{actaId}}" class="case-visita-archivo-link">{{nombre}}</a>{{else}}{{nombre}}{{/if}}</strong>
        <span class="case-visita-archivo-estado">{{estadoLabel}}</span>
    </p>
    <p class="case-visita-archivo-fecha">Fecha de la visita: {{fechaVisita}}</p>
    {{#if faltaActa}}<p class="text-warning">Falta adjuntar el acta de visita obligatoria.</p>{{/if}}
    {{#if hasSoportes}}
        <div class="case-programacion-tarjetas">
            <div class="case-programacion-tarjeta" data-tarjeta="acta">
                <p class="case-programacion-tarjeta__titulo">
                    <span class="fas fa-file-lines"></span> Acta de visita
                    <span class="case-programacion-tarjeta__estado">{{#if actaEstadoLabel}}{{actaEstadoLabel}}{{else}}Pendiente{{/if}}</span>
                </p>
                {{#if actaId}}
                <p class="case-programacion-acta"><a href="#ActaVisita/view/{{actaId}}" data-case-record-type="ActaVisita" data-case-record-id="{{actaId}}">{{actaName}}</a></p>
                {{/if}}
                {{#if canDescargarBlanco}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="descargarActaBlanco" data-id="{{id}}">
                        <span class="fas fa-download"></span> Descargar acta en blanco
                    </button>
                    {{#if canAdjuntar}}
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="adjuntarActa" data-id="{{id}}">
                        <span class="fas fa-upload"></span> Adjuntar acta diligenciada
                    </button>
                    {{/if}}
                </div>
                {{/if}}
                {{#if canCompletar}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="completarActa" data-acta-id="{{actaId}}">
                        <span class="fas fa-pen"></span> Completar acta de visita
                    </button>
                </div>
                {{/if}}
            </div>
            {{#if intervencionId}}
            <p class="case-programacion-acta"><a href="#IntervencionTecnica/view/{{intervencionId}}" data-case-record-type="IntervencionTecnica" data-case-record-id="{{intervencionId}}"><span class="fas fa-clipboard-check" aria-hidden="true"></span> Ver intervención técnica</a></p>
            <div class="case-programacion-tarjeta" data-tarjeta="informe">
                <p class="case-programacion-tarjeta__titulo">
                    <span class="fas fa-file-signature"></span> Informe técnico (opcional)
                    <span class="case-programacion-tarjeta__estado">{{informeEstadoLabel}}</span>
                </p>
                {{#if informeId}}
                <p class="case-programacion-acta"><a href="?entryPoint=download&id={{informeId}}" target="_blank" rel="noopener">{{informeName}}</a></p>
                {{/if}}
                {{#if correccionSolicitada}}
                <p class="case-programacion-correccion"><span class="fas fa-triangle-exclamation"></span> El Director Técnico solicitó correcciones{{#if observacionesRevision}}: {{observacionesRevision}}{{/if}}</p>
                {{/if}}
                {{#if canDescargarPlantilla}}
                <div class="case-visita-archivo-actions">
                    <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="descargarInformePlantilla" data-intervencion-id="{{intervencionId}}">
                        <span class="fas fa-download"></span> Descargar plantilla del informe
                    </button>
                    {{#if canAdjuntarInforme}}
                    <button type="button" class="btn btn-primary btn-sm case-acta-visita-btn" data-action="adjuntarInforme" data-intervencion-id="{{intervencionId}}">
                        <span class="fas fa-upload"></span> {{#if informeId}}Reemplazar informe{{else}}Adjuntar informe diligenciado y firmado{{/if}}
                    </button>
                    {{/if}}
                </div>
                {{/if}}
            </div>
            {{/if}}
        </div>
    {{/if}}
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
    {{#if actaId}}
    <div class="case-visita-archivo-actions">
        <button type="button" class="btn btn-default btn-sm case-acta-visita-btn" data-action="verDetallesVisita" data-acta-id="{{actaId}}">
            <span class="fas fa-eye"></span> Ver detalles
        </button>
    </div>
    {{/if}}
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
{{/if}}
{{/if}}
