const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');
const { Movements } = require('mineflayer-pathfinder');
const {Nuker}  = require('./modules/Nuker/nuker');
const {AutoEat} = require("./modules/AutoEat/autoEat");
const {InventoryManager} = require("./utils/InventoryManager/inventoryManager");
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
let bot = startMinecraftBot("0.0.0.0", 25567, 'jalvabot@outlook.es');
bot.loadPlugin(pathfinder);

let pathfinderMovements = () => {
    const movements = new Movements(bot);
    movements.canDig = false;
    movements.allow1by1towers = false;
    bot.pathfinder.setMovements(movements);
}

bot.on('spawn', () => {
    console.log('Bot has spawned');
    pathfinderMovements();
    const autoEat = new AutoEat(bot);
    const antiBreak = new AntiBreak(bot);
    autoEat.activate();
    antiBreak.activate();
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
        const nuker = new Nuker(bot);
        //let nnb = nuker.nearestNukerBlock()
        //await(nuker.nukeInRange());
        //await(nuker.equipBestTool(nnb));
        //console.log(bot.digTime(nnb), nnb.name);
        await nuker.activate();
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
