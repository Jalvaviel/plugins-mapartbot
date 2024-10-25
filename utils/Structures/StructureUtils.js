const {Vec3} = require("vec3");
const {readFileSync} = require("fs");
const nbt = require('prismarine-nbt');
const registry = require("prismarine-registry")('1.20');
const Block = require("prismarine-block")(registry);

function getMissingMats(materialList1,materialList2) { // The currentStructure vs worldStructure
    const result = {};
    for (const key in materialList1) {
        if (materialList2.hasOwnProperty(key)) {
            result[key] = materialList1[key] - materialList2[key];
            result[key] = result[key] < 0 ? 0 : result[key];
        } else {
            result[key] = materialList1[key]
        }
    }
    return sortKeysByValues(result);
}

function offsetFromWorldBlock(structure, worldBlock) { // FIXME PROBLEMS HERE
    const boundingBox = structure.bbox;
    if (!(boundingBox[0].x <= worldBlock.position.x) || !(worldBlock.position.x <= boundingBox[1].x) ||
        !(boundingBox[0].y <= worldBlock.position.y) || !(worldBlock.position.y <= boundingBox[1].y) ||
        !(boundingBox[0].z <= worldBlock.position.z) || !(worldBlock.position.z <= boundingBox[1].z)) return null;
    const offsetX = worldBlock.position.x - boundingBox[0].x;
    const offsetY = worldBlock.position.y - boundingBox[0].y;
    const offsetZ = worldBlock.position.z - boundingBox[0].z;
    try {
        return structure.blockMatrix[offsetX][offsetY][offsetZ];
    } catch (e) {
        console.log(offsetX,offsetY,offsetZ);
    }
}

function getEmptyBlockMatrix(size) {
    const air = Block.fromString('air', 0)
    const width = size.x
    const height = size.y
    const depth = size.z

    let blockMatrix = new Array(width)
    for (let x = 0; x < width; x++) {
        blockMatrix[x] = new Array(height)
        for (let y = 0; y < height; y++) {
            blockMatrix[x][y] = new Array(depth).fill(air)
        }
    }
    return blockMatrix
}

async function parseNbt(filepath = "./schematics/test.nbt") {
    try {
        const buffer = readFileSync(filepath)
        const { parsed } = await nbt.parse(buffer)
        return parsed
    } catch (error) {
        console.error("Error reading or parsing NBT file:", error)
        throw error;
    }
}

function sortKeysByValues(obj) {
    // Convert the object into an array of key-value pairs
    const entries = Object.entries(obj);

    // Sort the array based on the values (descending order)
    entries.sort(([, valueA], [, valueB]) => valueB - valueA);

    // Convert the sorted array back into an object
    return Object.fromEntries(entries);
}

module.exports = { getMissingMats, offsetFromWorldBlock, getEmptyBlockMatrix, parseNbt, sortKeysByValues };