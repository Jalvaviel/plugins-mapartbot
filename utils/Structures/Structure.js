const NBTStructure = require("./NBTStructure");
const WorldStructure = require("./WorldStructure");
const Vec3 = require("vec3");
const { getEmptyBlockMatrix, sortKeysByValues} = require("./StructureUtils");

class Structure {
    constructor(palette, size, blockMatrix, materialList, bbox) {
        this.palette = palette;
        this.size = size;
        this.blockMatrix = blockMatrix;
        this.materialList = materialList;
        this.bbox = bbox;
    }

    static async FromNBT(nbt, bbox) {
        const nbtStructure = new NBTStructure(nbt, bbox);
        return new Structure(
            nbtStructure.palette,
            nbtStructure.size,
            nbtStructure.blockMatrix,
            nbtStructure.materialList,
            bbox
        );
    }

    static FromWorld(world, bbox, size = new Vec3(128, 3, 129)) {
        const worldStructure = new WorldStructure(world,size,bbox);
        return new Structure(
            worldStructure.palette,
            worldStructure.size,
            worldStructure.blockMatrix,
            worldStructure.materialList,
            bbox);
    }

    static FromAir(bbox,size= new Vec3(128, 3, 129)){
        const blockMatrix = getEmptyBlockMatrix(size, bbox);
        const palette = ['air'];
        const materialList = {'air': size.x*size.y*size.z}
        return new Structure(palette,size,blockMatrix,materialList,bbox)
    }

    logStructure() {
        console.log("- PALETTE -");
        console.log(" ");
        console.log(this.palette);
        console.log(" ");
        console.log("- SIZE -");
        console.log(" ");
        console.log(this.size);
        console.log(" ");
        console.log("- BLOCK MATRIX -");
        console.log(" ");
        console.log(this.blockMatrix[0][0][0]);
        console.log(" ");
        console.log("- MATERIAL LIST -");
        console.log(" ");
        console.log(this.materialList);
        console.log(" ");
    }

    /**
     * Verifies if the two Structures are equal. Returns a new Structure of the missing blocks. The new Structure is assembled with a builder pattern.
     * @param structure1 A Structures from an NBT.
     * @param structure2 A Structures from the world.
     * @returns Structures | null
     */
    static verifyStructure(structure1, structure2) { // TODO Add mode build/clear
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
                        bMatrix[x][y][z] = structure1.blockMatrix[x][y][z]; // Assign to the new Structures the nbt Structures' block
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
}

module.exports = Structure;
