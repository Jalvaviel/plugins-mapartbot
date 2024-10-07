const { getEmptyBlockMatrix, sortKeysByValues } = require("../../utils/structureUtils");
const Structure = require("./Structure.js")
const {Vec3} = require("vec3");

/**
 * Verifies if the two StructureUtils are equal. Returns a new Structure of the missing blocks. The new Structure is assembled with a builder pattern.
 * @param structure1 A StructureUtils from an NBT.
 * @param structure2 A StructureUtils from the world.
 * @returns Structure | null
 */
function verifyStructure(structure1,structure2) { // TODO Add mode build/clear
    if (!structure1.size.equals(structure2.size)) return null; // Detect if they're the same size, if not return a null
    let palette = [];
    let materialList = {};
    //structure1.logStructureData();
    //structure2.logStructureData();
    let bMatrix = getEmptyBlockMatrix(structure1.size);
    for(let x = 0; x < structure1.size.x; x++) {
        for(let y = 0; y < structure1.size.y; y++) {
            for (let z = 0; z < structure1.size.z; z++) {
                if (structure1.blockMatrix[x][y][z].name !== structure2.blockMatrix[x][y][z].name) { // If the block names are not equal, put it in the new blockMatrix
                    bMatrix[x][y][z] = structure1.blockMatrix[x][y][z]; // Assign to the new StructureUtils the nbt StructureUtils' block
                    if (!palette.includes(bMatrix[x][y][z].name)){ // If there's no mat in the palette for that block: i.e. "stone", put it and set the matCount to 1
                        palette.push(bMatrix[x][y][z].name);
                        materialList[bMatrix[x][y][z].name] = 1;
                    } else { // If there's already one instance of the mat in the palette, means that it at least has 1 mat in the materialList of that type, so we add 1
                        materialList[bMatrix[x][y][z].name] += 1;
                    }
                }
            }
        }
    }
    materialList = sortKeysByValues(materialList); // Sort the mats by quantity
    //delete materialList['air']; // Remove the air from the list, it's handled later
    return new Structure(palette, structure1.size, bMatrix, materialList);
}

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

function offsetFromWorldBlock(boundingBox, worldBlock, currentStructure) {
    if (!(boundingBox[0].x <= worldBlock.position.x) || !(worldBlock.position.x <= boundingBox[1].x) ||
        !(boundingBox[0].y <= worldBlock.position.y) || !(worldBlock.position.y <= boundingBox[1].y) ||
        !(boundingBox[0].z <= worldBlock.position.z) || !(worldBlock.position.z <= boundingBox[1].z)) return null;
    const offsetX = worldBlock.x - boundingBox[0].x;
    const offsetY = worldBlock.y - boundingBox[0].y;
    const offsetZ = worldBlock.z - boundingBox[0].z;
    return new Vec3(offsetX,offsetY,offsetZ);
}

module.exports = { verifyStructure, getMissingMats, offsetFromWorldBlock };