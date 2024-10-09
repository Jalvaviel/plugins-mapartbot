const { Vec3 } = require("vec3");
const { sleep } = require("mineflayer/lib/promise_utils");
const { scanner, spiral } = require('../../utils/BlockFinder/algorithms');
const { goalWithTimeout } = require("../../utils/BlockFinder/goalWithTimeout");
const { readFileSync} = require("fs");
const { boundingBox, isInside } = require("../../utils/BlockUtils/boundingBox");
const { offsetFromWorldBlock } = require("../../utils/StructureUtils/VerifyStructure");

class Nuker {
    constructor(bot, structure = null, config = JSON.parse(readFileSync("./modules/Nuker/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.nukerPacketCount = 0;
        this.boundingBox = this.config.boundingBox === "auto"
            ? boundingBox(this.bot.entity.position)
            : [new Vec3(...this.config.boundingBox.slice(0, 3)), new Vec3(...this.config.boundingBox.slice(3, 6))];
        this.structure = structure;
        //this.miningBlocks = [];
        this.blockTimeoutList = [];
        this.stop = false;
        this.addListeners();
    }

    addListeners() {
        this.bot.on('eat', (eatEvent) => {
            if (eatEvent.eating) {
                this.stop = true;
                this.bot.pathfinder.stop();
            } else {
                this.stop = false;
            }
        });

        this.bot.on('replenishTools', (replenishEvent) => {
            if (replenishEvent.replenishing) {
                this.stop = true;
                this.bot.pathfinder.stop();
            } else {
                this.stop = false;
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

    _breakWithPacket(block){
        const breakingTime = this.bot.digTime(block);
        //console.log("Digtime of block:",block.name,block.position,breakingTime);
        const mineThreshold = this.config.instaMineThreshold;
        const miningBlock = {"block": block, "ttm": breakingTime, "timeout": Date.now()}
        if (breakingTime > mineThreshold) { // TODO, looks like the problem might lie here
            //console.log("The block is not instaminable (breakingTime > mineThreshold)", breakingTime);
            this.blockTimeoutList.push(miningBlock);
            this.bot._client.write('block_dig', {
                status: 0, // start digging
                location: block.position,
                face: 1
            });
            this.bot._client.write('block_dig', {
                status: 1, // abort digging
                location: block.position,
                face: 1
            });
            this.bot._client.write('block_dig', {
                status: 2, // stop digging
                location: block.position,
                face: 1
            });
        }

        if (breakingTime <= mineThreshold) {
            if (breakingTime > 50) {
                //console.log("The block can be instamined by cheating the system", breakingTime);
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
            } else {
                //console.log("The block can be instamined always",breakingTime);
                this.bot._client.write('block_dig', {
                    status: 0, // start digging
                    location: block.position,
                    face: 1
                });
            }
        }
        this.nukerPacketCount += (this.bot.digTime(block) > 50) ? 3 : 1
    }

    canMine(block) {
        if (this.config.miningMode !== "packet") return true;
        const packetCount = (this.bot.digTime(block) > 50) ? 3 : 1;
        if (this.structure) { // Clear plot mode
            const offset = offsetFromWorldBlock(this.boundingBox, block, this.structure);
            const structBlock = this.structure.blockMatrix[offset.x][offset.y][offset.z];
            if (structBlock.name === block.name) {
                return false;
            }
        }
        if (this.blockTimeoutList.length >= this.config.miningBlockBufferSize) return false;
        if (this.blockTimeoutList.length > 0 && block.position.equals(this.blockTimeoutList[0].block.position)) return false;
        if (this.nukerPacketCount >= this.config.nukerPacketLimit) return false;
        if (this.nukerPacketCount + packetCount >= this.config.nukerPacketLimit) return false;
        for (let blockWithTimeout of this.blockTimeoutList) {
            if (block.position.equals(blockWithTimeout.block.position)) return false;
        }
        return true;

    }

    async breakBlock(block){
        while (this.stop) sleep(100);
        this.bot.emit("breakBlock", {'block': block, 'breaking': true});
        switch (this.config.miningMode) {
            case "packet":
                await this.equipBestTool(block);
                await sleep(1);
                if (!this.canMine(block)) break;
                this._breakWithPacket(block);
                //await sleep(100);
                break;
            default:
                this.bot.yawSpeed = 1000;
                this.bot.pitchSpeed = 1000;
                await this.equipBestTool(block);
                await this.bot.dig(block);
                break;
        }
        this.bot.emit("breakBlock", {'block': block, 'breaking': false});
    }

    getBlocksInRange() { // Doesn't work, sometimes takes air blocks and believes they're another thing.
        let botPos = this.bot.entity.position;
        let blockList = [];
        botPos = new Vec3(Math.floor(botPos.x), Math.floor(botPos.y), Math.floor(botPos.z));
        for (let z = botPos.z - this.config.range; z <= botPos.z + this.config.range; z++) {
            for (let x = botPos.x - this.config.range; x <= botPos.x + this.config.range; x++) {
                for (let y = botPos.y; y <= botPos.y + this.config.range; y++) {
                    const block = this.bot.world.getBlock(new Vec3(x, y, z));
                    if (botPos.distanceTo(block.position) <= this.config.range) {
                        const blockMode = (this.config.blockMode === "includes" && this.config.includes.includes(block.name)) ||
                            (this.config.blockMode === "excludes" && !this.config.excludes.includes(block.name));
                        if (blockMode && isInside(block, this.boundingBox) && block.name !== 'air') { //blockmode
                            blockList.push(block);
                        }
                    }
                }
            }
        }
        return blockList;
    }

    sortBlocks(blockList) {
        return blockList.sort((a, b) => a.material.localeCompare(b.material));
    }

    updateMiningBlocks() {
        this.blockTimeoutList = this.blockTimeoutList.filter(blockWithTimeout => { // Blocks which aren't breaking or have the same blockstate (same type of block) are filtered out.
            const date = Date.now();
            const isBreaking = blockWithTimeout.timeout + this.config.blockTimeoutDelay + blockWithTimeout.ttm <= date ; // TODO FAILS THE COMPARISON
            const isSameState = this.bot.world.getBlock(blockWithTimeout.block.position).name === blockWithTimeout.block.name;
            return isBreaking && isSameState;
        });
    }
    async nukeInRange() {
        while (true) {
            while (this.stop) sleep(100);
            const blocks = this.sortBlocks(this.getBlocksInRange()); // TODO WORKS
            let foundMineableBlock = false;
            if (blocks.length === 0 && this.blockTimeoutList.length === 0) return;
            if (this.config.miningMode === "packet") { // This is empty the first iteration, the following ones can have multiple blockTimeouts
                this.updateMiningBlocks();
                this.nukerPacketCount = 0;
            }
            for (let block of blocks) {
                await this.breakBlock(block); // TODO DOESN'T WORK
            }
        }
    }

    nearestNukerBlock() { // TODO WORKS
        const filter = this.config.blockMode === "includes" ? this.config.includes : this.config.excludes;
        switch (this.config.searchMode) {
            case "scanner":
                return scanner(this.bot, this.config.blockMode, filter, this.boundingBox); // TODO change
                break;
            case "spiral":
                return spiral(this.bot, this.config.blockMode, filter, this.boundingBox);
                break;
            default:
                return spiral(this.bot, this.config.blockMode, filter, this.boundingBox);
                break;
        }
    }

    async nukeArea(){
        this.bot.emit("nukeArea", { nuker: this, nuking: true });
        let nnb = this.nearestNukerBlock();
        while (nnb) {
            while (this.stop) sleep(100);
            const playerPos = this.bot.entity.position.floored();
            const nnbPos = nnb.position;
            if (nnbPos.distanceTo(playerPos) > this.config.range) {
                await goalWithTimeout(this.bot,nnbPos)
            }
            await this.nukeInRange();
            nnb = this.nearestNukerBlock();
        }
        this.bot.emit("nukeArea", { nuker: this, nuking: false });
        console.log("Done nuking area...");
    }

    async activate() {
        await this.nukeArea();
    }
}

/*
function createNuker(priorityQueue, bot, priority = 6) {
    let abortController = new AbortController();
    const nukerObj = new Nuker(bot, abortController);
    const nukerEvent = new PriorityEvent("Nuker", () => nukerObj.nukeArea(), priority, EventStatus.PENDING, abortController);
    priorityQueue.enqueue(nukerEvent);
}
 */

module.exports = { Nuker };



