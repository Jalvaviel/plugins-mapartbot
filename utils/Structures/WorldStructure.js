const { getEmptyBlockMatrix } = require("./StructureUtils");
const Vec3 = require("vec3")

class WorldStructure {
    palette;
    materialList;
    size;
    blockMatrix;
    constructor(world, size, bbox) {
        this.getPalette(world,size,bbox);
        this.getSize(size);
        this.getBlockMatrix(world, size, bbox);
    }
    getPalette(world, size, bbox){
        let palette = []
        let materialList = {}
        for(let x = 0; x < size.x; x++){
            for(let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    const block = world.getBlock(new Vec3(bbox[0].x + x, bbox[0].y + y, bbox[0].z + z)).name
                    if (!palette.includes(block)){
                        palette.push(block)
                        materialList[block] = 1;
                    } else {
                        materialList[block]++;
                    }
                }
            }
        }
        this.palette = palette;
        this.materialList = materialList;
    }

    getSize(size){
        this.size = size; // Redundant
    }
    getBlockMatrix(world, size, bbox) {
        let blockMatrix = getEmptyBlockMatrix(size);

        // Fill the blockMatrix
        for (let x = 0; x < size.x; x++) {
            for (let y = 0; y < size.y; y++) {
                for (let z = 0; z < size.z; z++) {
                    blockMatrix[x][y][z] = world.getBlock(new Vec3(bbox[0].x + x, bbox[0].y + y, bbox[0].z + z));
                }
            }
        }
        this.blockMatrix = blockMatrix;
    }
}
module.exports = WorldStructure