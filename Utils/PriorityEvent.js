const {EventStatus} = require("./EventStatus");

class PriorityEvent {
    constructor(name, action, priority, status = EventStatus.PENDING, abortController = null) {
        this.name = name;
        this.action = action;
        this.priority = priority;
        this.status = status;
        this.abortController = abortController || new AbortController();
    }
}
module.exports = PriorityEvent;