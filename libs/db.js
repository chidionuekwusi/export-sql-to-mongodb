var util = require("util"),
    basedao = require("./sqlbasedao"),
    db = function(config) {
        basedao.call(this);
        console.log("mgdao base called successfully setting up Connection...");
        this.connection = new this.Connection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.user,
            password: config.database.password,
            database: config.database.database,
            requestTimeout: config.database.requestTimeout,
            "min.threadpool.size": config.database["min.threadpool.size"],
            "max.threadpool.size": config.database["max.threadpool.size"],
            "threadpool.log": config.database["threadpool.log"]
        });
        if (this.connection) {
            console.log("connection to database success");
            this.connection.getConnection = this.connection.getConnection = this.connection.getConnection.bind(this);
        }
    };

util.inherits(db, basedao);

db.prototype.getByTableName = function(tableName,cb) {
        var params = [];
    var that = this;
    var query =`select * from ${tableName}`;
    that.select(query,
        params,
        function(er, result) {
            if (er) {
                cb(er);
                return;
            }
            cb(null, result);
        }
    );
};
db.prototype.getFKTables = function(cb) {
    var params = [];
    var that = this;
    var query =
        "   SELECT                                                 " +
        "    o1.name AS FK_table,                                  " +
        "    c1.name AS FK_column,                                 " +
        "    fk.name AS FK_name,                                   " +
        "    o2.name AS PK_table,                                  " +
        "    c2.name AS PK_column,                                 " +
        "    pk.name AS PK_name,                                   " +
        "    fk.delete_referential_action_desc AS Delete_Action,   " +
        "    fk.update_referential_action_desc AS Update_Action    " +
        "FROM sys.objects o1                                       " +
        "    INNER JOIN sys.foreign_keys fk                        " +
        "        ON o1.object_id = fk.parent_object_id             " +
        "    INNER JOIN sys.foreign_key_columns fkc                " +
        "        ON fk.object_id = fkc.constraint_object_id        " +
        "    INNER JOIN sys.columns c1                             " +
        "        ON fkc.parent_object_id = c1.object_id            " +
        "        AND fkc.parent_column_id = c1.column_id           " +
        "    INNER JOIN sys.columns c2                             " +
        "        ON fkc.referenced_object_id = c2.object_id        " +
        "        AND fkc.referenced_column_id = c2.column_id       " +
        "    INNER JOIN sys.objects o2                             " +
        "        ON fk.referenced_object_id = o2.object_id         " +
        "    INNER JOIN sys.key_constraints pk                     " +
        "        ON fk.referenced_object_id = pk.parent_object_id  " +
        "        AND fk.key_index_id = pk.unique_index_id          " +
        "ORDER BY o1.name, o2.name, fkc.constraint_column_id       ";
    that.select(query,
        params,
        function(er, result) {
            if (er) {
                cb(er);
                return;
            }
            //console.log(result);
            cb(null, result);
        }
    );
};

module.exports = db;
