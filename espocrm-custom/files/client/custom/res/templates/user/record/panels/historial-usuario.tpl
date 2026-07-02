<div class="party-expediente{{#if historial.isLoading}} is-loading{{/if}}">
    {{#if historial.loadError}}
    <div class="party-expediente-empty text-danger">
        No se pudo cargar el historial. Intente recargar la página.
    </div>
    {{else}}
        {{#if historial.isLoading}}
        <div class="party-expediente-empty text-muted">Cargando historial…</div>
        {{else}}
            <div class="party-expediente-kpis">
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{historial.resumen.totalCasos}}</span>
                    <span class="party-expediente-kpi__label">Casos asignados</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{historial.resumen.activos}}</span>
                    <span class="party-expediente-kpi__label">Activos</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{historial.resumen.actas}}</span>
                    <span class="party-expediente-kpi__label">Actas</span>
                </div>
                <div class="party-expediente-kpi">
                    <span class="party-expediente-kpi__value">{{historial.resumen.asignaciones}}</span>
                    <span class="party-expediente-kpi__label">Asignaciones</span>
                </div>
            </div>

            {{#if historial.casos.length}}
            <section class="party-expediente-section">
                <h4 class="party-expediente-section__title">Casos asignados</h4>
                <div class="party-expediente-casos">
                    {{#each historial.casos}}
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

                {{#if historial.actuaciones.length}}
                <div class="party-expediente-timeline">
                    {{#each historial.actuaciones}}
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
                <div class="party-expediente-empty text-muted">No hay actuaciones registradas para este usuario.</div>
                {{/if}}
            </section>
        {{/if}}
    {{/if}}
</div>
