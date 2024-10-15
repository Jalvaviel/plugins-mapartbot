const { readFileSync } = require('fs');
const { sleep } = require("mineflayer/lib/promise_utils");
const InventoryManager = require("../../utils/InventoryManager/inventoryManager");

class AutoEat {
    constructor(bot, foods = JSON.parse(readFileSync("./modules/AutoEat/foods.json")), config = JSON.parse(readFileSync("./modules/AutoEat/config.json"))) {
        this.bot = bot;
        this.foods = foods;
        this.config = config;
        this.inventoryManager = new InventoryManager(bot);
        this.isActive = false;
        this.stop = false;
    }

    async eat(){
        if (this.bot.food < this.config.threshold) {
            let foodFound = false;
            this.bot.emit('eat', {autoEat: this, eating: true});
            for (const item of this.bot.inventory.items()) {
                if (this.foods.includes(item.name)) {
                    foodFound = true;
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
            if (!foodFound) {
                await this.inventoryManager.withdrawItems(this.foods[0],64);
            }
            this.bot.emit('eat', {autoEat: this, eating: false});
        }
    }

    activate() {
        this.isActive = true;
        this.eatInterval = setInterval(async ()=> {
            await this.eat();
        }, this.config.countdown);
    }

    deactivate() {
        this.isActive = false;
        clearInterval(this.eatInterval);
    }
}

module.exports = { AutoEat };
