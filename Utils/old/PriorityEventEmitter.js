const EventEmitter = require('events');

class PriorityEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.runningEvent = null;
        this.isProcessing = false;
    }

    sortQueue() {
        this.queue = this.queue.filter(event => event.status !== 'COMPLETED' && event.status !== 'FAILED');
        this.queue.sort((a, b) => b.priority - a.priority);
    }

    async processQueue() {
        if (this.isProcessing) return; // Avoid multiple concurrent processes
        this.isProcessing = true;

        while (this.queue.length > 0) {
            if (this.runningEvent && this.runningEvent.abortController.signal.aborted) {
                //console.log(`Event ${this.runningEvent.name} was aborted.`);
                this.runningEvent = null;
            }

            this.runningEvent = this.queue[0];
            this.runningEvent.status = 'RUNNING';

            try {
                await this.runningEvent.action();
                this.runningEvent.status = 'COMPLETED';
            } catch (e) {
                //console.error(`Event ${this.runningEvent ? this.runningEvent.name : 'unknown'} failed: ${e}`);
                if (this.runningEvent) {
                    this.runningEvent.status = 'FAILED';
                }
            } finally {
                this.runningEvent = null;
                this.sortQueue();
                if (this.queue.length > 0) {
                    // Re-check the queue after each event to handle priority changes
                    continue;
                }
            }
        }
        this.isProcessing = false;
    }

    pushEvent(event) {
        if (!event) {
            //console.error('Cannot add an undefined event to the queue.');
            return;
        }

        const existingEvent = this.queue.find(queuedEvent => queuedEvent.name === event.name && queuedEvent.status === 'PENDING');
        if (existingEvent) {
            //console.warn(`An event of the same type ${event.name} is already in the queue, skipping...`);
            return;
        }else {
            this.queue.push(event);
            //console.log(`Added event ${event.name} to queue.`);
        }

        this.sortQueue();

        if (!this.isProcessing) {
            void this.processQueue();
        }
    }
}

module.exports = PriorityEventEmitter;
