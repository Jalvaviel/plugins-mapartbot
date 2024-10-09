const {readdirSync, readFileSync} = require("fs");
const InventoryManager = require("../../utils/InventoryManager/inventoryManager");
const {Nuker} = require("../Nuker/nuker");
const Structure = require("../../utils/StructureUtils/Structure");
const {boundingBox, isInside} = require("../../utils/BlockUtils/boundingBox");
const {Vec3} = require("vec3");
const {scanner, spiral} = require("../../utils/BlockFinder/algorithms");
const {goalWithTimeout} = require("../../utils/BlockFinder/goalWithTimeout");
const { sleep } = require("mineflayer/lib/promise_utils");
const {getMissingMats} = require("../../utils/StructureUtils/VerifyStructure");

class Builder {
    constructor(bot, abort = null, config = JSON.parse(readFileSync('./Builder/options.json')), inventoryManager = new InventoryManager(this.bot), nuker = new Nuker(this.bot), structureFolder = readdirSync('./Maparts').filter(file => file.endsWith('.nbt'))) {
        this.bot = bot;
        this.config = config;
        this.inventoryManager = inventoryManager;
        this.nuker = nuker;
        this.structureFolder = structureFolder;
        this.boundingBox = (this.config.boundingBox === "auto") ? boundingBox(this.bot.entity.position) : [new Vec3(this.config.boundingBox[0],this.config.boundingBox[1],this.config.boundingBox[2]), new Vec3(this.config.boundingBox[3],this.config.boundingBox[4],this.config.boundingBox[5])];
        this.abort = abort;
    }

    nearestBuilderBlock(currentMaterial) {
        if (this.abort) {
            if (this.abort.signal.aborted) return null;
        }
        switch (this.config.searchMode) {
            case "scanner":
                return scanner(this.bot, currentMaterial, this.boundingBox);
                break;
            case "spiral":
                return spiral(this.bot, currentMaterial, this.boundingBox);
                break;
            default:
                return spiral(this.bot, currentMaterial, this.boundingBox);
                break;
        }
    }

    async placeBlock(block, botPos) { // TODO add more modes
        this.bot.emit("placeBlock", {'block': block, 'placing': true });

        let mineflayerItem = await this.bot.inventory.findInventoryItem(block.name,null, false);
        await this.bot.equip(mineflayerItem,"hand");
        if (block.position.distanceTo(botPos) < 1.5) {
            this.bot.setControlState('jump',true);
        }

        switch (this.config.mode) {
            case "airplace":
                await this.bot._genericPlace(block, new Vec3(0,1,0), {swingArm: 'right'}); // We have to use genericPlace because the original public method is constantly raising false errors.
                break;
            default:
                await this.bot._genericPlace(block, new Vec3(0,1,0), {swingArm: 'right'}); // We have to use genericPlace because the original public method is constantly raising false errors.
                break;
        }
        this.bot.setControlState('jump',false);

        this.bot.emit("placeBlock", {'block': block, 'placing': false });
    }
    /*
    async buildInRange(){
        if (!this.bot.inventory.items().map(item => item.name).includes(block.name)) { // Ran out of mats.
            return null;
        }
        let botPos = this.bot.entity.position;
        botPos = new Vec3(Math.floor(botPos.x), Math.floor(botPos.y), Math.floor(botPos.z));
        while (true) {
            let blockFound = false;
            for (let z = botPos.z - this.config.range; z <= botPos.z + this.config.range; z++) {
                for (let x = botPos.x - this.config.range; x <= botPos.x + this.config.range; x++) {
                    for (let y = botPos.y; y <= botPos.y + this.config.range; y++) {
                        const block = this.bot.world.getBlock(new Vec3(x, y, z));
                        if (botPos.distanceTo(block.position) <= this.config.range && block.name === 'air') {
                            await this.placeBlock(this.currentStructure.blockMatrix[x][y][z], botPos); // TODO
                            blockFound = true;
                        }
                    }
                }
            }
            if (!blockFound) {
                break;
            }
        }
    }
     */
    async checkAndRefillMat(material) {
        let mineflayerItem = await this.bot.inventory.findInventoryItem(material, null, false);
        if (!mineflayerItem) {
            const [mat, quant] = await this.inventoryManager.withdrawItems(material, this.materialList[material]);
            this.materialList[material] -= quant;
        }
    }

    async buildStructure(currentStructure, worldStructure) { // TODO take into account the event system.
        this.bot.emit("buildStructure", {'structure': currentStructure, 'building': true });
        this.bot.yawSpeed = this.config.cameraSpeed;
        this.bot.pitchSpeed = this.config.cameraSpeed;
        //this.currentStructure = currentStructure;
        //this.worldStructure = worldStructure;
        this.materialList = getMissingMats(currentStructure.materialList,worldStructure.materialList);
        for (let material of Object.keys(this.materialList)) {
            if (this.abort) {
                if (this.abort.signal.aborted) return null;
            }
            let nbb = this.nearestBuilderBlock(material);
            while (nbb) {
                await this.checkAndRefillMat(material);
                await sleep(1);
                const playerPos = this.bot.entity.position.floored();
                const nbbPos = nbb.position;
                if (nbbPos.distanceTo(playerPos) > this.config.range) {
                    await goalWithTimeout(this.bot,nbbPos)
                }
                await this.placeBlock(nbb, playerPos);
                nbb = this.nearestBuilderBlock(material);
            }
        }
        this.bot.emit("buildStructure", {'structure': currentStructure, 'building': false });
    }
    async buildStructures(){ // TODO take into account the event system.
        for (let structureFile of this.structureFolder) {
            const structureNBT = JSON.parse(readFileSync(structureFile));
            const structure = new Structure.FromNBT(structureNBT, this.boundingBox[0]);
            //await this.nuker.nukeArea(); // Nuke first TODO mine only strictly necessary blocks
            await this.buildStructure(structure); // Build next
            //await this.mapStructure(structure); // Use a map, fix it, and deposit it
        }
    }
}