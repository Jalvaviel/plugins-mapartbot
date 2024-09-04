const { Vec3 } = require("vec3");
const { sleep } = require("mineflayer/lib/promise_utils");
const { eat } = require('../AutoEat/autoEat');
const { isInside,
    dijkstra,
    scanner,
    customScanner,
    spiral
} = require('../BlockFinder/algorithms');
const {goalWithTimeout} = require("../BlockFinder/goalWithTimeout");
const PriorityEvent = require("../Utils/PriorityEvent");
const {EventStatus} = require("../Utils/EventStatus");
async function equipBestTool(bot, block, nukerPacketCount = { value: 0 }) {
    const pickaxes = [
        bot.registry.itemsByName['wooden_pickaxe'].id,
        bot.registry.itemsByName['stone_pickaxe'].id,
        bot.registry.itemsByName['golden_pickaxe'].id,
        bot.registry.itemsByName['iron_pickaxe'].id,
        bot.registry.itemsByName['diamond_pickaxe'].id,
        bot.registry.itemsByName['netherite_pickaxe'].id
    ];

    const axes = [
        bot.registry.itemsByName['wooden_axe'].id,
        bot.registry.itemsByName['stone_axe'].id,
        bot.registry.itemsByName['golden_axe'].id,
        bot.registry.itemsByName['iron_axe'].id,
        bot.registry.itemsByName['diamond_axe'].id,
        bot.registry.itemsByName['netherite_axe'].id
    ];

    const shovels = [
        bot.registry.itemsByName['wooden_shovel'].id,
        bot.registry.itemsByName['stone_shovel'].id,
        bot.registry.itemsByName['golden_shovel'].id,
        bot.registry.itemsByName['iron_shovel'].id,
        bot.registry.itemsByName['diamond_shovel'].id,
        bot.registry.itemsByName['netherite_shovel'].id
    ];

    const hoes = [
        bot.registry.itemsByName['wooden_hoe'].id,
        bot.registry.itemsByName['stone_hoe'].id,
        bot.registry.itemsByName['golden_hoe'].id,
        bot.registry.itemsByName['iron_hoe'].id,
        bot.registry.itemsByName['diamond_hoe'].id,
        bot.registry.itemsByName['netherite_hoe'].id
    ];

    let bestTool = null;

    try {
        const blockMaterial = block.material;

        if (blockMaterial.includes("mineable/pickaxe")) {
            for (let tool of pickaxes) {
                const selectedTool = await bot.inventory.findInventoryItem(tool, null, false);
                if (selectedTool !== null) {
                    bestTool = selectedTool;
                }
            }
        } else if (blockMaterial.includes("mineable/axe")) {
            for (let tool of axes) {
                const selectedTool = await bot.inventory.findInventoryItem(tool, null, false);
                if (selectedTool !== null) {
                    bestTool = selectedTool;
                }
            }
        } else if (blockMaterial.includes("mineable/shovel")) {
            for (let tool of shovels) {
                const selectedTool = await bot.inventory.findInventoryItem(tool, null, false);
                if (selectedTool !== null) {
                    bestTool = selectedTool;
                }
            }
        } else if (blockMaterial.includes("mineable/hoe")) {
            for (let tool of hoes) {
                const selectedTool = await bot.inventory.findInventoryItem(tool, null, false);
                if (selectedTool !== null) {
                    bestTool = selectedTool;
                }
            }
        } else if (blockMaterial.includes("default")) {
            for (let item of bot.inventory.items()) {
                if (!pickaxes.includes(item.type) && !axes.includes(item.type) && !shovels.includes(item.type) && !hoes.includes(item.type)) {
                    bestTool = item;
                }
            }
        }

        if (bestTool !== null) {
            await bot.equip(bestTool, "hand");
            nukerPacketCount.value++;
        }

    } catch (e) {
        console.error(e);
    }
}

async function _breakWithPacket(bot, block, options = {nukerPacketLimit : 10}, nukerPacketCount){
    nukerPacketCount.value += (bot.digTime(block) > 50) ? 3 : 1
    await equipBestTool(bot,block);
    if (bot.digTime(block) < 50) {
        bot._client.write('block_dig', {
            status: 0, // start digging
            location: block.position,
            face: 1
        });
    } else {
        bot._client.write('block_dig', {
            status: 2, // stop digging
            location: block.position,
            face: 1
        });
        bot._client.write('block_dig', {
            status: 0, // start digging
            location: block.position,
            face: 1
        });
        bot._client.write('block_dig', {
            status: 2, // stop digging
            location: block.position,
            face: 1
        });
    }
}

function canMine(bot,block,nukerPacketCount,nukerPacketLimit) {
    const packetCount = (bot.digTime(block) > 50) ? 3 : 1;
    if (nukerPacketCount.value >= nukerPacketLimit || nukerPacketCount.value + packetCount >= nukerPacketLimit ) {  //Stop breaking if the packet limit is reached.
        return false;
    }
    return true;
}
async function breakBlock(bot, block, nukerPacketCount, options) {
    bot.emit("breakBlock", {'block': block, 'breaking': true});
    switch (options.mode) {
        case "packet":
            await _breakWithPacket(bot,block,options,nukerPacketCount);
            break;
        default:
            await bot.dig(block);
            break;
    }

    bot.emit("breakBlock", {'block': block, 'breaking': false});
}

async function nukeInRange(bot, range, excludes, boundingBox, options){
    //console.log(range,excludes,boundingBox,options)
    let botPos = bot.entity.position;
    let nukerPacketCount = { value: 0 }
    botPos = new Vec3(Math.floor(botPos.x), Math.floor(botPos.y), Math.floor(botPos.z));
    while (true) {
        while(nukerPacketCount.value > 0){
            nukerPacketCount = { value: nukerPacketCount.value-1 }
            await sleep();
        }
        let blockFound = false;
        for (let z = botPos.z - range; z <= botPos.z + range; z++) {
            for (let x = botPos.x - range; x <= botPos.x + range; x++) {
                for (let y = botPos.y; y <= botPos.y + range; y++) {
                    const block = bot.world.getBlock(new Vec3(x, y, z));
                    if (botPos.distanceTo(block.position) <= range) {
                        if (!excludes.includes(block.name) && isInside(block, boundingBox) && block.name !== 'air') {
                            if (canMine(bot,block,nukerPacketCount,options.nukerPacketLimit)) {
                                await breakBlock(bot, block, nukerPacketCount, options);
                            } else {
                                //console.log("can't mine",block.position);
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

function nearestNukerBlock(bot, excludes, boundingBox, exploredPos = {value: []}, mode) {
    switch (mode) {
        case "scanner":
            return scanner(bot,excludes,boundingBox);
            break;
        case "custom_scanner":
            return customScanner(bot,excludes,boundingBox,exploredPos);
            break;
        case "dijkstra":
            return dijkstra(bot,excludes,boundingBox);
            break;
        case "spiral":
            return spiral(bot,excludes,boundingBox);
            break;
        default:
            return spiral(bot,excludes,boundingBox);
            break;
    }
}

async function nukeArea(bot, range, excludes, boundingBox, options) {
    bot.emit("nuker", {'nuking': true});
    let nnb = nearestNukerBlock(bot,excludes,boundingBox);
    while (nnb) {
        await sleep(1);
        const playerPos = bot.entity.position.floored();
        const nnbPos = nnb.position;
        if (nnbPos.distanceTo(playerPos) > range) {
            await goalWithTimeout(bot,nnbPos)
        }
        await nukeInRange(bot,range,excludes,boundingBox,options);
        nnb = nearestNukerBlock(bot,excludes,boundingBox);
    }
    console.log("Done nuking area...")
    bot.emit("nuker", {'nuking': false});
}

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


module.exports = { nuker };

