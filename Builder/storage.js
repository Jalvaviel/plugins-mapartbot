const { GoalNear } = require('mineflayer-pathfinder').goals;
const Vec3 = require("vec3");

async function getBlockInArea(world, corner, dimensions, blockName) {
    for (let z = corner.z; z <= corner.z + dimensions.z; z++) {
        for (let x = corner.x; x <= corner.x + dimensions.x; x++) {
            for (let y = corner.y; y <= corner.y + dimensions.y; y++) {
                if (world.getBlock(new Vec3(x,y,z)).name === blockName && world.getBlock(new Vec3(x,y+1,z)).name === 'chest') {
                    return world.getBlock(new Vec3(x,y+1,z));
                }
            }
        }
    }
    return null;
}
async function replenishMaterial(bot, material, blockname = material, quantity = 64) {
    const MAX_INVENTORY = bot.builder.options.maxReplenishItems;
    const sorter = bot.builder.options.sorter;
    const corner = bot.builder.options.corner;
    const sorterSize = bot.builder.options.sorterSize;
    const structureSize = bot.builder.currentStructure.size;
    let matChest = null;

    switch (sorter) {
        case "north":
            matChest = await getBlockInArea(bot.world, new Vec3(corner.x, corner.y - 1, corner.z - sorterSize.z), sorterSize, blockname);
            break;
        case "south":
            matChest = await getBlockInArea(bot.world, new Vec3(corner.x, corner.y - 1, corner.z + structureSize.z), sorterSize, blockname);
            break;
        case "west":
            [sorterSize.x, sorterSize.z] = [sorterSize.z, sorterSize.x]; // Swap values
            matChest = await getBlockInArea(bot.world, new Vec3(corner.x - sorterSize.x, corner.y - 1, corner.z), sorterSize, blocknamel);
            break;
        case "east":
            [sorterSize.x, sorterSize.z] = [sorterSize.z, sorterSize.x]; // Swap values
            matChest = await getBlockInArea(bot.world, new Vec3(sorterSize.x + structureSize.x, corner.y - 1, corner.z), sorterSize, blockname);
            break;
    }

    if (!matChest) {
        console.log("Material chest not found for:", material);
        return;
    }

    try {
        // Move towards the chest and open it
        const goal = new GoalNear(matChest.position.x, matChest.position.y, matChest.position.z, bot.builder.options.reachDistance - 1);
        await goalWithTimeout(bot, goal);
        //console.log("Goal to replenish material: ",matChest)
        const matChestInv = await bot.openContainer(matChest);
        // Find the material in the chest and withdraw the required amount
        const item = matChestInv.findContainerItem(material);
        if (item !== null && bot.inventory !== null) {
            console.log("quantity and max_inv",quantity,MAX_INVENTORY);
            const amountToWithdraw = Math.min(quantity, MAX_INVENTORY);
            await matChestInv.withdraw(item.type, null, amountToWithdraw);
            console.log(`Picked: ${material}, amount: ${amountToWithdraw}`);
        } else {
            console.log("Not enough materials left for:", material);
            return;
        }
        matChestInv.close();
    } catch (e) {
        console.error("Error while replenishing material:", e);
        await depositItems(bot, material);
    }
}

async function depositItems(bot, materialToKeep) {
    console.log('The inventory is full, depositing items...');
    const binBlockId = bot.registry.blocksByName[bot.builder.materialStorage['trash']].id;
    let binBlock = await bot.findBlock({
        matching: binBlockId,
        maxDistance: bot.builder.options.searchArea
    });
    const goalBin = new GoalNear(binBlock.position.x, binBlock.position.y, binBlock.position.z, bot.builder.options.reachDistance - 1);
    await goalWithTimeout(bot, goalBin);
    const binInventory = await bot.openContainer(binBlock);
    const whiteList = JSON.parse(readFileSync(bot.builder.options["whitelist"]));
    const foodWhitelist = JSON.parse(readFileSync(bot.builder.options["foods"]));

    for (let itemIndex = binInventory.inventoryStart; itemIndex < binInventory.inventoryEnd; itemIndex++) {
        const currentItem = binInventory.slots[itemIndex];
        if (currentItem !== null && !whiteList.includes(currentItem.name) && !foodWhitelist.includes(currentItem.name) && currentItem.name !== materialToKeep) {
            await binInventory.deposit(currentItem.type, null, currentItem.count);
        }
    }
    binInventory.close();
}

module.exports = {
    depositItems,
    replenishMaterial
}

