const {readFileSync} = require("fs");
const  {boundingBox} = require("../BlockUtils/boundingBox");
const  {Vec3} = require("vec3");
const stringToId = require("../stringToId");
const { sleep } = require("mineflayer/lib/promise_utils");
const {PathfinderPlus} = require("../Pathfinder/pathfinderPlus");

class StorageSystem {
    constructor(world, boundingBox, size, materials = JSON.parse(readFileSync("./utils/InventoryManager/materials.json"))){
        this.world = world
        this.boundingBox = boundingBox;
        this.size = size;
        this.materials = materials;
    }

    static fromCardinal(world, cardinal, botPos, size){
        const bbox = boundingBox(botPos,size.y);
        let corner1, corner2;
        // We always take the z component in this case as depth, looking from the player's perspective inside the map plot. It is auto rotated in this case.
        // We will assume the width (component X) is always 128 ( Map plot size ) in this case.
        switch (cardinal) {
            case "north":
                corner1 = new Vec3(bbox[0].x, bbox[0].y-1, bbox[0].z - size.z);
                corner2 = new Vec3(bbox[1].x, bbox[1].y, bbox[0].z);
                return new StorageSystem(world,[corner1,corner2],size);
            case "south":
                corner1 = new Vec3(bbox[0].x, bbox[0].y-1, bbox[1].z);
                corner2 = new Vec3(bbox[1].x, bbox[1].y, bbox[1].z + size.z);
                return new StorageSystem(world,[corner1,corner2],size);
            case "west":
                corner1 = new Vec3(bbox[0].x - size.z, bbox[0].y-1, bbox[0].z);
                corner2 = new Vec3(bbox[0].x, bbox[1].y, bbox[1].z);
                return new StorageSystem(world,[corner1,corner2],size);
            case "east":
                corner1 = new Vec3(bbox[1].x, bbox[0].y-1, bbox[0].z);
                corner2 = new Vec3(bbox[1].x + size.z, bbox[1].y, bbox[1].z);
                return new StorageSystem(world,[corner1,corner2],size);
            default:
                corner1 = new Vec3(bbox[0].x, bbox[0].y-1, bbox[0].z - size.z);
                corner2 = new Vec3(bbox[1].x, bbox[1].y, bbox[0].z);
                return new StorageSystem(world,[corner1,corner2],size);
        }
    }
    static fromList(world, list, size) {
        return new StorageSystem(world,[
            new Vec3(list[0][0],list[0][1],list[0][2]),
            new Vec3(list[1][0],list[1][1],list[1][2])
        ], size);
    }

    async getMaterialChest(material) {
        const searchBlock = Object.keys(this.materials).includes(material) ? this.materials[material] : material;
        for (let z = this.boundingBox[0].z; z <= this.boundingBox[1].z; z++) {
            for (let x = this.boundingBox[0].x; x <= this.boundingBox[1].x; x++) {
                for (let y = this.boundingBox[0].y; y <= this.boundingBox[1].y; y++) {
                    if (this.world.getBlock(new Vec3(x,y,z)).name === searchBlock && this.world.getBlock(new Vec3(x,y+1,z)).name === 'chest') {
                        return this.world.getBlock(new Vec3(x,y+1,z));
                    }
                }
            }
        }
        console.log("Chest wasn't found...")
        return null;
    }
}

class InventoryManager {
    constructor(bot, config = JSON.parse(readFileSync("./utils/InventoryManager/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.pathfinderPlus = new PathfinderPlus(this.bot);
        this.storageSystem = this.setStorageSystem();
    }
    setStorageSystem(){
        const cardiB = ["north","south","east","west"];
        if (cardiB.includes(this.config.storageSystemPosition)) {
            return StorageSystem.fromCardinal(this.bot.world, this.config.storageSystemPosition, this.bot.entity.position, new Vec3(this.config.storageSystemSize[0],this.config.storageSystemSize[1],this.config.storageSystemSize[2]));
        } else {
            return StorageSystem.fromList(this.bot.world, this.config.storageSystemPosition, new Vec3(this.config.storageSystemSize[0],this.config.storageSystemSize[1],this.config.storageSystemSize[2]));
        }
    }

    async depositItems(material, quantity, withNbt = null) {
        this.bot.emit("depositItems", {material: material, quantity: quantity, depositing: true});
        const sorterChest = this.config.hasSorter ? await this.storageSystem.getMaterialChest(this.config.sorterBlock)
            : await this.storageSystem.getMaterialChest(material);
        if (!sorterChest) return null;
        const materialId = stringToId(this.bot.registry, material);  // Mineflayer has a problem with numerical Ids. Mojang started to get rid of them 10 years ago.
        if (!this.bot.pathfinder.isMoving()) {
            await this.pathfinderPlus.goalWithDelta(sorterChest.position);
        }
        try {
            const sorterChestInventory = await this.bot.openContainer(sorterChest);
            await sorterChestInventory.deposit(materialId, null, quantity, withNbt);
            sorterChestInventory.close();
        } catch (e) {
            console.log(e)
            // Chest is full.
            // Todo check other fallback chests.
        }

        this.bot.emit("depositItems", {material: material, quantity: quantity, depositing: false});
        return [material, quantity];
    }

    async withdrawItems(material, quantity, withNbt = null){
        this.bot.emit("withdrawItems", {material: material, quantity: quantity, withdrawing: true});
        const sorterChest = await this.storageSystem.getMaterialChest(material);
        if (!sorterChest) return null;
        quantity = quantity >= this.config.maxWithdraw ? this.config.maxWithdraw : quantity;
        const materialId = stringToId(this.bot.registry, material);  // Mineflayer has a problem with numerical Ids. Mojang started to get rid of them 10 years ago.
        if (!this.bot.pathfinder.isMoving()) {
            await this.pathfinderPlus.goalWithDelta(sorterChest.position);
        }
        let sorterChestInventory;
        try {
            sorterChestInventory = await this.bot.openContainer(sorterChest);
            await sorterChestInventory.withdraw(materialId, null, quantity); //withNbt
            sorterChestInventory.close();
        } catch (e) {
            if (e.message.includes("Can't find ")){ // Edge case, error: "Can't find ´material_name´ in slots [0 - 27], (item id: ´material_id´)" -> Caused by taking all items from the chest, just ignore.
                sorterChestInventory.close();
            }
            if (e.message.includes("Event windowOpen did not fire within timeout")) { // Edge case, error: "Event windowOpen did not fire within timeout of 20000ms" -> Caused if the bot gets stuck pathfinding, just return quantity 0
                quantity = 0;
            }
            if (e.message.includes("Cannot read properties of null (reading 'type')")) { // Edge case, error: "Cannot read properties of null (reading 'type') at clickDest -> TODO
                console.log(e);
                sorterChestInventory.close();
            }

            // Todo check other fallback chests.
        }
        this.bot.emit("withdrawItems", {material: material, quantity: quantity, withdrawing: false});
        return [material, quantity];
    }
    async storeWithNbt(item) {
        const sorterChest = this.config.hasSorter ? await this.storageSystem.getMaterialChest(this.config.sorterBlock)
            : await this.storageSystem.getMaterialChest(item.name);
        if (!sorterChest) return null;
        if (!this.bot.pathfinder.isMoving()) {
            await this.pathfinderPlus.goalWithDelta(sorterChest.position);
        }
        const sorterChestInventory = await this.bot.openContainer(sorterChest);
        try {
            //await sorterChestInventory.(item, 0, sorterChestInventory.inventoryStart-1, false);
        } catch (e) {
            // Inventory is full.
            // Todo check other fallback chests.
        }
        sorterChestInventory.close();
    }
}

module.exports = InventoryManager;


/*
Window {_events: Object, _eventsCount: 0, _maxListeners: undefined, acceptOutsideWindowClick: Function, acceptInventoryClick: Function, ...}
_events = Object {}
_eventsCount = 0
_maxListeners = undefined
acceptOutsideWindowClick = acceptClick (click, gamemode = 0) {
acceptInventoryClick = acceptClick (click, gamemode = 0) {
acceptNonInventorySwapAreaClick = acceptClick (click, gamemode = 0) {
acceptSwapAreaLeftClick = acceptClick (click, gamemode = 0) {
acceptSwapAreaRightClick = acceptClick (click, gamemode = 0) {
acceptCraftingClick = acceptClick (click, gamemode = 0) {
id = 1
type = "minecraft:generic_9x3"
title = "{"translate":"container.chest"}"
slots = Array(63) [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item, Item]
inventoryStart = 27
inventoryEnd = 63
hotbarStart = 54
craftingResultSlot = -1
requiresConfirmation = true
selectedItem = null
close = () => {
withdraw = async (itemType, metadata, count, nbt) => {
deposit = async (itemType, metadata, count, nbt) => {
Symbol(kCapture) = false
[[Prototype]] = EventEmitter

        for (let slot = 0; slot < sorterChestInventory.inventoryStart; slot++) {
            if (sorterChestInventory.slots[slot] !== null) continue;
            if (quantity > 0) {
                const amount = quantity >= material.stackSize ? material.stackSize : quantity
                try {
                    await sorterChestInventory.deposit(materialId, null, amount);
                } catch (e) {
                    // Chest is full.
                    // Todo check other fallback chests.
                    break;
                }
                quantity -= amount;
            }
        }

            async storeWithNbt(item){
        const sorterChest = this.config.hasSorter ? await this.storageSystem.getMaterialChest(this.config.sorterBlock)
            : await this.storageSystem.getMaterialChest(item.name);
        if (!sorterChest) return null;
        await goalWithDelta(this.bot, sorterChest.position);
        const sorterChestInventory = await this.bot.openContainer(sorterChest);
        try {
            await sorterChestInventory.dumpItem(item, 0, sorterChestInventory.inventoryStart-1, false);
        } catch (e) {
            // Inventory is full.
            // Todo check other fallback chests.
        }
        sorterChestInventory.close();
    }
*/
