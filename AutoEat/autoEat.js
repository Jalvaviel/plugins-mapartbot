const { readFileSync } = require('fs');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEvent = require("../Utils/PriorityEvent");
const { EventStatus } = require("../Utils/EventStatus");
const { nuker } = require("../Nuker/nuker");

let pausedModule = null;  // To track the currently paused module

// Function to handle eating logic
async function eat(bot, foods, offhand = false) {
    bot.emit('eat', true);

    for (const item of bot.inventory.items()) {
        if (foods.includes(item.name)) {
            try {
                await bot.equip(item, offhand ? 'off-hand' : 'hand'); // Equip food item
                bot.deactivateItem();  // Deactivate held item
                bot.activateItem();    // Start eating

                const initialCount = bot.heldItem ? bot.heldItem.count : 0;

                // Wait until eating is done or item count decreases
                while (bot.heldItem && bot.heldItem.count === initialCount) {
                    await sleep(1);
                }
            } catch (e) {
                console.log(`Failed to eat ${item.name}: ${e}`);
            }
            break;  // Exit loop after eating
        }
    }

    bot.emit('eat', false);
}

// Check if bot's hunger level is below threshold
async function checkHunger(bot, threshold = 10) {
    return bot.food < threshold;
}

// Function to handle auto-eating with priority
function autoEat(bot, foods, offhand = false, priority = 10) {
    const event = new PriorityEvent('autoEat', async () => {
        await eat(bot, foods, offhand);

        // Resume paused module if any
        if (pausedModule) {
            switch (pausedModule) {
                case 'nuker':
                    nuker(bot);  // Resume nuker if it was paused
                    break;
                default:
                    break;
            }
            pausedModule = null;  // Reset paused module after resuming
        }
    }, priority);
    bot.eventEmitter.pushEvent(event);
}

// Plugin to monitor hunger and trigger auto-eat when needed
function autoEatPlugin(bot, interval = 1000, threshold = 10, foods = JSON.parse(readFileSync('./AutoEat/foods.json')), offhand = false, priority = 10) {
    setInterval(async () => {
        if (await checkHunger(bot, threshold)) {
            // Pause the current module if the bot is doing something else
            if (bot.eventEmitter.runningEvent && bot.eventEmitter.runningEvent.name !== 'autoEat') {
                pausedModule = bot.eventEmitter.runningEvent.name;
                bot.eventEmitter.runningEvent.abortController.abort();  // Stop the current action
                bot.pathfinder.stop();  // Stop pathfinding if applicable
            }

            // Trigger auto-eat event
            autoEat(bot, foods, offhand, priority);
        }
    }, interval);
}

module.exports = autoEatPlugin;
