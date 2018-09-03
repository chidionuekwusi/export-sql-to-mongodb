var util = require("util");
var EventEmitter = require("events").EventEmitter
var dbConnection = require("./sqldbconnection");
var Request = require("tedious").Request;
var TYPES = require('tedious').TYPES;

var BaseDAO = function() {
    this.Connection = dbConnection;
    this.Request = Request;
    this.TYPES = TYPES;
}
util.inherits(BaseDAO, EventEmitter);
//options is optional
BaseDAO.prototype.addParameter = function(arr, name, type, value, options) {
    arr.push({
        name: name,
        type: type,
        value: value,
        options: options
    });
};

BaseDAO.prototype.select = function(query, params, cb) {
    var self = this;
    this.connection.getConnection(function(er, c) {
        if (er) {
            cb(er);
            return;
        }

        var result = [];
        var request = new self.Request(query, function(err, rowCount) {
            console.log('number of rows returned:' + rowCount);
            if (err) {
                console.log('error occurred while selecting');
                cb(err);
                return;
            }
            c.release();
            cb(null, result);
        });

        // request.on('doneInProc', function(rowCount, more, returnStatus, rows) {
        //     console.log('select statement ran:' + query);
        //     c.release();
        //     cb(null, result);
        // });
        request.on('row', function(columns) {
            var row = {};
           // console.log('row:' + result.length);
            columns.forEach(function(column) {
                row[column.metadata.colName] = column.value;
            });
            result.push(row);
        });
        for (var i = 0; i < params.length; i++) {
            //console.log('adding parameter:' + params[i].name + ' value:' + params[i].value);
            request.addParameter(params[i].name, params[i].type, params[i].value, params[i].options);
        }
        // console.log('query:' + query);
        // console.log('executing query');
        c.execSql(request);
    });
};

BaseDAO.prototype.fireStoredProcedure = function(query, params, cb) {
    var self = this;
    this.connection.getConnection(function(er, c) {
        if (er) {
            cb(er);
            return;
        }
        var request = new self.Request(query, function(err, rowCount, rows) {
            if (err) {
                cb(err);
                return;
            }

            console.log('query ran:' + query);
            console.log('row count :' + rowCount);
            console.log('actual rows:');
            console.log(rows);
            c.release();
            var result = rows.map(function(columns) {
                var row = {};
                columns.forEach(function(column) {
                    row[column.metadata.colName] = column.value;
                });
                return row;
            });
            cb(null, result);
        });

        for (var i = 0; i < params.length; i++) {
            request.addParameter(params[i].name, params[i].type, params[i].value);
        }
        c.callProcedure(request);
    });
}

module.exports = BaseDAO;