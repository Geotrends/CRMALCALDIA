<div class="calendar-day-events">
    <p class="calendar-day-events__date text-muted">{{dateLabel}}</p>
    <p class="calendar-day-events__count">{{countLabel}}</p>
    <div class="list-group calendar-day-events__list">
        {{#each items}}
        <a href="javascript:" class="list-group-item calendar-day-events__item" data-action="open" data-scope="{{scope}}" data-record-id="{{recordId}}">
            <span class="calendar-day-events__dot" style="background-color: {{color}};"></span>
            <span class="calendar-day-events__content">
                {{#if timeLabel}}
                <span class="calendar-day-events__time text-muted">{{timeLabel}}</span>
                {{/if}}
                <span class="calendar-day-events__name">{{name}}</span>
            </span>
        </a>
        {{/each}}
    </div>
</div>
