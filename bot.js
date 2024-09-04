const mineflayer = require('mineflayer');
const autoEat = require('./AutoEat/autoEat');
const antiAfk = require('./AntiAfk/antiAfk');
const pathfinder = require('mineflayer-pathfinder');
const { Movements } = require('mineflayer-pathfinder');
const {nuker} = require('./Nuker/nuker');
const { sleep } = require("mineflayer/lib/promise_utils");
const PriorityEventEmmiter = require('./Utils/PriorityEventEmmiter')
const {Vec3} = require("vec3");
let startMinecraftBot = (host,port,username) => {
    return mineflayer.createBot({
        host: host,
        port: port,
        username: username,
        auth: "microsoft"
    })
}

let loadPlugins = (minecraftBot) => {
    while (true) {
        try {
            minecraftBot.loadPlugin(autoEat);
            minecraftBot.loadPlugin(antiAfk);
            minecraftBot.loadPlugin(pathfinder.pathfinder);
            minecraftBot.physics.pitchSpeed = 1000;
            minecraftBot.physics.yawSpeed = 1000;

            const defaultMoves = new Movements(minecraftBot); // These moves are for the pathfinder. We don't want for it to scaffold to get to places, or dig blocks by itself since it's handled elsewhere.
            defaultMoves.canDig = false;
            defaultMoves.scafoldingBlocks = [];
            minecraftBot.pathfinder.setMovements(defaultMoves);
        }
        catch (e) {
            console.error("Failed to load plugin:", e);
        }
        return;
    }
}

let minecraftBot = startMinecraftBot("0.0.0.0",25566,'jalvabot@outlook.es'); //13.36.81.78
minecraftBot.events = new PriorityEventEmmiter();

minecraftBot.on("spawn", () => {
    loadPlugins(minecraftBot);
    console.log("Plugins loaded...")
});

minecraftBot.on("notAfk", ({ status }) => {
    console.log("Not afk...");
});

minecraftBot.on("eat", ({ status }) => {
    console.log("Eating...");
});

minecraftBot.on("end", ( string ) => {
    console.log("The bot left the server: ",string); //NoSlowB todo
    process.exit();
});
minecraftBot.on("chat", async (username, message)=> {
    if (message === 'nuke'){
        console.log(username,message);
        nuker(minecraftBot); //[new Vec3(-64,-60,64), new Vec3(-64+128,-58,64+128)] [new Vec3(3283392,61,-4860864), new Vec3(3283392+128,61+3,-4860864+128)]
    }
});