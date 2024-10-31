const {Vec3} = require("vec3");
const { GoalNear } = require('mineflayer-pathfinder').goals;
const { sleep } = require("mineflayer/lib/promise_utils");

/** DEPRECATED **/

function _getRandomGoal(bot, manhattan) {
    return new Vec3(
        bot.entity.position.x + getRandomInt(manhattan,manhattan),
        bot.entity.position.y,
        bot.entity.position.z + getRandomInt(manhattan,manhattan),
        );
}

async function goalWithTimeout(bot, goalPos, reach = 1, timeout = 40000) {
    const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach)
    try {
        await Promise.race([
            (async () => {
                try {
                    await bot.pathfinder.goto(goal); // Try going to the goal
                } catch (e) {
                    console.error("Pathfinding error:", e, "Goal: ",goal); // Log the error without throwing FIXME refer to bug 2
                }
            })(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Pathfinding timed out')), timeout)
            )
        ]);
    } catch (error) {
        if (error.message === 'Pathfinding timed out') {
            console.log('Pathfinding timed out. Setting a new goal nearby...');
            const newGoal = new GoalNear(bot.entity.position.x + getRandomInt(-10, 10), bot.entity.position.y, bot.entity.position.z + getRandomInt(-10, 10), 2);
            await goalWithTimeout(bot, newGoal, reach);
        } else {
            throw error;
        }
    }
}

async function _wiggle(bot){
    const movements = ["jump","forward","back","left","right"]
    for (const movement of movements) {
        bot.setControlState(movement,true);
        await sleep(getRandomInt(200,800));
        bot.setControlState(movement,false);
    }
}

async function goalWithDelta(bot, goalPos, reach = 1, stuckTimeout = 5000, deltaVelocity = 0.06) {
    try {
        const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach);
        await bot.pathfinder.goto(goal);
        const velocityCheckInterval = setInterval(() => {
            const velocity = bot.entity.velocity;

            // Check if the bot's velocity is zero
            if (velocity.x + velocity.y + velocity.z < deltaVelocity) {
                bot.pathfinder.stop(); // Stop the pathfinding
                console.log("I have stopped moving, so I will cease pathfinding.");
                clearInterval(velocityCheckInterval); // Clear the interval
            }
        }, 1000); // Check every 1000 milliseconds
    } catch (e) {}
}

module.exports = {
    goalWithTimeout,
    goalWithDelta
}

/*
function _checkMovement(bot, deltaVelocity, stuckTimeout) {
    let stuckTime = 0;
    return new Promise((resolve, reject) => {
        const movementCheck = setInterval(() => {
            const velocity = bot.entity.velocity.abs();

            if (velocity.x + velocity.y + velocity.z < deltaVelocity) {
                stuckTime += 1000;  // Increase stuck time if the bot's velocity is too low
            } else {
                stuckTime = 0;  // Reset stuck time if bot is moving
            }

            if (stuckTime >= stuckTimeout) {
                console.log("Timeouts reached:", stuckTime, stuckTimeout);
                clearInterval(movementCheck);  // Stop checking movement
                //this.bot.setControlState('jump',true);
                resolve(true);  // Signal bot is stuck
            }
        }, 1000);
    });
}


async function goalWithDelta(bot, goalPos, reach = 1, stuckTimeout = 5000, deltaVelocity = 0.06) {
    if (!bot.pathfinder.isMoving()) {
        bot.emit("deathloop", false);
        const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach);

        try {
            const stuck = await Promise.race([
                _checkMovement(bot, deltaVelocity, stuckTimeout),  // Monitor if bot gets stuck
                bot.pathfinder.goto(goal).then(() => false)  // If pathfinder finishes, resolve with false (not stuck)
            ]);

            if (stuck) {
                console.log('Bot is stuck, wiggling...');
                bot.pathfinder.stop();
                await _wiggle(bot);
                //bot.pathfinder.stop();  // Stop current pathfinding
                //await goalWithDelta(bot, _getRandomGoal(bot, 5), reach, stuckTimeout, deltaVelocity);  // Retry with another goal

            }
        } catch (e) {
            console.error('Pathfinding error:', e);
            // Race Condition, GoalChanged: The goal was changed before it could be completed! It keeps on looping.
            /*
            GoalChanged: The goal was changed before it could be completed!
            at error (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:2:15)
            at EventEmitter.goalChangedListener (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:34:17)
            at EventEmitter.emit (node:events:526:35)
            at bot.pathfinder.setGoal (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:145:9)
            at C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:63:20 at new Promise (<anonymous>)
            at goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:17:10)
            at bot.pathfinder.goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:159:12)
            at goalWithDelta (C:\Users\Usuario\Desktop\plugins-mapartbot\utils\BlockFinder\goalWithTimeout.js:81:28)
            at Builder.buildStructure (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:158:31)
            {name: "GoalChanged", stack: "GoalChanged: The goal was changed before it could …gins-mapartbot\modules\Builder\builder.js:158:31)",
            message: "The goal was changed before it could be completed!"}
             */
            // Race Condition, Likely error: "Path was stopped before it could be completed" It happens when the bot has picked up mats or eaten as last action (interrupted).
            // Common case, Likely error: "AssertionError [ERR_ASSERTION]: invalid control: ´wiggle_controlstate´ at bot.setControlState
            // Sometimes in the stuck const, bot.pathfinder.goto resolves first. This is intentional,
            // however sometimes it resolves first because there was an error while pathfinding due to it being stopped elsewhere in the code (eating action, replenishing action, etc.)
            // This makes it so the code runs twice in parallel, is there any way to detect if the bot.pathfinder.goto resolves first and if it's due to an error,
            // abort the whole goalWithDelta?
/*
        }
    }
    /*
}


/*
GoalChanged: The goal was changed before it could be completed! at error (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:2:15) at EventEmitter.goalChangedListener (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:34:17) at EventEmitter.emit (node:events:526:35) at bot.pathfinder.setGoal (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:145:9) at C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:63:20 at new Promise (<anonymous>) at goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:17:10) at bot.pathfinder.goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:159:12) at goalWithDelta (C:\Users\Usuario\Desktop\plugins-mapartbot\utils\BlockFinder\goalWithTimeout.js:59:30) at Builder.buildStructure (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:148:27) {name: "GoalChanged", stack: "GoalChanged: The goal was changed before it could …gins-mapartbot\modules\Builder\builder.js:148:27)", message: "The goal was changed before it could be completed!"}
 Goal:
GoalNear {x: -6, y: -60, z: 99, rangeSq: 9}
goalWithTimeout.js:65
throttles
 */