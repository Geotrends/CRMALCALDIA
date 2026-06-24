<div class="case-timeline case-timeline--horizontal{{#if timeline.isLoading}} is-loading{{/if}}">
    <div class="case-timeline-header">
        <div class="case-timeline-header-top">
            <span class="case-timeline-header-label">{{timeline.progressHeaderLabel}}</span>
            <span class="case-timeline-header-percent">{{timeline.progress}}%</span>
        </div>
        <div class="case-timeline-step-count text-muted">{{timeline.progressLabel}}</div>
    </div>

    <div class="case-timeline-board">
        <div class="case-timeline-track-wrap" title="{{timeline.currentStepTooltip}}">
            <div class="case-timeline-track-tooltip" role="tooltip">{{timeline.currentStepTooltip}}</div>

            <div class="case-timeline-labels" aria-hidden="true">
                {{#each timeline.steps}}
                <div class="case-timeline-block-label is-{{state}}">
                    {{#if isDone}}
                    <span class="fas fa-check case-timeline-label-check" aria-hidden="true"></span>
                    {{/if}}
                    <span class="case-timeline-label-text" title="{{label}}">{{shortLabel}}</span>
                </div>
                {{/each}}
            </div>

            <div class="case-timeline-rail" aria-label="{{timeline.currentStepTooltip}}">
                <div class="case-timeline-rail-line"></div>
                <div class="case-timeline-rail-fill" style="width: {{timeline.progress}}%;"></div>
                <div class="case-timeline-markers">
                    {{#each timeline.steps}}
                    <div class="case-timeline-marker-col is-{{state}}{{#if isCurrent}} is-active{{/if}}">
                        <span class="case-timeline-marker">
                            {{#if isDone}}
                            <span class="fas fa-check" aria-hidden="true"></span>
                            {{/if}}
                            {{#if isCurrent}}
                            <span class="case-timeline-marker-pulse" aria-hidden="true"></span>
                            {{/if}}
                        </span>
                    </div>
                    {{/each}}
                </div>
            </div>

            <div class="case-timeline-dates">
                {{#each timeline.steps}}
                <div class="case-timeline-block-date is-{{state}}{{#unless hasDate}} is-placeholder{{/unless}}">
                    {{dateFormatted}}
                </div>
                {{/each}}
            </div>
        </div>
    </div>
</div>
