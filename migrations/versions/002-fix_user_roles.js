'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * changeColumn "tkdRole" on table "users"
 * changeColumn "role" on table "users"
 *
 **/

var info = {
    "revision": 2,
    "name": "fix_user_roles",
    "created": "2026-08-02T12:47:16.856Z",
    "comment": ""
};

var migrationCommands = [{
        fn: "changeColumn",
        params: [
            "users",
            "tkd_role",
            {
                "type": Sequelize.ENUM('super_admin', 'admin', 'customer', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER', 'coach'),
                "field": "tkd_role",
                "allowNull": true
            }
        ]
    },
    {
        fn: "changeColumn",
        params: [
            "users",
            "role",
            {
                "type": Sequelize.ENUM('super_admin', 'admin', 'customer', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER', 'coach'),
                "field": "role",
                "defaultValue": "customer",
                "allowNull": false
            }
        ]
    }
];

module.exports = {
    pos: 0,
    up: function(queryInterface, Sequelize)
    {
        var index = this.pos;
        return new Promise(function(resolve, reject) {
            function next() {
                if (index < migrationCommands.length)
                {
                    let command = migrationCommands[index];
                    console.log("[#"+index+"] execute: " + command.fn);
                    index++;
                    queryInterface[command.fn].apply(queryInterface, command.params).then(next, reject);
                }
                else
                    resolve();
            }
            next();
        });
    },
    info: info
};
