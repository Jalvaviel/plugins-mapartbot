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
    addListeners() {
        this.bot.on('depositItems', async (depositItemsObj) => {
            if (this.isActive) {
                if (depositItemsObj.depositing) {
                    console.log(depositItemsObj)
                    //this.bot.pathfinder.stop();
                    this.stop = true;
                    await this.deactivate();
                } else {
                    this.stop = false;
                    await this.activate();
                }
            }
        });
        this.bot.on('withdrawItems', async (withdrawItemsObj) => {
            if (this.isActive) {
                if (withdrawItemsObj.withdrawing) {
                    console.log(withdrawItemsObj)
                    //this.bot.pathfinder.stop();
                    this.stop = true;
                    await this.deactivate();
                } else {
                    this.stop = false;
                    await this.activate();
                }
            }
        });
    }
    async eat () {
        if (this.bot.food < this.config.threshold && !this.stop) {
            this.bot.emit('eat', {autoEat: this, eating: true});
            //clearInterval(this.eatInterval);
            while (this.bot.food < 20) {
                let foodItem;
                for (let foodString of this.foods) {
                    foodItem = this.bot.inventory.findInventoryItem(foodString);
                    if (foodItem) break;
                }
                try {
                    await this.bot.equip(foodItem, this.config.offhand ? 'off-hand' : 'hand'); // Equip food item
                    const foodCount = this.bot.heldItem.count
                    this.bot.deactivateItem();
                    this.bot.activateItem();
                    while (this.bot.heldItem && this.bot.heldItem.count === foodCount) { // && this.bot.heldItem.count === initialCount
                        //console.log('eating')
                        await sleep(1);
                    }
                } catch (e) {
                    throw new Error("The food item wasn't found / able to be equipped...");
                }
            }
            this.bot.emit('eat', {autoEat: this, eating: false});
            //this.activate();
        }
    }

/*
    async eat(){ // FIXME Abnormal delay when eating -> silent papermc crash.
        if (this.bot.food < this.config.threshold) {
            this.bot.emit('eat', {autoEat: this, eating: true});
            console.log('eating')
            //while (this.bot.food < 20) { // FIXME
                let foodFound = false; // EDGE CASE sometimes it doesn't detect food when it has plenty
                for (const item of this.bot.inventory.items()) {
                    if (this.foods.includes(item.name)) {
                        foodFound = true;
                        try {
                            await this.bot.equip(item, this.config.offhand ? 'off-hand' : 'hand'); // Equip food item
                            this.bot.deactivateItem();  // Deactivate held item
                            this.bot.activateItem();    // Start eating
                            const initialCount = this.bot.heldItem ? this.bot.heldItem.count : 0;

                            while (this.bot.heldItem && this.bot.heldItem.count === initialCount) { // && this.bot.heldItem.count === initialCount
                                //console.log('eating')
                                await sleep(1);
                            }
                        } catch (e) {
                            console.log(`Failed to eat ${item.name}: ${e}`);
                        }
                        break;
                    }
                }
                if (!foodFound) { //TODO
                    console.log("Ran out of food, searching on the chest")
                    await this.inventoryManager.withdrawItems(this.foods[0], 64);
                }
            //}
            this.bot.emit('eat', {autoEat: this, eating: false});
        }
    }
 */
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
