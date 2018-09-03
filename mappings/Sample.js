//mapping name should match table name;
module.exports = {
	collectionName: "samples", //collection name
	mapping: {
		DEPARTMENT_NAME: "name" //table column name : json property Name
	},
	assign: {
		version: "1.0" // assign this property to all items.
	}
};
