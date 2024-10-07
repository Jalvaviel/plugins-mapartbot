const mineflayer = require('mineflayer');
const autoEatPlugin = require('./modules/AutoEat/autoEat');
const antiAfk = require('./modules/AntiAfk/antiAfk');
const { pathfinder } = require('mineflayer-pathfinder');
//const { inventory } = require('./node_modules/mineflayer/examples/inventory.js');
const { Movements } = require('mineflayer-pathfinder');
const { nuker, createNuker} = require('./modules/Nuker/nuker');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEventEmitter = require('./utils/old/PriorityEventEmitter');
const { Vec3 } = require("vec3");
const { readFileSync } = require('fs');
const {AntiAfk, createAntiAfk} = require("./modules/AntiAfk/antiAfk");
const PriorityQueue = require("./utils/PriorityQueue");
const {createAutoEat} = require("./modules/AutoEat/autoEat");
const InventoryManager = require("./utils/InventoryManager/inventoryManager.js");
const AntiBreak = require("./modules/AntiBreak/antiBreak");

let startMinecraftBot = (host, port, username) => {
    return mineflayer.createBot({
        host: host,
        port: port,
        username: username,
        auth: "microsoft"
    });
}

// Create the bot
let bot = startMinecraftBot("0.0.0.0", 25566, 'jalvabot@outlook.es');
bot.loadPlugin(pathfinder);
//bot.loadPlugin(inventory);

// Initialize the event emitter and assign it to the bot
prioQ = new PriorityQueue(bot);

let pluginsWithInterval = async () => {
    setInterval(() => {
    createAntiAfk(prioQ,bot,1);
    },10000);
    setInterval(() => {
        createAutoEat(prioQ,bot,10);
    },2000);
}

let pathfinderMovements = () => {
    const movements = new Movements(bot);
    movements.canDig = false;
    movements.allow1by1towers = false;
    bot.pathfinder.setMovements(movements);
}

bot.on('spawn', () => {
    console.log('Bot has spawned');
    pluginsWithInterval();
    pathfinderMovements();
});

bot.on('error', (err) => {
    console.error('Error:', err);
});

bot.on('end', () => {
    console.log('Bot disconnected');
    process.exit();
});

bot.on("chat", async (username, message) => {
    if (message === '!nuke'){
        createNuker(prioQ, bot, 6);
    }
    if (message === '!inv'){
        let invManager = new InventoryManager(bot);
        await invManager.depositItems("white_carpet",1024);
    }
    if (message === '!ab'){
        let antiBreak = new AntiBreak(bot);
        await antiBreak.dumpAndPickup();
    }
});
