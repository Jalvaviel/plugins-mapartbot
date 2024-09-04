const { sleep } = require("mineflayer/lib/promise_utils");

async function notAfk(bot, options) {
    bot.emit('notAfk', true);

    if (options.peep) {
        const nearestEntity = bot.nearestEntity()?.position;
        if (nearestEntity) {
            await bot.lookAt(nearestEntity);
        }
    }

    if (options.sneak) {
        bot.setControlState('sneak', true);
        await sleep(10);
        bot.setControlState('sneak', false);
    }

    if (options.jump) {
        bot.setControlState('jump', true);
        await sleep(10);
        bot.setControlState('jump', false);
    }

    if (options.swingArm) {
        bot.swingArm("right");
    }

    bot.emit('notAfk', false);
}

function antiAfk(bot, options = { peep: true, swingArm: true, sneak: false, jump: false }, priority = 1) {
    bot.events.createEvent('notAfk', async () => await notAfk(bot, options), priority);
    bot.events.interruptCurrentAction(priority);
}

/**
 * Initializes the antiAfk plugin and sets up periodic execution.
 * @param {Object} bot - The mineflayer bot instance.
 */
function antiAfkPlugin(bot, interval = 20000) {
    setInterval(() => {
        antiAfk(bot);
    }, interval);
}

module.exports = bot => antiAfkPlugin(bot);
