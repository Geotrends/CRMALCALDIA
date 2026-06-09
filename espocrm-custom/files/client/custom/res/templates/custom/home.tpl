<div class="custom-home">
    {{#if showTablero}}
    <div class="panel panel-default custom-home-tablero">
        <div class="panel-heading">
            <h4 class="panel-title">Tablero de control</h4>
        </div>
        <div class="panel-body custom-home-tablero-body">
            <iframe src="{{iframeUrl}}" title="Tablero de control" class="custom-home-iframe"></iframe>
        </div>
    </div>
    {{/if}}

    {{#each lists}}
    <div class="panel panel-default custom-home-lista">
        <div class="panel-heading">
            <h4 class="panel-title">{{title}}</h4>
        </div>
        <div class="panel-body">
            <div class="custom-home-lista-cuerpo" data-list-index="{{@index}}">
                <p class="text-muted">Cargando casos…</p>
            </div>
        </div>
    </div>
    {{/each}}
</div>
