function stringToId(registry,string) {
    return registry.itemsByName[string].id;
}

module.exports = stringToId;