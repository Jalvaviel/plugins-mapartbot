const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEvent = require("../Utils/PriorityEvent");

async function swingArm(bot) {
    bot.emit('notAfk', true);

    bot.swingArm("right"); // Swing the right arm

    bot.emit('notAfk', false);
}

function isAfk(bot) {
    // The bot is AFK if no tasks are in the queue
    return bot.eventEmitter.queue.length === 0;
}

function antiAfk(bot, priority = 1) {
    if (isAfk(bot)) {
        const event = new PriorityEvent('antiAfk', async () => await swingArm(bot), priority);
        bot.eventEmitter.pushEvent(event);
    }
}

function antiAfkPlugin(bot, interval = 5000) {
    setInterval(async () => {
        antiAfk(bot);
    }, interval);
}

module.exports = antiAfkPlugin;
