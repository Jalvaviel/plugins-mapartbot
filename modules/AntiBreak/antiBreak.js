const {readFileSync} = require("fs");
const InventoryManager = require("../../utils/InventoryManager/inventoryManager.js");
const { sleep } = require("mineflayer/lib/promise_utils");
class AntiBreak {
    constructor(bot, config = JSON.parse(readFileSync("./modules/AntiBreak/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.inventoryManager = new InventoryManager(bot);
        this.stop = false;
        this.isActive = false;
        this.addListeners();
    }

    addListeners() {
        this.bot.on('eat', (eatEvent) => {
            if (this.isActive) {
                if (eatEvent.eating) {
                    this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                }
            }
        });
    }

    async replenishTools(){ // TODO this doesn't work when withdrawing.
        for (let item of this.bot.inventory.items()) {
            if (this.stop) sleep(1);
            if (item.nbt) {
                if (item.nbt.value) {
                    if (item.nbt.value.Damage) {
                        if (item.nbt.value.Damage.value >= item.maxDurability - this.config.threshold) {
                            this.bot.emit('replenishTools', {antiBreak: this, replenishing: true});
                            //const fullItemNbt = structuredClone(item.nbt);
                            //fullItemNbt.value.Damage.value = 0;
                            await this.inventoryManager.depositItems(item.name,1,item.nbt);
                            item.nbt.value.Damage.value = 0
                            await this.inventoryManager.withdrawItems(item.name,1,item.nbt);
                            this.bot.emit('replenishTools', {antiBreak: this, replenishing: false});
                        }
                    }
                }
            }
        }
    }

    activate() {
        this.isActive = true;
        this.antiBreakInterval = setInterval(async () => {
            await this.replenishTools();
        },this.config.countdown);
    }

    deactivate() {
        this.isActive = false;
        clearInterval(this.antiBreakInterval);
    }

}
module.exports = AntiBreak;

/*
{
  "type": "compound",
  "name": "",
  "value": {
    "Damage": {
      "type": "int",
      "value": 0
    },
    "Enchantments": {
      "type": "list",
      "value": {
        "type": "compound",
        "value": [
          {
            "id": {
              "type": "string",
              "value": "efficiency"
            },
            "lvl": {
              "type": "int",
              "value": 5
            }
          },
          {
            "id": {
              "type": "string",
              "value": "silk_touch"
            },
            "lvl": {
              "type": "int",
              "value": 1
            }
          },
          {
            "id": {
              "type": "string",
              "value": "unbreaking"
            },
            "lvl": {
              "type": "int",
              "value": 3
            }
          }
        ]
      }
    }
  }
}


{
  "type": "compound",
  "name": "",
  "value": {
    "Damage": {
      "type": "int",
      "value": 2030
    },
    "Enchantments": {
      "type": "list",
      "value": {
        "type": "compound",
        "value": [
          {
            "id": {
              "type": "string",
              "value": "efficiency"
            },
            "lvl": {
              "type": "int",
              "value": 5
            }
          },
          {
            "id": {
              "type": "string",
              "value": "silk_touch"
            },
            "lvl": {
              "type": "int",
              "value": 1
            }
          },
          {
            "id": {
              "type": "string",
              "value": "unbreaking"
            },
            "lvl": {
              "type": "int",
              "value": 3
            }
          }
        ]
      }
    }
  }
}
 */