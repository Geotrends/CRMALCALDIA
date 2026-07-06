{{#if hasDocumentos}}
<div class="case-formato-generado">
    {{#each documentos}}
    <div class="case-formato-generado-doc" data-key="{{key}}">
        <span class="case-formato-generado-doc-icon {{icon}}"></span>
        <span class="case-formato-generado-doc-body">
            <span class="case-formato-generado-doc-label">{{label}}</span>
            <span class="case-formato-generado-doc-name">{{name}}</span>
        </span>
        <span class="case-formato-generado-doc-actions">
            <button
                type="button"
                class="btn btn-link btn-sm case-formato-generado-doc-btn case-formato-generado-doc-btn--preview"
                data-action="previewFormato"
                data-preview-url="{{previewUrl}}"
                title="{{../previewTitle}}"
            >
                <span class="fas fa-eye" aria-hidden="true"></span>
            </button>
            <a
                href="{{downloadUrl}}"
                class="btn btn-link btn-sm case-formato-generado-doc-btn case-formato-generado-doc-btn--download"
                target="_blank"
                rel="noopener"
                title="{{../downloadTitle}}"
            >
                <span class="fas fa-download" aria-hidden="true"></span>
            </a>
        </span>
    </div>
    {{/each}}
</div>
{{else}}
<p class="text-muted small case-formato-generado-empty">{{emptyText}}</p>
{{/if}}
