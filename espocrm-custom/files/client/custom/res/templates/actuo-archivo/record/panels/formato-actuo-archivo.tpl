<div class="panel-body">
    {{#if visible}}
        <p class="text-muted small">{{helpText}}</p>
        <button type="button" class="btn btn-default btn-block" data-action="downloadFormatoActuo" data-format="docx"{{#unless downloadEnabled}} disabled{{/unless}}>
            <span class="fas fa-file-word"></span> {{wordLabel}}
        </button>
        <button type="button" class="btn btn-default btn-block" data-action="downloadFormatoActuo" data-format="pdf"{{#unless downloadEnabled}} disabled{{/unless}}>
            <span class="fas fa-file-pdf"></span> {{pdfLabel}}
        </button>
    {{else}}
        <p class="text-muted small">{{unavailableText}}</p>
    {{/if}}
</div>
