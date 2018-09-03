var DB = function(config) {
    console.log(config);
    var self = this;
    var er_count = 0;
    this.ConnectionPool = require("tedious-connection-pool");
    this.getConnection = function(callback) {
        if (!callback) {
            throw "callback cannot be empty";
        }
        var context = this;
        console.log("providing connection....");
        if (!self.connection) {
            self.connection = new self.ConnectionPool(
                {
                    min: config["min.threadpool.size"],
                    max: config["max.threadpool.size"],
                    log: config["threadpool.log"]
                },
                {
                    server: config.host,
                    userName: config.user,
                    password: config.password,
                    options: {
                        database: config.database,
                        port: config.port,
                        instanceName: config.instanceName,
                        rowCollectionOnDone: true,
                        rowCollectionOnRequestCompletion: true
                    }
                }
            );
            self.connection.on("error", function(err) {
                self.connection.drain();
                console.log("connection pool drained , about to be discarded");
                console.log("connection pool error:" + err);
                self.connection = null;
                er_count = 0;
            });
        }

        self.connection.acquire(function(bad, connection) {
            if (bad) {
                console.log("error count:" + er_count);
                console.log("could not acquire connection..");
                console.log(bad);
                er_count++;
                if (bad && callback) callback.call(context, bad);

                if (er_count == 3) {
                    console.log("draining connection pool...");
                    self.connection.drain();
                    self.connection = null;
                    er_count = 0;
                    console.log(
                        "connnection pool drained and connection reset"
                    );
                }
            } else {
                callback.call(context, null, connection);
            }
        });
    };
};
module.exports = DB;
