const { readFileSync } = require('fs');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEvent = require("../Utils/PriorityEvent");

async function eat(bot, foods = JSON.parse(readFileSync('./AutoEat/foods.json')), offhand = false) {
    bot.emit('eat', true);

    for (const item of bot.inventory.items()) {
        if (foods.includes(item.name)) {
            await bot.equip(item, offhand ? 'off-hand' : 'hand'); // Equip food item
            bot.deactivateItem(); // Deactivate any held item (if applicable)
            bot.activateItem(); // Start eating

            const initialCount = bot.heldItem ? bot.heldItem.count : 0;

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

async function checkHunger(bot, threshold = 10) {
    // Check if the bot's hunger level is below the threshold
    return bot.food < threshold;
}

function autoEat(bot, foods, offhand = false, priority = 10) {
    const event = new PriorityEvent('autoEat', async () => await eat(bot, foods, offhand), priority);
    bot.eventEmitter.pushEvent(event);
}

function autoEatPlugin(bot, interval = 1000, threshold = 10, foods = JSON.parse(readFileSync('./AutoEat/foods.json')), offhand = false, priority = 10) {
    setInterval(async () => {
        if (await checkHunger(bot, threshold)) {
            autoEat(bot, foods, offhand, priority);
        }
    }, interval);
}

module.exports = autoEatPlugin;
