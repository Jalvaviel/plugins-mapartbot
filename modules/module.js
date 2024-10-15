class Module {
    constructor(bot, config) {
        this.bot = bot // Mineflayer bot reference
        this.config = config // JSON Parsed file of the config constants.
        this.stop = false;
        this.isActive = false;
        this.addListeners();
    }

    addListeners() {
        // You should add event listeners for this module if it's dependent on other modules / utils that need to interrupt this module's code flow.
        // E.G, bot should stop to eat -> stop all the code running on this module with "if (this.stop) return;", etc.
        /*
        this.bot.on('eat', (eatEvent) => {
            if (this.isActive) {
                if (eatEvent.eating) {
                    this.bot.pathfinder.stop();
                    this.stop = true;
                } else {
                    this.stop = false;
                }
            }
        });
         */
        // It's also tasked to rerun all the tasks in this module scheduled before the module is stopped.
        throw new Error("Not implemented...");
    }

    async activate() {
        // What method should you call when the module is activated.
        // We need to create an instance of the module externally and then call this method to start it.
        // Think of this as an entrypoint for your module functionality
        this.isActive = true; // This needs to be on ALL activate methods.
        // Run whatever...
        throw new Error("Not implemented...");
    }

    async deactivate() {
        // What method should you call when the module is activated.
        // We need to create an instance of the module externally and then call this method to start it.
        this.isActive = false; // This needs to be on ALL deactivate methods.
        // Clear intervals if needed...
        throw new Error("Not implemented...");
    }

    async whatever() {
        // This is the function that runs when the module is active (activate() calls it).
        // if (this.stop) return;
        // console.log("Hello bot!");
        // await whatever();
        // console.log("Goodbye bot!");
        throw new Error("Not implemented...");
    }

}