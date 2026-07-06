<div class="panel-body">
    {{#if showButton}}
        <p class="text-muted small">{{helpText}}</p>
        <div class="btn-group-vertical w-100 case-actuo-archivo-actions">
            <button type="button" class="btn btn-primary btn-sm case-actuo-archivo-btn" data-action="llenarActuoArchivo">
                <span class="fas fa-archive"></span> {{buttonLabel}}
            </button>
            <button type="button" class="btn btn-default btn-sm case-actuo-archivo-btn" data-action="imprimirActuoManual">
                <span class="fas fa-print"></span> {{printLabel}}
            </button>
            <button type="button" class="btn btn-default btn-sm case-actuo-archivo-btn" data-action="descargarActuoWord">
                <span class="fas fa-file-word"></span> {{wordLabel}}
            </button>
        </div>
    {{else}}
        <p class="text-muted small">{{unavailableReason}}</p>
    {{/if}}
</div>
