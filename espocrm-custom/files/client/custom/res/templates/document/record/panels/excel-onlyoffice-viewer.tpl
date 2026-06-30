<div class="excel-alcaldia-panel">
    <p class="excel-alcaldia-panel__help text-muted">
        {{translate 'excelViewerHelp' scope='Document'}}
    </p>

    <div class="excel-alcaldia-panel__actions">
        <button type="button" class="btn btn-primary" data-action="openExcelViewer">
            <span class="fas fa-table"></span>
            {{translate 'excelViewerOpen' scope='Document'}}
        </button>

        {{#if downloadUrl}}
            <a href="{{downloadUrl}}" class="btn btn-default" target="_blank" rel="noopener">
                <span class="fas fa-download"></span>
                {{translate 'excelViewerDownload' scope='Document'}}
            </a>
        {{/if}}
    </div>

    {{#if errorMessage}}
        <div class="excel-alcaldia-panel__status text-danger">{{errorMessage}}</div>
    {{/if}}
</div>
