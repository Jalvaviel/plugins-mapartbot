const { readFileSync } = require('fs');
const { sleep } = require("mineflayer/lib/promise_utils");

class AutoEat {
    constructor(bot, foods = JSON.parse(readFileSync("./modules/AutoEat/foods.json")), config = JSON.parse(readFileSync("./modules/AutoEat/config.json"))) {
        this.bot = bot;
        this.foods = foods;
        this.config = config;
    }

    async eat(){
        if (this.bot.food < this.config.threshold) {
            this.bot.emit('eat', {autoEat: this, eating: true});
            for (const item of this.bot.inventory.items()) {
                if (this.foods.includes(item.name)) {
                    try {
                        await this.bot.equip(item, this.config.offhand ? 'off-hand' : 'hand'); // Equip food item
                        this.bot.deactivateItem();  // Deactivate held item
                        this.bot.activateItem();    // Start eating

                        const initialCount = this.bot.heldItem ? this.bot.heldItem.count : 0;

                        while (this.bot.heldItem && this.bot.heldItem.count === initialCount) {
                            await sleep(1);
                        }
                    } catch (e) {
                        console.log(`Failed to eat ${item.name}: ${e}`);
                    }
                    break;
                }
            }
            this.bot.emit('eat', {autoEat: this, eating: false});
        }
    }

    activate() {
        setInterval(() => {
            this.eat();
        },this.config.countdown*1000);
    }
}


/*
function createAutoEat(priorityQueue, bot, priority = 10) {
    const autoEatObj = new AutoEat(bot);
    if (bot.food < autoEatObj.config.threshold) {
        const autoEatEvent = new PriorityEvent("AutoEat", autoEatObj.eat(), priority);
        priorityQueue.enqueue(autoEatEvent);
    }
}
 */

module.exports = { AutoEat };
/*
// Function to handle auto-eating with priority
function autoEat(this.bot, this.foods, offhand = false, priority = 10) {
    const event = new PriorityEvent('autoEat', async () => {
        await eat(this.bot, this.foods, offhand);

        // Resume paused module if any
        if (pausedModule) {
            switch (pausedModule) {
                case 'nuker':
                    nuker(this.bot);  // Resume nuker if it was paused
                    break;
                default:
                    break;
            }
            pausedModule = null;  // Reset paused module after resuming
        }
    }, priority);
    this.bot.eventEmitter.pushEvent(event);
}

// Plugin to monitor hunger and trigger auto-eat when needed
function autoEatPlugin(this.bot, interval = 1000, threshold = 10, this.foods = JSON.parse(readFileSync('./AutoEat/this.foods.json')), offhand = false, priority = 10) {
    setInterval(async () => {
        if (await checkHunger(this.bot, threshold)) {
            // Pause the current module if the this.bot is doing something else
            if (this.bot.eventEmitter.runningEvent && this.bot.eventEmitter.runningEvent.name !== 'autoEat') {
                pausedModule = this.bot.eventEmitter.runningEvent.name;
                this.bot.eventEmitter.runningEvent.abortController.abort();  // Stop the current action
                this.bot.pathfinder.stop();  // Stop pathfinding if applicable
            }

            // Trigger auto-eat event
            autoEat(this.bot, this.foods, offhand, priority);
        }
    }, interval);
}
 */

