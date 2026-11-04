{{#if showPanel}}
{{#if showRevision}}
<section class="case-decision-juridica case-revision">
    <div class="case-decision-juridica__intro">
        <span class="case-decision-juridica__icon fas fa-scale-balanced" aria-hidden="true"></span>
        <div>
            <span class="case-decision-juridica__eyebrow">{{revisionTitulo}}</span>
            <p>{{revisionAyuda}}</p>
        </div>
    </div>
    <div class="case-revision__resumen">
        {{#if intervencion}}
        <p><span class="fas fa-clipboard-check"></span> Intervención técnica: <a href="#IntervencionTecnica/view/{{intervencion.id}}" data-case-record-type="IntervencionTecnica" data-case-record-id="{{intervencion.id}}">{{intervencion.name}}</a> · {{intervencion.estado}}</p>
        {{/if}}
        {{#if acta}}
        <p><span class="fas fa-file-lines"></span> Acta de visita: <a href="#ActaVisita/view/{{acta.id}}" data-case-record-type="ActaVisita" data-case-record-id="{{acta.id}}">{{acta.name}}</a> · {{acta.estado}}</p>
        {{/if}}
        {{#if intervencion.informeId}}
        <p><span class="fas fa-file-signature"></span> Informe técnico: <a href="?entryPoint=download&id={{intervencion.informeId}}" target="_blank" rel="noopener">{{intervencion.informeName}}</a></p>
        {{/if}}
        {{#if comentarioTecnico}}
        <p class="case-revision__comentario"><span class="fas fa-comment"></span> Comentario del Director Técnico: {{comentarioTecnico}}</p>
        {{/if}}
    </div>
    {{#if puedeDecidirRevision}}
    {{#if verificaFecha}}
    <div class="case-revision__fecha">
        <p><strong><span class="fas fa-calendar-check"></span> Verifique la fecha límite de respuesta</strong></p>
        <p>{{#if fechaRespuesta.fecha}}Fecha registrada: <strong>{{fechaRespuesta.fecha}}</strong>{{else}}La solicitud no tiene fecha límite registrada.{{/if}}
            {{#if fechaRespuesta.modalidad}} · Modalidad: {{fechaRespuesta.modalidad}}{{/if}}
            {{#if fechaRespuesta.recepcion}} · Recibida: {{fechaRespuesta.recepcion}}{{/if}}</p>
        <label class="case-revision__fecha-check"><input type="checkbox" data-name="fechaVerificada"> He verificado la fecha límite de respuesta</label>
        <label class="case-revision__fecha-check"><input type="checkbox" data-name="fechaCorregir"> La fecha no es correcta, corregirla</label>
        <div class="case-revision__fecha-corregir hidden">
            <div class="form-group">
                <label>Fecha límite correcta</label>
                <input type="date" class="form-control" data-name="fechaCorregida" value="{{fechaRespuesta.fecha}}">
            </div>
            <div class="form-group">
                <label>Motivo de la corrección</label>
                <textarea class="form-control" rows="2" data-name="fechaMotivo"></textarea>
            </div>
        </div>
    </div>
    {{/if}}
    <div class="case-revision__opciones">
        {{#each decisiones}}
        <label class="case-revision__opcion">
            <input type="radio" name="revisionDecision" value="{{value}}">
            <span class="case-revision__opcion-texto"><strong>{{label}}</strong><small>{{help}}</small></span>
        </label>
        {{/each}}
    </div>
    <div class="form-group case-revision__entidad hidden">
        <label>Entidad competente</label>
        <input class="form-control" data-name="revisionEntidad" placeholder="Entidad destinataria de la remisión">
    </div>
    <div class="form-group">
        <label class="js-revision-motivo-label">Motivación</label>
        <textarea class="form-control" rows="3" data-name="revisionMotivo" placeholder="Registre la razón de su decisión."></textarea>
    </div>
    <div class="case-decision-juridica-actions">
        <button type="button" class="btn btn-primary btn-sm case-decision-juridica-btn" data-action="ejecutarRevision" disabled>
            <span class="fas fa-circle-check" aria-hidden="true"></span>
            <span class="js-revision-btn-label">Seleccione una decisión</span>
        </button>
    </div>
    {{else}}
    <p class="text-muted"><span class="fas fa-hourglass-half" aria-hidden="true"></span> Pendiente de la decisión de {{revisionQuien}}.</p>
    {{/if}}
</section>
{{else}}
<section class="case-decision-juridica">
    <div class="case-decision-juridica__intro">
        <span class="case-decision-juridica__icon fas fa-scale-balanced" aria-hidden="true"></span>
        <div>
            <span class="case-decision-juridica__eyebrow">Revisión técnico-jurídica</span>
            <p>{{helpText}}</p>
        </div>
    </div>
    {{#if showComplementariaSolicitada}}
    <p class="case-decision-juridica__solicitada">
        <span class="fas fa-circle-check" aria-hidden="true"></span>
        La revisión se guardó y la visita complementaria ya está solicitada.
        El responsable asignado debe programarla desde el panel Visitas.
    </p>
    {{else}}
    {{#if showSinFirma}}
    <p class="text-warning case-decision-juridica__sin-firma">
        <span class="fas fa-triangle-exclamation" aria-hidden="true"></span>
        Falta adjuntar el acta de visita diligenciada y firmada. Quien hizo la visita debe adjuntarla en el panel Visitas; cuando esté, aquí podrá registrar la revisión.
    </p>
    {{else}}
    <div class="row case-decision-juridica-form">
        <div class="col-sm-6 form-group">
            <label for="case-decision-tramite">Definición de trámite</label>
            <select id="case-decision-tramite" class="form-control" data-name="decisionTramite">
                <option value="">Seleccione una opción</option>
                <option value="Visita complementaria">Visita complementaria</option>
                <option value="Cierre de atención">Cierre de atención</option>
                <option value="Remisión por competencia">Remisión por competencia</option>
                <option value="Apertura de actuación">Apertura de actuación</option>
            </select>
        </div>
        <div class="col-sm-6 form-group case-entidad-remision">
            <label for="case-entidad-remision">Entidad competente</label>
            <input id="case-entidad-remision" class="form-control" data-name="entidadRemision" placeholder="Entidad destinataria de la remisión">
        </div>
        <div class="col-sm-12 form-group">
            <label for="case-motivo-decision">Motivación de la revisión</label>
            <textarea id="case-motivo-decision" class="form-control" rows="3" data-name="motivoDecision" placeholder="Registre los hallazgos y la razón de la definición."></textarea>
        </div>
    </div>
    {{/if}}
    {{#unless showSinFirma}}
    <div class="case-decision-juridica-actions">
        <button type="button" class="btn btn-primary btn-sm case-decision-juridica-btn" data-action="ejecutarDefinicion">
            <span class="fas fa-circle-check js-ejecutar-icon" aria-hidden="true"></span>
            <span class="js-ejecutar-label">Seleccione la definición de trámite</span>
        </button>
    </div>
    {{/unless}}
    {{/if}}
</section>
{{/if}}
{{/if}}
