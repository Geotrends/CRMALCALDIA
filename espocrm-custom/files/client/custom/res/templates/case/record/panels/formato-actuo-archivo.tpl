<div class="panel-body">
    {{#if visible}}
        <p class="text-muted small">{{helpText}}</p>
        <button type="button" class="btn btn-default btn-block" data-action="downloadFormatoActuoCaso" data-format="pdf">
            <span class="fas fa-file-pdf"></span> {{pdfLabel}}
        </button>
    {{/if}}
</div>
