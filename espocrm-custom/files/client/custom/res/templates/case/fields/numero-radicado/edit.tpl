<div class="radicado-assistant">
    {{#if isAssistant}}
        <input type="text" class="form-control main-element" data-name="manual-radicado" value="{{manualRadicado}}" maxlength="100" autocomplete="espo-off" placeholder="Ingrese el número de radicado">
        <div class="text-muted small m-t-s">Registre manualmente el número de radicado asignado.</div>
    {{else}}
        <span class="none-value">{{value}}</span>
    {{/if}}
</div>
