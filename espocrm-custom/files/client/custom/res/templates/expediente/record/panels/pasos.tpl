<div class="expediente-pasos">
    {{#if loading}}
    <p class="text-muted small">Cargando pasos del trámite…</p>
    {{/if}}

    {{#unless loading}}
        {{#if timeline.totalSteps}}
        <p class="text-muted small">{{timeline.tipoTramite}}</p>

        <ul class="expediente-pasos-list">
            {{#each timeline.steps}}
            <li class="expediente-paso is-{{state}}">
                <span class="expediente-paso-marker">
                    {{#if isDone}}<span class="fas fa-check" aria-hidden="true"></span>{{/if}}
                </span>
                <span class="expediente-paso-text">
                    {{paso}}
                    {{#if plazoLegalDias}}<span class="text-muted small"> — plazo legal: {{plazoLegalDias}} día(s)</span>{{/if}}
                </span>
            </li>
            {{/each}}
        </ul>

        {{#if canAvanzar}}
            {{#unless timeline.esPasoFinal}}
            <button type="button" class="btn btn-primary btn-sm" data-action="avanzarPaso">
                <span class="fas fa-forward" aria-hidden="true"></span>
                Avanzar al siguiente paso
            </button>
            {{else}}
            <p class="text-muted small">El expediente llegó a su paso final (Auto de Archivo).</p>
            {{/unless}}
        {{/if}}
        {{else}}
        <p class="text-muted small">Este expediente aún no tiene un tipo de trámite (Ley 1333/2009 o Ley 1801/2016) definido.</p>
        {{/if}}
    {{/unless}}
</div>
