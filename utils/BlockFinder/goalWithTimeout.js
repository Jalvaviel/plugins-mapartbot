const { GoalNear } = require('mineflayer-pathfinder').goals;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
async function goalWithTimeout(bot, goalPos, timeout = 30000, reach = 1) {
    const goal = new GoalNear(goalPos.x, goalPos.y, goalPos.z, reach)
    try {
        await Promise.race([
            bot.pathfinder.goto(goal),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Pathfinding timed out')), timeout)
            )
        ]);
    } catch (error) {
        if (error.message === 'Pathfinding timed out') {
            console.log('Pathfinding timed out. Setting a new goal nearby...');
            const newGoal = new GoalNear(bot.entity.position.x + getRandomInt(-10, 10), bot.entity.position.y, bot.entity.position.z + getRandomInt(-10, 10), 2);
            await goalWithTimeout(bot, newGoal, 3000);
        } else {
            throw error;
        }
    }
}
module.exports = {
    goalWithTimeout
}