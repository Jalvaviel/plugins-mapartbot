const mineflayer = require('mineflayer');
const autoEatPlugin = require('./AutoEat/autoEat');
const antiAfk = require('./AntiAfk/antiAfk');
const {pathfinder} = require('mineflayer-pathfinder');
const { Movements } = require('mineflayer-pathfinder');
const { nuker, createNuker} = require('./Nuker/nuker');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEventEmitter = require('./Utils/old/PriorityEventEmitter');
const { Vec3 } = require("vec3");
const { readFileSync } = require('fs');
const {AntiAfk, createAntiAfk} = require("./AntiAfk/antiAfk");
const PriorityQueue = require("./Utils/PriorityQueue");
const {createAutoEat} = require("./AutoEat/autoEat");

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
prioQ = new PriorityQueue(bot);

let pluginsWithInterval = async () => {
    setInterval(() => {
    createAntiAfk(prioQ,bot,1);
    },10000);
    setInterval(() => {
        createAutoEat(prioQ,bot,10);
    },2000);
}

let logTheFuckingQueue = async () => {
    setInterval(() => {
    console.log(prioQ.queue)
    },1000);
}

bot.on('spawn', () => {
    console.log('Bot has spawned');
    pluginsWithInterval();
    //logTheFuckingQueue()
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
});
