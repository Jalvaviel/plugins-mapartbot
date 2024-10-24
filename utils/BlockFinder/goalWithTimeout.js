const {Vec3} = require("vec3");
const { GoalNear } = require('mineflayer-pathfinder').goals;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
async function _checkMovement(bot, deltaVelocity, stuckTimeout) {
    let stuckTime = 0;
    return new Promise((resolve, reject) => {
        const movementCheck = setInterval(() => {
            const velocity = bot.entity.velocity.abs();
            //console.log(velocity);

            if (velocity.x + velocity.y + velocity.z < deltaVelocity) {
                console.log("I am speed:",bot.entity.velocity,velocity,velocity.x + velocity.y + velocity.z, deltaVelocity)
                stuckTime += 1000;
            } else {
                stuckTime = 0;  // Reset stuck time if bot is moving
            }

            if (stuckTime >= stuckTimeout) {
                console.log("Timeouts reached:",stuckTime,stuckTimeout)
                clearInterval(movementCheck);  // Stop checking movement
                resolve(false);  // Signal bot is stuck
            }
        }, 1000);
    });
}

async function goalWithDelta(bot, goalPos, reach = 1, stuckTimeout = 5000, deltaVelocity = 0.06) {
    const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach);
    let movementCheck;
    try {
        const stuck = await Promise.race([
            bot.pathfinder.goto(goal),  // Try to reach the goal
            _checkMovement(bot, deltaVelocity, stuckTimeout)  // Monitor if bot gets stuck
        ]);

        if (stuck) {
            console.log('Bot is stuck, stopping and retrying...');
            bot.pathfinder.stop();  // Stop current pathfinding
            await goalWithDelta(bot, _getRandomGoal(bot,5), reach, stuckTimeout, deltaVelocity);  // Retry with another goal
            //await goalWithDelta(bot, goalPos, reach);  // Retry with the same goal
        }
    } catch (e) {
        //console.error('Pathfinding error:', e);
    } finally {
        clearInterval(movementCheck);  // Ensure movement check is stopped
    }
}


module.exports = {
    goalWithTimeout,
    goalWithDelta
}

/*
GoalChanged: The goal was changed before it could be completed! at error (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:2:15) at EventEmitter.goalChangedListener (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:34:17) at EventEmitter.emit (node:events:526:35) at bot.pathfinder.setGoal (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:145:9) at C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:63:20 at new Promise (<anonymous>) at goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\lib\goto.js:17:10) at bot.pathfinder.goto (C:\Users\Usuario\Desktop\plugins-mapartbot\node_modules\mineflayer-pathfinder\index.js:159:12) at goalWithDelta (C:\Users\Usuario\Desktop\plugins-mapartbot\utils\BlockFinder\goalWithTimeout.js:59:30) at Builder.buildStructure (C:\Users\Usuario\Desktop\plugins-mapartbot\modules\Builder\builder.js:148:27) {name: "GoalChanged", stack: "GoalChanged: The goal was changed before it could …gins-mapartbot\modules\Builder\builder.js:148:27)", message: "The goal was changed before it could be completed!"}
 Goal:
GoalNear {x: -6, y: -60, z: 99, rangeSq: 9}
goalWithTimeout.js:65
throttles
 */