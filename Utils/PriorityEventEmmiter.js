const EventEmitter = require('events');

class PriorityEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.isBusy = false;
        this.interruptedEvent = null; // To store interrupted event
    }

    createEvent(event, action, priority = 0) {
        this.queue.push({ event, action, priority });
        this.queue.sort((a, b) => b.priority - a.priority); // Higher priority first

        if (!this.isBusy) {
            void this.processQueue();
        } else if (this.hasPendingHighPriorityTasks(priority)) {
            this.interruptCurrentAction(priority);
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            return;
        }

        this.isBusy = true;
        const { event, action } = this.queue.shift();

        try {
            await action();
        } catch (e) {
            console.error(`Event ${event} failed: ${e}`);
        }

        this.isBusy = false;

        if (this.interruptedEvent) {
            this.queue.unshift(this.interruptedEvent);
            this.interruptedEvent = null;
        }

        await this.processQueue();
    }

    hasPendingHighPriorityTasks(currentPriority) {
        return this.queue.some(event => event.priority > currentPriority);
    }

    interruptCurrentAction() {
        if (this.isBusy && this.interruptedEvent === null) {
            this.interruptedEvent = this.queue.shift();
            this.isBusy = false;
            void this.processQueue();
        }
    }
}

module.exports = PriorityEventEmitter;
