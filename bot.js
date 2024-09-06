const mineflayer = require('mineflayer');
const autoEatPlugin = require('./AutoEat/autoEat');
const antiAfk = require('./AntiAfk/antiAfk');
const {pathfinder} = require('mineflayer-pathfinder');
const { Movements } = require('mineflayer-pathfinder');
const { nuker } = require('./Nuker/nuker');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEventEmitter = require('./Utils/PriorityEventEmitter');
const { Vec3 } = require("vec3");
const { readFileSync } = require('fs');

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
bot.loadPlugin(pathfinder)

// Initialize the event emitter and assign it to the bot
bot.eventEmitter = new PriorityEventEmitter();

// Start the anti-AFK handler
antiAfk(bot, 5000); // Check every 5 seconds

// Start the autoEat handler
autoEatPlugin(bot); // higher priority for eating

bot.on('spawn', () => {
    console.log('Bot has spawned');
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
        nuker(bot);
    }
});
