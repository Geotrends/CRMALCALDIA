<div class="party-expediente{{#if expediente.isLoading}} is-loading{{/if}}">
    {{#if expediente.loadError}}
    <div class="party-expediente-empty text-danger">
        No se pudo cargar el expediente. Intente recargar la página.
    </div>
    {{else}}
        {{#if expediente.isLoading}}
        <div class="party-expediente-empty text-muted">Cargando expediente…</div>
        {{else}}
            <div class="party-expediente-kpis">
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.totalCasos}}</span>
                    <span class="party-expediente-kpi__label">Casos</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.peticionario}}</span>
                    <span class="party-expediente-kpi__label">Como peticionario</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.infractor}}</span>
                    <span class="party-expediente-kpi__label">Como infractor</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.actas}}</span>
                    <span class="party-expediente-kpi__label">Actas</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.comunicaciones}}</span>
                    <span class="party-expediente-kpi__label">Comunicaciones</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{expediente.resumen.actuos}}</span>
                    <span class="party-expediente-kpi__label">Actuos</span>
                </div>
            </div>

            {{#if expediente.casos.length}}
            <section class="party-expediente-section">
                <h4 class="party-expediente-section__title">Casos vinculados</h4>
                <div class="party-expediente-casos">
                    {{#each expediente.casos}}
                    <article class="party-expediente-caso">
                        <div class="party-expediente-caso__top">
                            <a href="#" data-action="openRecord" data-href="{{href}}" class="party-expediente-link">{{label}}</a>
                            <span class="party-expediente-badge party-expediente-badge--rol">{{rol}}</span>
                        </div>
                        <div class="party-expediente-caso__meta text-muted">
                            <span>{{status}}</span>
                            {{#if expediente}}<span>· Exp. {{expediente}}</span>{{/if}}
                            {{#if fechaCaso}}<span>· {{fechaCaso}}</span>{{/if}}
                        </div>
                    </article>
                    {{/each}}
                </div>
            </section>
            {{/if}}

            <section class="party-expediente-section">
                <h4 class="party-expediente-section__title">Historial de actuaciones</h4>

                {{#if expediente.actuaciones.length}}
                <div class="party-expediente-timeline">
                    {{#each expediente.actuaciones}}
                    <article class="party-expediente-item party-expediente-item--{{tipo}}">
                        <div class="party-expediente-item__marker" aria-hidden="true"></div>
                        <div class="party-expediente-item__body">
                            <div class="party-expediente-item__head">
                                <span class="party-expediente-badge party-expediente-badge--{{tipo}}">{{tipoLabel}}</span>
                                <span class="party-expediente-item__fecha text-muted">{{fecha}}</span>
                            </div>
                            <div class="party-expediente-item__titulo">{{titulo}}</div>
                            {{#if descripcion}}
                            <div class="party-expediente-item__desc text-muted">{{descripcion}}</div>
                            {{/if}}
                            <div class="party-expediente-item__links">
                                <a href="#" data-action="openRecord" data-href="{{caseHref}}" class="party-expediente-link">Caso {{caseLabel}}</a>
                                {{#if entityHref}}
                                <span class="text-muted">·</span>
                                <a href="#" data-action="openRecord" data-href="{{entityHref}}" class="party-expediente-link">Ver detalle</a>
                                {{/if}}
                                <span class="party-expediente-item__rol text-muted">· {{rol}}</span>
                            </div>
                        </div>
                    </article>
                    {{/each}}
                </div>
                {{else}}
                <div class="party-expediente-empty text-muted">No hay actuaciones registradas para este tercero.</div>
                {{/if}}
            </section>
        {{/if}}
    {{/if}}
</div>
