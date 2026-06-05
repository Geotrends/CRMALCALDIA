<div class="panel-body">
    {{#if showButton}}
        <p class="text-muted small">{{helpText}}</p>
        <button type="button" class="btn btn-primary btn-block" data-action="llenarActa">
            <span class="fas fa-clipboard-check"></span> {{buttonLabel}}
        </button>
    {{else}}
        <p class="text-muted small">{{unavailableReason}}</p>
    {{/if}}
</div>
