const {readdirSync, readFileSync} = require("fs");
const InventoryManager = require("../../utils/InventoryManager/inventoryManager");
const {Nuker} = require("../Nuker/nuker");
const Structure = require("../../utils/Structures/Structure");
const {boundingBox, isInside} = require("../../utils/BlockUtils/boundingBox");
const {Vec3} = require("vec3");
const {scanner, spiral} = require("../../utils/BlockFinder/algorithms");
const {goalWithTimeout} = require("../../utils/BlockFinder/goalWithTimeout");
const { sleep } = require("mineflayer/lib/promise_utils");
const {getMissingMats, parseNbt} = require("../../utils/Structures/StructureUtils");
const {depositItems} = require("../../utils/BlockFinder/storage");
const {resolve} = require("path");

class Builder {
    constructor(bot, config = JSON.parse(readFileSync('./modules/Builder/config.json'))) {
        this.bot = bot;
        this.config = config;
        this.boundingBox = this.config.boundingBox === "auto"
            ? boundingBox(this.bot.entity.position)
            : [new Vec3(...this.config.boundingBox.slice(0, 3)), new Vec3(...this.config.boundingBox.slice(3, 6))];

        this.inventoryManager = new InventoryManager(this.bot);
        this.nuker = new Nuker(this.bot);

        this.structureFolder = readdirSync(resolve(this.config.structureFolder)).filter(file => file.endsWith('.nbt'));
        this.materialList = null;

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
        this.bot.on('depositItems', (depositItemsObj) => {
            if (this.isActive) {
                if (depositItemsObj.depositing) {
                    this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                }
            }
        });
        this.bot.on('withdrawItems', (withdrawItemsObj) => {
            if (this.isActive) {
                if (withdrawItemsObj.withdrawing) {
                    this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                }
            }
        });
    }

    async activate() {
        this.isActive = true;
        await this.buildStructures() // TODO
    }
    async deactivate() { // TODO take into account when the whole folder of structures is built.
        this.isActive = false;
    }

    nearestBuilderBlock(currentMaterial) {
        switch (this.config.searchMode) { // TODO RETURNS NULL
            case "scanner":
                return scanner(this.bot, currentMaterial, this.boundingBox);
                break;
            case "spiral":
                return spiral(this.bot, this.config.blockMode, currentMaterial, this.boundingBox);
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
            let nbb = this.nearestBuilderBlock(material);
            while (nbb) {
                if (this.stop) return;
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

    async buildStructures(){ // TODO Add an atribute to keep track of built structures
        for (let structureFile of this.structureFolder) {
            const structureNBT = await parseNbt(this.config.structureFolder+"/"+structureFile);
            const currentStructure = await Structure.FromNBT(structureNBT, this.boundingBox);
            const worldStructure = await Structure.FromWorld(this.bot.world, this.boundingBox);
            //await this.nuker.nukeArea(); // Nuke first TODO mine only strictly necessary blocks
            await this.buildStructure(currentStructure, worldStructure); // Build next
            //await this.mapStructure(structure); // Use a map, fix it, and deposit it
        }
    }
}

module.exports = { Builder }