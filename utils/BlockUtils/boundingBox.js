const {Vec3} = require("vec3");

function boundingBox(botPos, height = 3, noobline = true) {
    const cornerX = Math.round(botPos.x / 128) * 128 - 64;
    const cornerZ = noobline
        ? Math.round(botPos.z / 128) * 128 - 64
        : Math.round(botPos.z / 128) * 128 - 64 - 1;
    return [
        new Vec3(cornerX, Math.floor(botPos.y), cornerZ),
        new Vec3(cornerX + 128, Math.floor(botPos.y) + height, noobline ? cornerZ + 127 : cornerZ + 128)
    ];
}


function isInside(block, boundingBox) {
    const blockPos = block.position;
    if (boundingBox === null) return true;
    return (boundingBox[0].x <= blockPos.x && blockPos.x <= boundingBox[1].x) &&
        (boundingBox[0].y <= blockPos.y && blockPos.y <= boundingBox[1].y) &&
        (boundingBox[0].z <= blockPos.z && blockPos.z <= boundingBox[1].z);
}

module.exports = {
    boundingBox,
    isInside
}