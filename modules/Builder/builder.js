const {readdirSync, readFileSync} = require("fs");
const InventoryManager = require("../../utils/InventoryManager/inventoryManager");
const {Nuker} = require("../Nuker/nuker");
const Structure = require("../../utils/Structures/Structure");
const {boundingBox, isInside} = require("../../utils/BlockUtils/boundingBox");
const {Vec3} = require("vec3");
const {scanner, spiral} = require("../../utils/BlockFinder/algorithms");
const {goalWithDelta, goalWithTimeout} = require("../../utils/BlockFinder/goalWithTimeout");
const { sleep } = require("mineflayer/lib/promise_utils");
const {getMissingMats, parseNbt} = require("../../utils/Structures/StructureUtils");
const {resolve} = require("path");

class Builder {
    constructor(bot, nuker = null, config = JSON.parse(readFileSync('./modules/Builder/config.json'))) {
        this.bot = bot;
        this.config = config;
        this.boundingBox = this.config.boundingBox === "auto"
            ? boundingBox(this.bot.entity.position)
            : [new Vec3(...this.config.boundingBox.slice(0, 3)), new Vec3(...this.config.boundingBox.slice(3, 6))];
        this.inventoryManager = new InventoryManager(this.bot);
        this.nuker = nuker;

        this.structureFolder = readdirSync(resolve(this.config.structureFolder)).filter(file => file.endsWith('.nbt'));
        this.materialList = null;
        this.lastBlock = null;

        this.bot.physics.yawSpeed = 1000;
        this.bot.physics.pitchSpeed = 1000;

        this.stop = false;
        this.isActive = false;
        this.addListeners();
    }

    addListeners() {
        this.bot.on('eat', async (eatEvent) => {
            if (this.isActive) {
                if (eatEvent.eating) {
                    //console.log("eating")
                    this.stop = true;
                    try {this.bot.pathfinder.stop()} catch (e) {}
                } else {
                    this.stop = false;
                    await this.activate();
                }
            }
        });

        this.bot.on('depositItems', async (depositItemsObj) => {
            if (this.isActive) {
                if (depositItemsObj.depositing) {
                    console.log(depositItemsObj)
                    //this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                    //await this.activate();
                }
            }
        });
        this.bot.on('withdrawItems', async (withdrawItemsObj) => {
            if (this.isActive) {
                if (withdrawItemsObj.withdrawing) {
                    console.log(withdrawItemsObj)
                    //this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                    //await this.activate(); // TODO PROBLEM HERE HANDLED ON CHECKANDREFILLMAT METHOD
                }
            }
        });

    }

    async activate() {
        this.bot.yawSpeed = this.config.cameraSpeed;
        this.bot.pitchSpeed = this.config.cameraSpeed;
        this.isActive = true;
        await this.buildStructures() // TODO
    }
    async deactivate() { // TODO take into account when the whole folder of structures is built.
        this.isActive = false;
    }

    nearestBuilderBlock(currentMaterial, currentStructure) {
        switch (this.config.searchMode) { // TODO RETURNS NULL
            case "scanner":
                return scanner(this.bot, currentMaterial, this.boundingBox);
                break;
            case "spiral":
                return spiral(this.bot, this.config.blockMode, currentMaterial, this.boundingBox, currentStructure, this.lastBlock);
                break;
            default:
                return spiral(this.bot, currentMaterial, this.boundingBox);
                break;
        }
    }

    async equipAndPlaceBlock(block, botPos) { // TODO add more modes
        //await this.checkAndRefillMat(block.name);
        if (this.stop) return;
        this.bot.emit("placeBlock", {'block': block, 'placing': true });
        // Anti Doubles if (this.lastBlock && block.position === this.lastBlock.position) { return } // Anti Doubles
        try {
            let mineflayerItem = await this.bot.inventory.findInventoryItem(block.name, null, false);
            await this.bot.equip(mineflayerItem, "hand");
        } catch (e) { // Edge case Likely error: placed a double block and ran out of mats.
            console.log(e) // e.message.includes('Invalid item object in equip')
            return;
        }
        if (block.position.distanceTo(botPos) < 1.5) {
            this.bot.setControlState('jump',true);
        }
        if (this.stop) return;
        switch (this.config.mode) {
            case "airplace":
                //console.log("Placing block:",block.name,block.position);
                //await this.bot.placeBlock(block, new Vec3(0,1,0), {swingArm: 'right'})
                await this.bot._genericPlace(block, new Vec3(0,1,0), {swingArm: 'right'}); // We have to use genericPlace because the original public method is constantly raising false errors.
                break;
            default:
                await this.bot._genericPlace(block, new Vec3(0,1,0), {swingArm: 'right'}); // We have to use genericPlace because the original public method is constantly raising false errors.
                break;
        }
        this.bot.setControlState('jump',false);
        this.lastBlock = block;
        //await sleep(20);

        this.bot.emit("placeBlock", {'block': block, 'placing': false });
    }

    async checkAndRefillMat(material) {
        if (this.stop) return;
        let mineflayerItem = await this.bot.inventory.findInventoryItem(material, null, false);
        if (!mineflayerItem) {
            const [mat, quant] = await this.inventoryManager.withdrawItems(material, this.materialList[material]);
            this.materialList[material] -= quant;
        }
    }

    async buildStructure(currentStructure, worldStructure) { // TODO take into account the event system.
        this.bot.emit("buildStructure", {'structure': currentStructure, 'building': true });
        if (!this.materialList) { // In case another event occurs
            this.materialList = getMissingMats(currentStructure.materialList,worldStructure.materialList);
        }
        for (let material of Object.keys(this.materialList)) {
            let nbb = this.nearestBuilderBlock(material, currentStructure);
            while (nbb !== null) {
                if (this.stop) return;
                await this.checkAndRefillMat(material);
                const playerPos = this.bot.entity.position.floored();
                const nbbPos = nbb.position;
                if (nbbPos.distanceTo(playerPos) > this.config.range) {
                    if (this.stop) return;
                    await goalWithDelta(this.bot,nbbPos,3);
                }
                await this.equipAndPlaceBlock(nbb, playerPos);
                nbb = this.nearestBuilderBlock(material, currentStructure);
            }
            delete this.materialList[material];
        }
        this.bot.emit("buildStructure", {'structure': currentStructure, 'building': false });
    }

    async buildStructures(){ // TODO Add an attribute to keep track of built structures
        for (let structureFile of this.structureFolder) {
            const structureNBT = await parseNbt(this.config.structureFolder+"/"+structureFile);
            const currentStructure = await Structure.FromNBT(structureNBT, this.boundingBox);
            const worldStructure = await Structure.FromWorld(this.bot.world, this.boundingBox);
            //await this.nuker.activate() // Nuke first TODO mine only strictly necessary blocks
            await this.buildStructure(currentStructure, worldStructure); // Build next
            //await this.mapStructure(structure); // Use a map, fix it, and deposit it
        }
    }
}

module.exports = { Builder }

/*
--------------Debug--------------

C:\Users\Usuario\Desktop\plugins-mapartbot\utils\Structures\StructureUtils.js:28
    return structure.blockMatrix[offsetX][offsetY][offsetZ];
                                                  ^

TypeError: Cannot read properties of undefined (reading '105')
    at offsetFromWorldBlock (C:\Users\Usuario\Desktop\plugins-mapartbot\utils\Structures\StructureUtils.js:28:51)
    at spiral (C:\Users\Usuario\Desktop\plugins-mapartbot\utils\BlockFinder\algorithms.js:161:33)
    at Builder.nearestBuilderBlock (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:90:24)
    at Builder.buildStructure (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:151:28)
    at async Builder.buildStructures (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:164:13)
    at async Builder.activate (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:78:9)
    at async EventEmitter.<anonymous> (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:44:21)

 */