<div class="case-cronograma{{#if cronograma.isLoading}} is-loading{{/if}}">
    <div class="case-cronograma-meta">
        <div class="case-cronograma-meta-row">
            <span class="case-cronograma-meta-label">{{cronograma.timeZoneMetaLabel}}</span>
            <span class="case-cronograma-meta-value">{{cronograma.timeZoneLabel}}</span>
        </div>
        <div class="case-cronograma-meta-row">
            <span class="case-cronograma-meta-label">{{cronograma.currentStatusMetaLabel}}</span>
            <span class="case-cronograma-meta-value is-status">{{cronograma.currentStatusLabel}}</span>
        </div>
        <div class="case-cronograma-meta-row">
            <span class="case-cronograma-meta-label">{{cronograma.deadlineMetaLabel}}</span>
            <span class="case-cronograma-meta-value">{{cronograma.vencimientoSummary}}</span>
        </div>
    </div>

    <div class="case-cronograma-table" role="table">
        <div class="case-cronograma-head" role="row">
            <div class="case-cronograma-col-label" role="columnheader">{{cronograma.milestoneMetaLabel}}</div>
            <div class="case-cronograma-col-value" role="columnheader">{{cronograma.statusMetaLabel}}</div>
        </div>

        {{#each cronograma.entries}}
        <div class="case-cronograma-row is-{{statusKind}}{{#if isOverdue}} is-alert{{/if}}" role="row">
            <div class="case-cronograma-col-label" role="cell">
                <div class="case-cronograma-milestone">{{label}}</div>
                {{#if hasDetail}}
                <div class="case-cronograma-detail">{{detail}}</div>
                {{/if}}
            </div>
            <div class="case-cronograma-col-value" role="cell">
                <div class="case-cronograma-status">{{statusText}}</div>
                {{#if hasTimestamp}}
                <div class="case-cronograma-timestamp">{{timestampText}}</div>
                {{/if}}
            </div>
        </div>
        {{/each}}
    </div>
</div>
