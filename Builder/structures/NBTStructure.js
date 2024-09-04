const registry = require("prismarine-registry")('1.20');
const Block = require("prismarine-block")(registry);
const Vec3 = require("vec3");
const { getEmptyBlockMatrix } = require("../../utils/structureUtils");

class NBTStructure {
    palette;
    materialList;
    size;
    blockMatrix;

    constructor(nbt, corner) {
        this.getPalette(nbt);
        this.getSize(nbt);
        this.getBlockMatrix(nbt, this.size, this.palette, corner);
    }

    getPalette(nbt) {
        const blocks = nbt.value.palette.value.value;
        this.palette = blocks.map(item => item.Name.value.replace(/^minecraft:/, ''));
        this.materialList = {};
        this.palette.forEach(item => {
            this.materialList[item] = 0;
        });
    }

    getSize(nbt) {
        this.size = new Vec3(
            nbt.value.size.value.value[0],
            nbt.value.size.value.value[1],
            nbt.value.size.value.value[2]
        );
    }

    getBlockMatrix(nbt, size, palette, corner) {
        let blockMatrix = getEmptyBlockMatrix(size);

        // Fill the blockMatrix
        const nbtBlocks = nbt.value.blocks.value.value;
        for (const nbtBlock of nbtBlocks) {
            const x = nbtBlock.pos.value.value[0];
            const y = nbtBlock.pos.value.value[1];
            const z = nbtBlock.pos.value.value[2]; // -1 to remove the anti noobline
            const blockString = palette[nbtBlock.state.value].replace(/^minecraft:/, '');
            let block = Block.fromString(blockString, 0);
            block.position = new Vec3(corner.x + x, corner.y + y, corner.z + z);
            blockMatrix[x][y][z] = block;

            this.materialList[blockString] += 1;
        }
        this.blockMatrix = blockMatrix;
    }
}

module.exports = NBTStructure;
