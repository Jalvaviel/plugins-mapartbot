const {Vec3} = require("vec3");
const {isInside} = require("../BlockUtils/boundingBox");
const {offsetFromWorldBlock} = require("../Structures/StructureUtils");

function dijkstra(bot, excludes, boundingBox) {
    const start = bot.entity.position.floored();
    const distances = new Map(); // Store the distance of each node from the start
    const priorityQueue = []; // Use an array as a priority queue
    const visited = new Set(); // Track visited nodes

    distances.set(start, 0);
    priorityQueue.push({ position: start, distance: 0 });

    const directions = [
        new Vec3(1, 0, 0), new Vec3(-1, 0, 0),
        new Vec3(0, 1, 0), new Vec3(0, -1, 0),
        new Vec3(0, 0, 1), new Vec3(0, 0, -1)
    ];

    while (priorityQueue.length > 0) {
        // Get the node with the smallest distance (priority queue logic)
        priorityQueue.sort((a, b) => a.distance - b.distance);
        const current = priorityQueue.shift();
        const currentPos = current.position;

        // If we've already visited this position, skip it
        if (visited.has(currentPos.toString())) continue;
        visited.add(currentPos.toString());

        // Check if this is a valid "wrong" block
        const block = bot.world.getBlock(currentPos);
        if (!excludes.includes(block.name) && block.name !== 'air' && isInside(block,boundingBox)) { return block; }

        // Explore neighbors
        for (let direction of directions) {
            const neighbor = currentPos.plus(direction);

            if (visited.has(neighbor.toString())) continue;

            const tentativeDistance = current.distance + currentPos.distanceTo(neighbor);

            if (!distances.has(neighbor) || tentativeDistance < distances.get(neighbor)) {
                distances.set(neighbor, tentativeDistance);
                priorityQueue.push({ position: neighbor, distance: tentativeDistance });
            }
        }
    }

    // If no block is found
    return null;
}

function scanner(bot, blockMode, blockList, boundingBox) {
    blockList = (Array.isArray(blockList)) ? blockList : [blockList];
    const playerPos = bot.entity.position.floored();
    let nearestBlock = null;
    let minDistance = Infinity;

    for (let y = boundingBox[0].y; y <= boundingBox[1].y; y++) {
        for (let x = boundingBox[0].x; x <= boundingBox[1].x; x++) {
            for (let z = boundingBox[0].z; z <= boundingBox[1].z; z++) {
                const block = bot.world.getBlock(new Vec3(x, y, z));
                let currentDistance = block.position.distanceTo(playerPos);
                if (currentDistance < minDistance) {
                    const mode = (blockMode === "includes" && blockList.includes(block.name)) ||
                        (blockMode === "excludes" && !blockList.includes(block.name));
                    if (mode && block.name !== 'air' && isInside(block, boundingBox)) {
                        minDistance = currentDistance;
                        nearestBlock = block;
                    }
                }
            }
        }
    }
    return nearestBlock;
}

function customScanner(bot, excludes, boundingBox, exploredPos = {value: []}) {
    const playerPos = bot.entity.position.floored();
    let nearestBlock = null;
    let minDistance = Infinity;

    const maxDx = boundingBox[1].x-boundingBox[0].x;
    const maxDy = boundingBox[1].y-boundingBox[0].y;
    const maxDz = boundingBox[1].z-boundingBox[0].z;

    //console.log(maxDx,maxDy,maxDz)

    for (let dx = 1; dx <= maxDx; dx++) {
        for (let dz = 1; dz <= maxDz; dz++) {
            for (let dy = 1; dy <= maxDy; dy++) {

                for (let z = playerPos.z - dz; z <= playerPos.z + dz; z++) {
                    for (let x = playerPos.x - dx; x <= playerPos.x + dx; x++) {
                        for (let y = playerPos.y - dy; y <= playerPos.y + dy; y++) {
                            //console.log(x,y,z)
                            //console.log(exploredPos)
                            //console.log(new Vec3(x,y,z).toString())
                            if (!exploredPos.includes(new Vec3(x,y,z).toString())) {
                                //bot.chat(`/setblock ${x} ${y+10} ${z} lime_stained_glass`);
                                const block = bot.world.getBlock(new Vec3(x, y, z));
                                let currentDistance = block.position.distanceTo(playerPos);
                                if (currentDistance < minDistance) {
                                    if (!excludes.includes(block.name) && block.name !== 'air' && isInside(block, boundingBox)) {
                                        minDistance = currentDistance;
                                        nearestBlock = block;
                                        exploredPos.value.push(block.position.toString());
                                    }
                                }
                            }

                        }
                    }
                }
                if (nearestBlock !== null){ return nearestBlock; }

            }
        }
    }
    return nearestBlock;
}
function spiral(bot, blockMode, blockList, boundingBox, structure = null, lastBlock = null) {
    blockList = (Array.isArray(blockList)) ? blockList : [blockList];
    const playerPos = bot.entity.position.floored();
    const directions = [
        new Vec3(0, 0, -1),  // South
        new Vec3(1, 0, 0),   // East
        new Vec3(0, 0, 1),   // North
        new Vec3(-1, 0, 0)   // West
    ];

    let currentVector = playerPos.clone().floored();

    // Define the bounding box limits
    const minX = currentVector.x-(boundingBox[1].x-boundingBox[0].x)//boundingBox[0].x;
    const maxX = currentVector.x+(boundingBox[1].x-boundingBox[0].x)//boundingBox[1].x;
    const minZ = currentVector.z-(boundingBox[1].z-boundingBox[0].z)//boundingBox[0].z;
    const maxZ = currentVector.z+(boundingBox[1].z-boundingBox[0].z)//boundingBox[1].z;
    const minY = boundingBox[0].y;
    const maxY = boundingBox[1].y;

    let currentDirection = 0; // Start with direction 'South'
    let steps = 1; // Initial number of steps in one direction
    let stepsTaken = 0; // Counter for steps in the current direction
    let layer = 0; // Keeps track of how many layers we have expanded

    // Start at the minimum Y level
    let currentY = minY;
    currentVector.y = currentY;

    while (true) {
        // Check for block at current position
        const block = bot.world.getBlock(currentVector);
        if (!structure) {
            const listCheck = (blockMode === "includes" && blockList.includes(block.name)) ||
                (blockMode === "excludes" && !blockList.includes(block.name));
            if (listCheck && block.name !== 'air' && isInside(block, boundingBox)) {
                return block;
            }
        } else {
            if (isInside(block, boundingBox)) {
                const structBlock = offsetFromWorldBlock(structure, block);
                if (!structBlock) {
                    console.log("StructBlock is null on algorithms -> spiral");
                    return null;
                }
                const isLastBlockPlaced = lastBlock && structBlock && structBlock.position.equals(lastBlock.position)// && structBlock.name === lastBlock.name; // FIXME structBlock is sometimes null
                if (structBlock && structBlock.name !== block.name && blockList.includes(structBlock.name) && !isLastBlockPlaced) { // TODO maybe should be checked for structures too. (buildmode)
                    return structBlock;
                }
            }
        }

        // Move in the current direction
        currentVector = currentVector.add(directions[currentDirection]);
        stepsTaken++;

        // Check if we need to change direction
        if (stepsTaken >= steps) {
            // Reset steps taken
            stepsTaken = 0;
            // Change direction
            currentDirection = (currentDirection + 1) % 4;

            // Increase steps after completing a full cycle of directions (2 changes)
            if (currentDirection % 2 === 0) {
                steps++;
                // Increase layer after every two direction changes
                if (currentDirection === 0 || currentDirection === 2) {
                    layer++;
                }
            }
        }

        // Check if the spiral has completed in the current layer
        if (currentVector.x < minX || currentVector.x > maxX || currentVector.z < minZ || currentVector.z > maxZ) {
            // Move up one layer
            currentY++;
            if (currentY > maxY) {
                break; // Exit if we exceed the maximum Y limit
            }
            currentVector = new Vec3(playerPos.x, currentY, playerPos.z).floored();
            // Reset direction and steps for the new layer
            currentDirection = 0;
            steps = 1;
            stepsTaken = 0;
        }
    }
    console.log("NBB wasn't found...");
    return null;
}


module.exports = {
    dijkstra,
    scanner,
    customScanner,
    spiral
}