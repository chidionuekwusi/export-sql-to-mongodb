var lib = require("./lib");

lib.getDataAndStore(() => {
	console.log("finished");
	process.exit(0);
});
