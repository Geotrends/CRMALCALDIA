{{#if files}}
<div class="acta-adjuntos-descarga">
    {{#each files}}
    <a class="acta-adjuntos-descarga__item" href="{{downloadUrl}}" target="_blank" rel="noopener" download>
        <span class="fas fa-download" aria-hidden="true"></span>
        <span>{{name}}</span>
    </a>
    {{/each}}
</div>
{{else}}
<span class="text-muted">No hay actas adjuntas.</span>
{{/if}}
