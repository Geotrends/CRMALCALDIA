{{#if showPanel}}
<section class="case-decision-juridica">
    <div class="case-decision-juridica__intro">
        <span class="case-decision-juridica__icon fas fa-scale-balanced" aria-hidden="true"></span>
        <div>
            <span class="case-decision-juridica__eyebrow">Revisión técnico-jurídica</span>
            <p>{{helpText}}</p>
        </div>
    </div>
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
</section>
{{/if}}
