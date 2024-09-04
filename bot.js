const mineflayer = require('mineflayer');
const autoEat = require('./AutoEat/autoEat');
const antiAfk = require('./AntiAfk/antiAfk');
const { pathfinder } = require('mineflayer-pathfinder');
const { Movements } = require('mineflayer-pathfinder');
const { nuker } = require('./Nuker/nuker');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEventEmitter = require('./Utils/PriorityEventEmitter');
const { Vec3 } = require("vec3");
const afkHandler = require("./AntiAfk/antiAfk");

// Function to start the Minecraft bot
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

// Initialize the event emitter and assign it to the bot
bot.eventEmitter = new PriorityEventEmitter(); // Corrected Typo

// Start the anti-AFK handler
afkHandler(bot, 5000); // Check every 5 seconds

// Event handlers for the bot
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

// Trigger the nuker module via a chat command
bot.on("chat", async (username, message) => {
    if (message === '!nuke') {
        console.log(`Nuker triggered by ${username}`);
        // Trigger the nuker
        nuker(bot);
    }
});
