# export-sql-to-mongodb
Export tables and simple relations to its equivalent collections and dbRefs in mongodb.

### Usage
First Clone the repository.

`git clone https://github.com/chidionuekwusi/export-sql-to-mongodb`

Set config values in config.js  

``` Javascript
{
	"dev": {
		"data": {
			"url": "mongodb://localhost:27017/{dbName}"
		},
		"database": {
			"host": "127.0.0.1", //host address
			"port": 1433,//port
			"user": "{dbUser}", //username
			"password": "{password}", //password
			"database": "{dbName}", //database name
			"min.threadpool.size": 10, 
			"max.threadpool.size": 100,
			"threadpool.log": false
		}
	}
}
```

**To extract info from Microsoft SQL only run**  

`npm run json-only {name of table(s) to extract} {table2} ...` 

The script extracts all the table using tedious. It follows foreign key constraints to extract all related data from the table(s) passed.
It stores the generated json in tables folder. It also creates a file called `rel/relationships.json` that contains the relationship(s) between the
entities.

**To extract and save in MongoDB.**  

`npm run export {name of table(s) to extract} {table2} ...`  

### Mappings

These are used to tell the engine how to map the columns to the props of the collections. Its opt in by default.
```Javascript
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

```
 
### Feel free to clone 😆
