<div class="panel-body">
    {{#if showButton}}
        <p class="text-muted small">{{helpText}}</p>
        <button type="button" class="btn btn-primary btn-block" data-action="llenarActuoArchivo">
            <span class="fas fa-archive"></span> {{buttonLabel}}
        </button>
    {{else}}
        <p class="text-muted small">{{unavailableReason}}</p>
    {{/if}}
</div>
