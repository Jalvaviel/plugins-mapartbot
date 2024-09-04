const {EventStatus} = require("./EventStatus");

class PriorityEvent {
    constructor(name, action, priority, status = EventStatus.PENDING) {
        this.name = name;
        this.action = action;
        this.priority = priority;
        this.status = status;
    }
}
module.exports = PriorityEvent;