let DB = require("./libs/db"),
	config = require("./config.json")[
		process.env.profile || process.env.NODE_ENV || "dev"
	],
	db = new DB(config),
	MongoClient = require("mongodb").MongoClient,
	async = require("async"),
	fs = require("fs"),
	defaultError = er => {
		return (
			console.log("an error has occurred"),
			console.log(er),
			process.exit(2)
		);
	};

function getTableRelationships(fn) {
	try {
		let result = require("./rel/relationships.json");
		setImmediate(fn, null, result);
	} catch (e) {
		db.getFKTables(function(er, _fks) {
			if (er) return defaultError(er);
			fs.writeFileSync(
				"./rel/relationships.json",
				JSON.stringify(_fks, null, " ")
			);
			fn(null, _fks);
		});
	}
}

function createTable(tableName, tables = {}, fks, fn) {
	console.log(tableName);
	let tasks = [
			function(callback) {
				setImmediate(callback);
			}
		],
		result,
		tableNameExp = new RegExp(`^${tableName}$`, "ig"),
		keys = fks.filter(i => tableNameExp.test(i.FK_table));

	try {
		result = require(`./tables/${tableName}.json`);
	} catch (e) {}

	if (keys.length) {
		keys.forEach(key => {
			tasks.push(createTable.bind(this, key.PK_table, tables, fks));
		});
	}
	async.parallel(tasks, er => {
		if (result) return (tables[tableName] = result), fn(null, tables);

		db.getByTableName(tableName, function(er, tableData) {
			if (er) return defaultError(er);
			fs.writeFileSync(
				`./tables/${tableName}.json`,
				JSON.stringify(tableData, null, " ")
			);
			tables[tableName] = tableData;
			fn(null, tables);
		});
	});
}

function save(tableNames, opts, fn) {
	MongoClient.connect(config.data.url, (er, _db) => {
		if (er) return fn(er);
		let tasks = [];
		tableNames.forEach(tableName => {
			tasks.push(extractInfo.bind(this, _db, tableName, opts, {}));
		});
		async.parallel(tasks, er => {
			fn(er);
		});
	});
}
function extractInfo(_db, tableName, opts, prim, fn) {
	let tableNameExp = new RegExp(`^${tableName}$`, "ig"),
		keys = opts.relationships.filter(i => tableNameExp.test(i.FK_table)),
		tasks = [],
		data = opts.tables[tableName];

	if (typeof fn !== "function") {
		console.log("bad");
	}

	tasks.push(function(callback) {
		return setImmediate(callback, null, prim);
	});

	keys.forEach(key => {
		tasks.push(extractInfo.bind(this, _db, key.PK_table, opts));
	});
	tasks.push(function(prim, callback) {
		let _config = {
			collectionName: tableName
		};
		try {
			_config = require(`./mappings/${tableName}.js`);
		} catch (e) {}
		let col = _db.collection(_config.collectionName);
		let pkTableNameExp = new RegExp(`^${tableName}$`, "ig");
		let pks = opts.relationships.filter(i =>
			pkTableNameExp.test(i.PK_table)
		);
		let _pks = pks.reduce((sum, x) => {
			return (sum[x.PK_column] = x), sum;
		}, {});
		let pksPromise = [];
		Promise.all(
			pks.map(function(p) {
				return col.createIndex(
					{ [p.PK_column]: 1 },
					{ unique: true, sparse: true }
				);
			})
		)
			.then(() => {
				let hasMapping = !!_config.mapping,
					_keys,
					_context = {},
					_prim;
				if (hasMapping) {
					_keys = keys.reduce((sum, x) => {
						return (sum[x.FK_column] = x), sum;
					}, {});
					_prim = {};
				}

				let toInsert = data.map(d => {
					let result;
					if (hasMapping) {
						if (typeof _config.mapping == "function") {
							return _config.mapping.call(
								context,
								d,
								prim,
								_keys
							);
						}
						result = Object.keys(d).reduce((sum, x) => {
							let rel = _keys[x];
							if (rel) {
								if (!_prim[rel.PK_table]) {
									_prim[rel.PK_table] = prim[
										rel.PK_table
									].reduce((sum, x) => {
										return (sum[x[rel.PK_column]] = x), sum;
									}, {});
								}
								found = _prim[rel.PK_table][d[rel.PK_column]];
								found = found && found._id;
								if (found) sum[_config.mapping[x] || x] = found;
							}

							//use the mapping to change column names
							if (_config.mapping[x] && !sum[_config.mapping[x]])
								sum[_config.mapping[x]] = d[x];

							//ensure relationships are preserved.
							if (_pks[x]) sum[x] = d[x];
							return sum;
						}, {});
					} else {
						result = Object.assign({}, d);
						keys.forEach(e => {
							if (result[e.FK_column])
								result[e.FK_column] = prim[e.PK_table].filter(
									item =>
										item[e.PK_column] == result[e.FK_column]
								)[0]._id;
						});
					}
					return Object.assign(result, _config.assign || {});
				});

				col.insertMany(toInsert, (er, r) => {
					if (er) return callback(er);
					col.find({}).toArray((er, _saved) => {
						return callback(
							er,
							Object.assign({}, prim, { [tableName]: _saved })
						);
					});
				});
			})
			.catch(function(er) {
				console.log("promise error");
				console.log(er);
				callback(er);
			});
	});

	async.waterfall(tasks, (er, every) => {
		return fn(er, every);
	});
}
function getDataAndStore(fn) {
	let tasks = [];
	getTableRelationships((er, relationships) => {
		for (var i = process.argv.length - 1; i >= 0; i--) {
			let arg = process.argv[i];
			if (i > 1) {
				tasks.push(function(callback) {
					createTable(arg, {}, relationships, (er, tables) => {
						console.log(
							"created these guys " +
								Object.keys(tables).join(",")
						);
						callback(er, { table: arg, tables });
					});
				});
			}
		}
		async.parallel(tasks, (er, tables) => {
			fn(er, { tables, relationships });
		});
	});
}

module.exports = {
	getDataAndStore,
	getTableRelationships,
	createTable,
	save
};
