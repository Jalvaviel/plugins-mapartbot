const { Vec3 } = require("vec3");
const { sleep } = require("mineflayer/lib/promise_utils");
const { scanner, spiral } = require('../../utils/BlockFinder/algorithms');
const { goalWithTimeout } = require("../../utils/BlockFinder/goalWithTimeout");
const { readFileSync} = require("fs");
const { boundingBox, isInside } = require("../../utils/BlockUtils/boundingBox");
const { offsetFromWorldBlock } = require("../../utils/Structures/StructureUtils");

class Nuker {
    constructor(bot, structure = null, config = JSON.parse(readFileSync("./modules/Nuker/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.bot.physics.yawSpeed = 1000;
        this.bot.physics.pitchSpeed = 1000;
        this.boundingBox = this.config.boundingBox === "auto"
            ? boundingBox(this.bot.entity.position)
            : [new Vec3(...this.config.boundingBox.slice(0, 3)), new Vec3(...this.config.boundingBox.slice(3, 6))];
        this.structure = structure;
        this.isActive = false;
        this.stop = false;
        this.addListeners();
    }

    addListeners() {
        this.bot.on('eat', async (eatEvent) => {
            if (this.isActive) {
                if (eatEvent.eating) {
                    this.stop = true;
                    this.bot.pathfinder.stop();
                } else {
                    this.stop = false;
                    await this.activate();
                }
            }
        });

        this.bot.on('replenishTools', async (replenishEvent) => {
            if (this.isActive) {
                if (replenishEvent.replenishing) {
                    this.stop = true;
                    this.bot.pathfinder.stop();
                } else {
                    this.stop = false;
                    await this.activate();
                }
            }
        });
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
                //console.log(bestTool.name,block.name,block.position);
                this.nukerPacketCount++;
            }

        } catch (e) {
            console.error(e);
        }
    }

    async breakBlock(block){
        if (this.stop) return;
        this.bot.emit("breakBlock", {'block': block, 'breaking': true});
        switch (this.config.miningMode) {
            case "packet":
                throw new Error("Not implemented on this version.")
            default:
                await this.equipBestTool(block);
                try {
                    await this.bot.dig(block);
                } catch (e) {}
                break;
        }
        this.bot.emit("breakBlock", {'block': block, 'breaking': false});
    }

    nearestNukerBlock() {
        const filter = this.config.blockMode === "includes" ? this.config.includes : this.config.excludes;
        switch (this.config.searchMode) {
            case "scanner":
                return scanner(this.bot, this.config.blockMode, filter, this.boundingBox); // TODO change
            case "spiral":
                return spiral(this.bot, this.config.blockMode, filter, this.boundingBox, this.structure);
            default:
                return spiral(this.bot, this.config.blockMode, filter, this.boundingBox, this.structure);
        }
    }

    async nukeArea(){
        this.bot.emit("nukeArea", { nuker: this, nuking: true });
        let nnb = this.nearestNukerBlock();
        while (nnb) {
            //while (this.stop) sleep(100);
            if (this.stop) return;
            const playerPos = this.bot.entity.position; //.floored();
            const nnbPos = nnb.position;
            if (nnbPos.distanceTo(playerPos) > this.config.range) {
                await goalWithTimeout(this.bot,nnbPos)
            }
            await this.breakBlock(nnb);
            nnb = this.nearestNukerBlock();
        }
        this.bot.emit("nukeArea", { nuker: this, nuking: false });
        console.log("Done nuking area...");
    }

    async activate() {
        this.isActive = true;
        await this.nukeArea();
    }

    async deactivate() {
        this.isActive = false;
    }

}

module.exports = { Nuker };



