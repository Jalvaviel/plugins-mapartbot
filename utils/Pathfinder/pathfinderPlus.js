const {Vec3} = require("vec3");
const {readFileSync} = require("fs");

const { GoalNear } = require('mineflayer-pathfinder').goals;
const { sleep } = require("mineflayer/lib/promise_utils");

function random(min,max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
class PathfinderPlus {
    constructor(bot, config= JSON.parse(readFileSync("./utils/Pathfinder/config.json"))) {
        this.bot = bot;
        this.config = config;
        this.stop = false;
        this.isActive = false;
        this.velocityCheckInterval = null;
        this.addListeners();
    }

    addListeners() {
        /*
        this.bot.on('eat', (eatEvent) => {
            if (this.isActive) {
                if (eatEvent.eating) {
                    this.stopPathfinding();
                } else {
                    this.stop = false;
                }
            }
        });
         */
    }

    stopPathfinding() {
        if (this.isActive) {
            console.log("Pathfinding stopped due to an interruption.");
            this.bot.pathfinder.stop();
            this.stop = true;
            this.clearVelocityCheckInterval();
            this._wiggle();

        }
    }

    clearVelocityCheckInterval() {
        if (this.velocityCheckInterval) {
            clearInterval(this.velocityCheckInterval);
            this.velocityCheckInterval = null;
        }
    }

    _wiggle(){
        const movements = ["jump","forward","back","left","right"]
        for (const movement of movements) {
            this.bot.setControlState(movement,true);
            //sleep(random(200,800));
            this.bot.setControlState(movement,false);
        }
    }

    async goalWithDelta(goalPos, reach = 5) {
        this.isActive = true;
        if (this.stop) return;

        try {
            const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach);
            await this.bot.pathfinder.goto(goal);

            this.clearVelocityCheckInterval();

            this.velocityCheckInterval = setInterval(() => {
                const velocity = this.bot.entity.velocity;
                if (Math.abs(velocity.x) + Math.abs(velocity.y) + Math.abs(velocity.z) < this.config.deltaVelocity) {
                    console.log("Bot stopped moving. Ceasing pathfinding.");
                    this.stopPathfinding();
                }
            }, this.config.timeout);
        } catch (e) {
            console.log("Error or interruption during pathfinding:", e.message);
        } finally {
            this.clearVelocityCheckInterval();
            this.isActive = false;
        }
    }
}


module.exports = { PathfinderPlus }