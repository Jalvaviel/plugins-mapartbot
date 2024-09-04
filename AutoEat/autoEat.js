const { readFileSync } = require('fs');
const { sleep } = require('mineflayer/lib/promise_utils');

/**
 * Makes the bot eat food. Yummy!
 * @param {Object} bot - The mineflayer bot instance.
 * @param {Array} foods - A list of the foods the bot likes. Should be ordered by preference.
 * @param {boolean} [offhand=false] - Eat from the offhand.
 * @returns {Promise<void>}
 */
async function eat(bot, foods = JSON.parse(readFileSync('./AutoEat/foods.json')), offhand = false) {
    bot.emit('eat', true);

    for (const item of bot.inventory.items()) {
        if (foods.includes(item.name)) {
            await bot.equip(item, offhand ? 'off-hand' : 'hand'); // Equip food item
            bot.deactivateItem(); // Deactivate any held item (if applicable)
            bot.activateItem(); // Start eating

            const initialCount = bot.heldItem.count;

            try {
                // Wait until the bot finishes eating or the item count decreases
                while (bot.heldItem && bot.heldItem.count === initialCount) {
                    await sleep(1);
                }
            } catch (e) {
                console.log(`Failed to eat ${item.name}: ${e}`);
            }

            break; // Exit after successfully eating one item
        }
    }

    bot.emit('eat', false);
}

/**
 * Calls the eat function using a queue of events of the type PriorityEventEmitter.
 * @param {Object} bot - The mineflayer bot instance.
 * @param {Array} [foods=JSON.parse(readFileSync('./foods.json'))] - A list of the foods the bot likes.
 * @param {boolean} [offhand=false] - Eat from the offhand.
 * @param {number} [hungerThreshold=10] - The hunger threshold to check before activating.
 * @param {number} [healthThreshold=10] - The health threshold to check before activating.
 * @param {number} [priority=10] - The priority of the event.
 */
function autoEat(bot, foods = JSON.parse(readFileSync('./AutoEat/foods.json')), offhand = false, hungerThreshold = 10, healthThreshold = 0, priority = 10) {
    if (bot.food < hungerThreshold || bot.health < healthThreshold) {
        bot.events.createEvent('eat', async () => await eat(bot, foods, offhand), priority);
    }
}

function autoEatPlugin(bot, interval = 1000) {
    setInterval(() => {
        autoEat(bot);
    }, interval);
}

module.exports = bot => { autoEatPlugin(bot), eat(bot) }
