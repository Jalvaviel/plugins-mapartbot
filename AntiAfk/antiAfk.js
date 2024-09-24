const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEvent = require("../Utils/old/PriorityEvent");

class AntiAfk {
    constructor(bot) {
        this.bot = bot
    }
    antiAfk() {
        this.bot.emit('notAfk', true);
        this.bot.swingArm("right");
        this.bot.emit('notAfk', false);
    }
}
function createAntiAfk(priorityQueue, bot, priority = 1) {
    if (priorityQueue.queue.length === 0) {
        const antiAfkObj = new AntiAfk(bot);
        const antiAfkEvent = new PriorityEvent("AntiAfk", antiAfkObj.antiAfk(), priority);
        priorityQueue.enqueue(antiAfkEvent);
    }
}

module.exports = {AntiAfk, createAntiAfk};
