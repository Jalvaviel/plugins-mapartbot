const { Vec3 } = require("vec3");
const { sleep } = require("mineflayer/lib/promise_utils");
const { scanner, spiral } = require('../BlockFinder/algorithms');
const { goalWithTimeout } = require("../BlockFinder/goalWithTimeout");
const { readFileSync} = require("fs");
const { boundingBox, isInside } = require("../BlockUtils/boundingBox");
const PriorityEvent = require("../Utils/old/PriorityEvent");
const {EventStatus} = require("../Utils/EventStatus");

class Nuker {
    constructor(bot, abort = null, config = JSON.parse(readFileSync("./Nuker/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.nukerPacketCount = 0;
        if (this.config.boundingBox === "auto") {
            this.boundingBox = boundingBox(this.bot.entity.position);
        } else {
            this.boundingBox = new Vec3(this.config.boundingBox[0],this.config.boundingBox[1],this.config.boundingBox[2]);
        }
        //this.boundingBox = this.config.boundingBox === "auto" ? boundingBox(this.bot.entity.position) : new Vec3(this.config.boundingBox[0],this.config.boundingBox[1],this.config.boundingBox[2]);
        this.abort = abort;
    }
    
    async equipBestTool(block) {
        const pickaxes = [
            this.bot.registry.itemsByName['wooden_pickaxe'].id,
            this.bot.registry.itemsByName['stone_pickaxe'].id,
            this.bot.registry.itemsByName['golden_pickaxe'].id,
            this.bot.registry.itemsByName['iron_pickaxe'].id,
            this.bot.registry.itemsByName['diamond_pickaxe'].id,
            this.bot.registry.itemsByName['netherite_pickaxe'].id
        ];

        const axes = [
            this.bot.registry.itemsByName['wooden_axe'].id,
            this.bot.registry.itemsByName['stone_axe'].id,
            this.bot.registry.itemsByName['golden_axe'].id,
            this.bot.registry.itemsByName['iron_axe'].id,
            this.bot.registry.itemsByName['diamond_axe'].id,
            this.bot.registry.itemsByName['netherite_axe'].id
        ];

        const shovels = [
            this.bot.registry.itemsByName['wooden_shovel'].id,
            this.bot.registry.itemsByName['stone_shovel'].id,
            this.bot.registry.itemsByName['golden_shovel'].id,
            this.bot.registry.itemsByName['iron_shovel'].id,
            this.bot.registry.itemsByName['diamond_shovel'].id,
            this.bot.registry.itemsByName['netherite_shovel'].id
        ];

        const hoes = [
            this.bot.registry.itemsByName['wooden_hoe'].id,
            this.bot.registry.itemsByName['stone_hoe'].id,
            this.bot.registry.itemsByName['golden_hoe'].id,
            this.bot.registry.itemsByName['iron_hoe'].id,
            this.bot.registry.itemsByName['diamond_hoe'].id,
            this.bot.registry.itemsByName['netherite_hoe'].id
        ];

        let bestTool = null;

        try {
            const blockMaterial = block.material;

            if (blockMaterial.includes("mineable/pickaxe")) {
                for (let tool of pickaxes) {
                    const selectedTool = await this.bot.inventory.findInventoryItem(tool, null, false);
                    if (selectedTool !== null) {
                        bestTool = selectedTool;
                    }
                }
            } else if (blockMaterial.includes("mineable/axe")) {
                for (let tool of axes) {
                    const selectedTool = await this.bot.inventory.findInventoryItem(tool, null, false);
                    if (selectedTool !== null) {
                        bestTool = selectedTool;
                    }
                }
            } else if (blockMaterial.includes("mineable/shovel")) {
                for (let tool of shovels) {
                    const selectedTool = await this.bot.inventory.findInventoryItem(tool, null, false);
                    if (selectedTool !== null) {
                        bestTool = selectedTool;
                    }
                }
            } else if (blockMaterial.includes("mineable/hoe")) {
                for (let tool of hoes) {
                    const selectedTool = await this.bot.inventory.findInventoryItem(tool, null, false);
                    if (selectedTool !== null) {
                        bestTool = selectedTool;
                    }
                }
            } else if (blockMaterial.includes("default")) {
                for (let item of this.bot.inventory.items()) {
                    if (this.config.saveUses) {
                        if (!pickaxes.includes(item.type) && !axes.includes(item.type) && !shovels.includes(item.type) && !hoes.includes(item.type)) {
                            bestTool = item;
                        }
                    }
                }
            }

            if (bestTool !== null) {
                await this.bot.equip(bestTool, "hand");
                this.nukerPacketCount++;
            }

        } catch (e) {
            console.error(e);
        }
    }
    
    async _breakWithPacket(block){
        this.nukerPacketCount += (this.bot.digTime(block) > 50) ? 3 : 1
        await this.equipBestTool(block);
        if (this.bot.digTime(block) < 50) {
            this.bot._client.write('block_dig', {
                status: 0, // start digging
                location: block.position,
                face: 1
            });
        } else {
            this.bot._client.write('block_dig', {
                status: 2, // stop digging
                location: block.position,
                face: 1
            });
            this.bot._client.write('block_dig', {
                status: 0, // start digging
                location: block.position,
                face: 1
            });
            this.bot._client.write('block_dig', {
                status: 2, // stop digging
                location: block.position,
                face: 1
            });
        }
    }
    
    canMine(block) {
        const packetCount = (this.bot.digTime(block) > 50) ? 3 : 1;
        return !(this.nukerPacketCount >= this.config.nukerPacketLimit || this.nukerPacketCount + packetCount >= this.config.nukerPacketLimit);
    }
    async breakBlock(block){
        this.bot.emit("breakBlock", {'block': block, 'breaking': true});
        switch (this.config.mode) {
            case "packet":
                await this._breakWithPacket(block);
                break;
            default:
                await this.bot.dig(block);
                break;
        }
        this.bot.emit("breakBlock", {'block': block, 'breaking': false});
    }
    
    async nukeInRange(){
        let botPos = this.bot.entity.position;
        botPos = new Vec3(Math.floor(botPos.x), Math.floor(botPos.y), Math.floor(botPos.z));
        while (true) {
            /*while(this.nukerPacketCount > 0) {
                this.nukerPacketCount--;
            }
             */
            let blockFound = false;
            for (let z = botPos.z - this.config.range; z <= botPos.z + this.config.range; z++) {
                for (let x = botPos.x - this.config.range; x <= botPos.x + this.config.range; x++) {
                    for (let y = botPos.y; y <= botPos.y + this.config.range; y++) {
                        const block = this.bot.world.getBlock(new Vec3(x, y, z));
                        if (botPos.distanceTo(block.position) <= this.config.range) {
                            if (!this.config.excludes.includes(block.name) && isInside(block, this.boundingBox) && block.name !== 'air') {
                                if (this.canMine(block)) {
                                    await this.breakBlock(block);
                                } else {
                                    this.nukerPacketCount--;
                                    await sleep(this.config.cooldown);
                                }
                                blockFound = true;
                            }
                        }
                    }
                }
            }
            if (!blockFound) {
                break;
            }
        }
    }

    nearestNukerBlock() {
        if (this.abort) {
            if (this.abort.signal.aborted) return null;
        }
        switch (this.config.searchMode) {
            case "scanner":
                return scanner(this.bot, this.config.excludes, this.boundingBox);
                break;
            case "spiral":
                return spiral(this.bot, this.config.excludes, this.boundingBox);
                break;
            default:
                return spiral(this.bot, this.config.excludes, this.boundingBox);
                break;
        }
    }

    async nukeArea(){
        this.bot.emit("nuker", true);
        let nnb = this.nearestNukerBlock();
        while (nnb) {
            await sleep(1);
            const playerPos = this.bot.entity.position.floored();
            const nnbPos = nnb.position;
            if (nnbPos.distanceTo(playerPos) > this.config.range) {
                await goalWithTimeout(this.bot,nnbPos)
            }
            await this.nukeInRange();
            nnb = this.nearestNukerBlock();
        }
        this.bot.emit("nuker", false);
        console.log("Done nuking area...");
    }
}

function createNuker(priorityQueue, bot, priority = 6) {
    let abortController = new AbortController();
    const nukerObj = new Nuker(bot, abortController);
    const nukerEvent = new PriorityEvent("Nuker", () => nukerObj.nukeArea(), priority, EventStatus.PENDING, abortController);
    priorityQueue.enqueue(nukerEvent);
}

module.exports = { Nuker, createNuker };

/*
function nuker(bot, range = 4, excludes = [], boundingBox = [new Vec3(-64, -60, 64), new Vec3(-64 + 128, -58, 64 + 128)], options = { nukerPacketLimit: 10, mode: 'packet' }, priority = 3) {
    const event = {
        name: 'nuker',
        action: async () => await nukeArea(bot, range, excludes, boundingBox, options),
        priority: priority,
        abortController: new AbortController(),
        status: EventStatus.PENDING
    };
    bot.eventEmitter.pushEvent(event);
}
 */


