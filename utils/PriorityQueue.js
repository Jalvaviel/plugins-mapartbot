const EventEmitter = require('node:events');
const {EventStatus} = require("./EventStatus");
const {createNuker} = require("../modules/Nuker/nuker");
class PriorityQueue extends EventEmitter {
    constructor(bot) {
        super();
        this.bot = bot;
        this.queue = [];
        this.isProcessing = false;
        this.abortedEvent = null; // Store aborted events
    }

    enqueue(event) {
        this.emit("enqueue", event);
        if (this.abortedEventsInterval){
            clearInterval(this.abortedEventsInterval);
        }
        this.queue.push(event);
        this.sortQueue();
        if (!this.isProcessing) {
            this.process();
        }
    }
    async process() {
        if (this.isProcessing) return false;
        let event = this.queue[0];
        if (!event) return false;
        try {
            this.isProcessing = true;
            event.status = EventStatus.RUNNING;
            await event.action();
        } catch (error) {
            event.status = EventStatus.FAILED;
        } finally {
            this.isProcessing = false;
            this.queue.shift();
            this.process();
            this.requeueAbortedEvent();
        }
    }
    sortQueue() {
        this.emit("sorting", this.queue);
        const currentEvent = this.queue[0];
        this.queue.sort((a, b) => b.priority - a.priority);
        if (this.queue[0].name !== currentEvent.name) { // ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT ABORT
            if (currentEvent.abortController) {
                currentEvent.abortController.abort("Aborted due to priority change.");
                currentEvent.status = EventStatus.ABORTED;
                this.abortedEvent = currentEvent;
            }
        }
        this.emit("sorted", this.queue);
    }

    requeueAbortedEvent() {
        if (this.abortedEvent && this.queue.length === 0) {
            this.abortedEventsInterval = setInterval(() => {
                if (this.abortedEvent.name === "Nuker") {
                    createNuker(this,this.bot);
                }
                //console.log("Requeued an aborted event.",this.abortedEvent);
                this.abortedEvent = null;
            },5000);
        }
    }
}

module.exports = PriorityQueue;
/*
const EventEmitter = require('node:events');
class PriorityQueue extends EventEmitter {
    constructor() {
        super();
        this.queue = [];
        this.pendingPromise = false;
        this.currentEvent = null; // Track the current task for preemption
        //this.cancellationToken = { cancelled: false }; // Cancellation token
    }

    enqueue(event, priority = 0) {
        this.emit("enqueue", action);
        return new Promise((resolve, reject) => {
            this.queue.push({ event, resolve, reject });
            this.sortQueue();
            this.dequeue();
        });
    }

    async dequeue() {
        this.emit("dequeue");

        // Check if there is a task running, and if it's cancelled
        if (this.pendingPromise && !this.cancellationToken.cancelled) return false;

        // If a task is running but we received a cancel signal, stop it
        if (this.pendingPromise && this.cancellationToken.cancelled) {
            this.currentEvent.reject("Task preempted by higher priority task");
            this.pendingPromise = false;
            this.cancellationToken = { cancelled: false }; // Reset the token
        }

        let item = this.queue.shift();
        if (!item) return false;

        try {
            this.pendingPromise = true;
            this.currentEvent = item; // Track the currently running task
            let payload = await item.action(this.cancellationToken); // Pass the cancellation token
            this.pendingPromise = false;
            item.resolve(payload);
        } catch (e) {
            this.pendingPromise = false;
            item.reject(e);
        } finally {
            this.dequeue(); // Continue processing next task
        }

        return true;
    }

    sortQueue() {
        this.emit("sorting", this.queue);
        this.queue.sort((a, b) => b.priority - a.priority);
        this.emit("sorted", this.queue);
    }

    // Method to cancel the currently running task
    cancelCurrentTask() {
        if (this.pendingPromise) {
            this.cancellationToken.cancelled = true;
        }
    }
}
 */