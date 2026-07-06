<div class="panel-body case-actuo-archivo-panel">
    {{#if showButton}}
        <p class="text-muted small case-actuo-archivo-help">{{helpText}}</p>
        <div class="case-actuo-archivo-actions">
            <button type="button" class="btn btn-primary btn-sm case-actuo-archivo-btn case-actuo-archivo-btn--primary" data-action="llenarActuoArchivo">
                <span class="fas fa-laptop" aria-hidden="true"></span>
                <span class="case-actuo-archivo-btn-text">{{buttonLabel}}</span>
            </button>
            <button type="button" class="btn btn-default btn-sm case-actuo-archivo-btn case-actuo-archivo-btn--print" data-action="imprimirActuoManual">
                <span class="fas fa-print" aria-hidden="true"></span>
                <span class="case-actuo-archivo-btn-text">{{printLabel}}</span>
            </button>
        </div>
    {{else}}
        <p class="text-muted small">{{unavailableReason}}</p>
    {{/if}}
</div>
