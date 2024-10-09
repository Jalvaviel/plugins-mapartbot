const NBTStructure = require("./NBTStructure");
const WorldStructure = require("./WorldStructure");
const Vec3 = require("vec3");
const { getEmptyBlockMatrix } = require("./VerifyStructure");

class Structure {
    constructor(palette, size, blockMatrix, materialList) {
        this.palette = palette;
        this.size = size;
        this.blockMatrix = blockMatrix;
        this.materialList = materialList;
    }

    static async FromNBT(nbt, corner) {
        const nbtStructure = await new NBTStructure(nbt, corner);
        return new Structure(
            nbtStructure.palette,
            nbtStructure.size,
            nbtStructure.blockMatrix,
            nbtStructure.materialList
        );
    }

    static async FromWorld(world, corner, size = new Vec3(128, 3, 129)) {
        const blockMatrix = await WorldStructure.getBlockMatrix(world, size, corner);
        const [palette,materialList] = await WorldStructure.getPalette(world, size, corner);
        return new Structure(palette, size, blockMatrix, materialList);
    }

    static FromAir(corner,size= new Vec3(128, 3, 129)){
        const blockMatrix = getEmptyBlockMatrix(size, corner);
        const palette = ['air'];
        const materialList = {'air': size.x*size.y*size.z}
        return new Structure(palette,size,blockMatrix,materialList)
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
}

module.exports = Structure;
