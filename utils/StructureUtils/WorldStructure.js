const { getEmptyBlockMatrix } = require("./VerifyStructure");
const Vec3 = require("vec3")

class WorldStructure {
    static async getPalette(world, size, corner){
        let palette = []
        let materialList = {}
        for(let x = 0; x < size.x; x++){
            for(let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    const block = await world.getBlock(new Vec3(corner.x + x, corner.y + y, corner.z + z)).name
                    if (!palette.includes(block)){
                        palette.push(block)
                        materialList[block] = 1;
                    } else {
                        materialList[block]++;
                    }
                }
            }
        }
        return [palette, materialList]
    }

    static getSize(size){
        return size // Redundant
    }
    static async getBlockMatrix(world, size, corner) {
        let blockMatrix = getEmptyBlockMatrix(size)

        // Fill the blockMatrix
        for (let x = 0; x < size.x; x++) {
            for (let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    blockMatrix[x][y][z] = await world.getBlock(new Vec3(corner.x + x, corner.y + y, corner.z + z))
                }
            }
        }
        return blockMatrix
    }
}
module.exports = WorldStructure