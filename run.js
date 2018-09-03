var lib = require("./lib");

lib.getDataAndStore((er, { tables, relationships }) => {
	lib.save(
		tables.map(x => x.table),
		{
			tables: tables.reduce((sum, x) => {
				return Object.assign(sum, x.tables);
			}, {}),
			relationships
		},
		() => {
			console.log("done");
			process.exit(0);
		}
	);
});
