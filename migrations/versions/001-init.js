'use strict';

var Sequelize = require('sequelize');

/**
 * Actions summary:
 *
 * createTable "users", deps: []
 * createTable "uploaded_images", deps: []
 * createTable "tournaments", deps: []
 * createTable "clubs", deps: []
 * createTable "players", deps: [clubs, tournaments]
 * createTable "categories", deps: [tournaments]
 * createTable "matches", deps: [tournaments, categories, players, players, players, matches]
 * createTable "audit_logs", deps: [users]
 * createTable "tournament_clubs", deps: [tournaments, clubs]
 * createTable "match_events", deps: [matches, players]
 *
 **/

var info = {
    "revision": 1,
    "name": "init",
    "created": "2026-07-27T14:11:55.488Z",
    "comment": ""
};

var migrationCommands = [{
        fn: "createTable",
        params: [
            "users",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "email": {
                    "type": Sequelize.STRING,
                    "field": "email",
                    "unique": true,
                    "allowNull": false
                },
                "password": {
                    "type": Sequelize.STRING,
                    "field": "password",
                    "allowNull": false
                },
                "role": {
                    "type": Sequelize.ENUM('super_admin', 'admin', 'customer', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER'),
                    "field": "role",
                    "defaultValue": "customer",
                    "allowNull": false
                },
                "name": {
                    "type": Sequelize.STRING,
                    "field": "name",
                    "allowNull": true
                },
                "contactInfo": {
                    "type": Sequelize.JSONB,
                    "field": "contact_info",
                    "allowNull": true
                },
                "address": {
                    "type": Sequelize.TEXT,
                    "field": "address",
                    "allowNull": true
                },
                "profilePictureUrl": {
                    "type": Sequelize.TEXT,
                    "field": "profile_picture_url",
                    "allowNull": true
                },
                "isActive": {
                    "type": Sequelize.BOOLEAN,
                    "field": "is_active",
                    "defaultValue": true,
                    "allowNull": true
                },
                "tkdRole": {
                    "type": Sequelize.ENUM('ADMIN', 'HEAD_JUDGE', 'MAT_JUDGE', 'SCOREKEEPER'),
                    "field": "tkd_role",
                    "allowNull": true
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "uploaded_images",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "hash": {
                    "type": Sequelize.STRING(64),
                    "field": "hash",
                    "unique": true,
                    "allowNull": false
                },
                "url": {
                    "type": Sequelize.TEXT,
                    "field": "url",
                    "allowNull": false
                },
                "filename": {
                    "type": Sequelize.TEXT,
                    "field": "filename",
                    "allowNull": false
                },
                "mimetype": {
                    "type": Sequelize.TEXT,
                    "field": "mimetype",
                    "allowNull": false
                },
                "size": {
                    "type": Sequelize.INTEGER,
                    "field": "size",
                    "allowNull": true
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "tournaments",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "name": {
                    "type": Sequelize.STRING,
                    "field": "name",
                    "allowNull": false
                },
                "startDate": {
                    "type": Sequelize.DATEONLY,
                    "field": "start_date",
                    "allowNull": false
                },
                "endDate": {
                    "type": Sequelize.DATEONLY,
                    "field": "end_date",
                    "allowNull": false
                },
                "settings": {
                    "type": Sequelize.JSONB,
                    "field": "settings",
                    "defaultValue": Sequelize.Object,
                    "allowNull": false
                },
                "isCompleted": {
                    "type": Sequelize.BOOLEAN,
                    "field": "is_completed",
                    "defaultValue": false,
                    "allowNull": false
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "field": "updatedat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "clubs",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "name": {
                    "type": Sequelize.STRING,
                    "field": "name",
                    "unique": true,
                    "allowNull": false
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "field": "updatedat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "players",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "name": {
                    "type": Sequelize.STRING,
                    "field": "name",
                    "allowNull": false
                },
                "nationalId": {
                    "type": Sequelize.STRING(14),
                    "field": "national_id",
                    "allowNull": true
                },
                "dob": {
                    "type": Sequelize.DATEONLY,
                    "field": "dob",
                    "allowNull": false
                },
                "weight": {
                    "type": Sequelize.DECIMAL(5, 2),
                    "field": "weight",
                    "allowNull": false
                },
                "seed": {
                    "type": Sequelize.INTEGER,
                    "field": "seed",
                    "allowNull": true
                },
                "gender": {
                    "type": Sequelize.ENUM('MALE', 'FEMALE'),
                    "field": "gender",
                    "allowNull": false
                },
                "clubId": {
                    "type": Sequelize.INTEGER,
                    "field": "club_id",
                    "allowNull": false
                },
                "tournamentId": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "allowNull": true
                },
                "photoUrl": {
                    "type": Sequelize.TEXT,
                    "field": "photo_url",
                    "allowNull": true
                },
                "imageUrl": {
                    "type": Sequelize.TEXT,
                    "field": "image_url",
                    "allowNull": true
                },
                "birthCertificateUrl": {
                    "type": Sequelize.TEXT,
                    "field": "birth_certificate_url",
                    "allowNull": true
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "field": "updatedat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                },
                "club_id": {
                    "type": Sequelize.INTEGER,
                    "field": "club_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "clubs",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "tournament_id": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "tournaments",
                        "key": "id"
                    },
                    "allowNull": true
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "categories",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "name": {
                    "type": Sequelize.STRING,
                    "field": "name",
                    "allowNull": false
                },
                "tournamentId": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "allowNull": false
                },
                "bracketDepth": {
                    "type": Sequelize.INTEGER,
                    "field": "bracket_depth",
                    "defaultValue": 4,
                    "allowNull": false
                },
                "gender": {
                    "type": Sequelize.ENUM('MALE', 'FEMALE'),
                    "field": "gender",
                    "allowNull": false
                },
                "minWeight": {
                    "type": Sequelize.DECIMAL(5, 2),
                    "field": "min_weight",
                    "allowNull": false
                },
                "maxWeight": {
                    "type": Sequelize.DECIMAL(5, 2),
                    "field": "max_weight",
                    "allowNull": false
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "field": "updatedat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                },
                "tournament_id": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "tournaments",
                        "key": "id"
                    },
                    "allowNull": true
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "matches",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "tournamentId": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "allowNull": false
                },
                "categoryId": {
                    "type": Sequelize.INTEGER,
                    "field": "category_id",
                    "allowNull": true
                },
                "type": {
                    "type": Sequelize.ENUM('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'FRIENDLY'),
                    "field": "type",
                    "defaultValue": "SINGLE_ELIMINATION",
                    "allowNull": false
                },
                "player1Id": {
                    "type": Sequelize.INTEGER,
                    "field": "player1_id",
                    "allowNull": false
                },
                "player2Id": {
                    "type": Sequelize.INTEGER,
                    "field": "player2_id",
                    "allowNull": false
                },
                "scheduledTime": {
                    "type": Sequelize.DATE,
                    "field": "scheduled_time",
                    "allowNull": false
                },
                "endTime": {
                    "type": Sequelize.DATE,
                    "field": "end_time",
                    "allowNull": true
                },
                "status": {
                    "type": Sequelize.ENUM('SCHEDULED', 'PRE_MATCH', 'IN_PROGRESS', 'PAUSED', 'ROUND_END', 'FINISHED', 'MATCH_END', 'CANCELLED'),
                    "field": "status",
                    "defaultValue": "SCHEDULED",
                    "allowNull": false
                },
                "winnerId": {
                    "type": Sequelize.INTEGER,
                    "field": "winner_id",
                    "allowNull": true
                },
                "currentRound": {
                    "type": Sequelize.INTEGER,
                    "field": "current_round",
                    "defaultValue": 1,
                    "allowNull": false
                },
                "totalRounds": {
                    "type": Sequelize.INTEGER,
                    "field": "total_rounds",
                    "defaultValue": 3,
                    "allowNull": false
                },
                "intraClubWarning": {
                    "type": Sequelize.BOOLEAN,
                    "field": "intra_club_warning",
                    "defaultValue": false,
                    "allowNull": false
                },
                "bracketRound": {
                    "type": Sequelize.INTEGER,
                    "field": "bracket_round",
                    "allowNull": true
                },
                "weightClass": {
                    "type": Sequelize.STRING,
                    "field": "weight_class",
                    "allowNull": true
                },
                "scorePlayer1": {
                    "type": Sequelize.INTEGER,
                    "field": "score_player1",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "scorePlayer2": {
                    "type": Sequelize.INTEGER,
                    "field": "score_player2",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "nextMatchId": {
                    "type": Sequelize.INTEGER,
                    "field": "next_match_id",
                    "allowNull": true
                },
                "nextMatchSlot": {
                    "type": Sequelize.ENUM('PLAYER1', 'PLAYER2'),
                    "field": "next_match_slot",
                    "allowNull": true
                },
                "stageName": {
                    "type": Sequelize.STRING,
                    "field": "stage_name",
                    "defaultValue": "Round 1",
                    "allowNull": false
                },
                "bracketPosition": {
                    "type": Sequelize.INTEGER,
                    "field": "bracket_position",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "endReason": {
                    "type": Sequelize.ENUM('TIME_EXPIRED', 'POINT_GAP', 'WALKOVER', 'INJURY_WITHDRAWAL', 'DISQUALIFICATION', 'REFEREE_STOPPAGE', 'GOLDEN_POINT', 'BYE'),
                    "field": "end_reason",
                    "allowNull": true
                },
                "hongScore": {
                    "type": Sequelize.INTEGER,
                    "field": "hong_score",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "chungScore": {
                    "type": Sequelize.INTEGER,
                    "field": "chung_score",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "hongPenalties": {
                    "type": Sequelize.INTEGER,
                    "field": "hong_penalties",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "chungPenalties": {
                    "type": Sequelize.INTEGER,
                    "field": "chung_penalties",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "hongInjured": {
                    "type": Sequelize.BOOLEAN,
                    "field": "hong_injured",
                    "defaultValue": false,
                    "allowNull": false
                },
                "chungInjured": {
                    "type": Sequelize.BOOLEAN,
                    "field": "chung_injured",
                    "defaultValue": false,
                    "allowNull": false
                },
                "hongExcluded": {
                    "type": Sequelize.BOOLEAN,
                    "field": "hong_excluded",
                    "defaultValue": false,
                    "allowNull": false
                },
                "chungExcluded": {
                    "type": Sequelize.BOOLEAN,
                    "field": "chung_excluded",
                    "defaultValue": false,
                    "allowNull": false
                },
                "timerStartTime": {
                    "type": Sequelize.BIGINT,
                    "field": "timer_start_time",
                    "allowNull": true
                },
                "accumulatedPausedTime": {
                    "type": Sequelize.BIGINT,
                    "field": "accumulated_paused_time",
                    "defaultValue": 0,
                    "allowNull": false
                },
                "roundDurationSeconds": {
                    "type": Sequelize.INTEGER,
                    "field": "round_duration_seconds",
                    "defaultValue": 120,
                    "allowNull": false
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "updatedAt": {
                    "type": Sequelize.DATE,
                    "field": "updatedat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "updatedat": {
                    "type": Sequelize.DATE,
                    "field": "updatedat",
                    "allowNull": false
                },
                "tournament_id": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "tournaments",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "category_id": {
                    "type": Sequelize.INTEGER,
                    "field": "category_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "categories",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "player1_id": {
                    "type": Sequelize.INTEGER,
                    "field": "player1_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "players",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "player2_id": {
                    "type": Sequelize.INTEGER,
                    "field": "player2_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "players",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "winner_id": {
                    "type": Sequelize.INTEGER,
                    "field": "winner_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "players",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "next_match_id": {
                    "type": Sequelize.INTEGER,
                    "field": "next_match_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "matches",
                        "key": "id"
                    },
                    "allowNull": true
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "audit_logs",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "actorId": {
                    "type": Sequelize.INTEGER,
                    "field": "actor_id",
                    "allowNull": false
                },
                "action": {
                    "type": Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'ASSIGN_ROLE', 'REVOKE_ROLE', 'DEACTIVATE', 'REACTIVATE', 'MARK_COMPLETE', 'SCHEDULE_MATCH', 'RESCHEDULE_MATCH', 'CANCEL_MATCH', 'WALKOVER'),
                    "field": "action",
                    "allowNull": false
                },
                "entityType": {
                    "type": Sequelize.STRING,
                    "field": "entity_type",
                    "allowNull": false
                },
                "entityId": {
                    "type": Sequelize.INTEGER,
                    "field": "entity_id",
                    "allowNull": false
                },
                "metadata": {
                    "type": Sequelize.JSONB,
                    "field": "metadata",
                    "allowNull": true
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "defaultValue": Sequelize.NOW,
                    "allowNull": false
                },
                "actor_id": {
                    "type": Sequelize.INTEGER,
                    "field": "actor_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "users",
                        "key": "id"
                    },
                    "allowNull": true
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "tournament_clubs",
            {
                "tournamentId": {
                    "type": Sequelize.INTEGER,
                    "primaryKey": true,
                    "field": "tournament_id",
                    "allowNull": false
                },
                "clubId": {
                    "type": Sequelize.INTEGER,
                    "primaryKey": true,
                    "field": "club_id",
                    "allowNull": false
                },
                "tournament_id": {
                    "type": Sequelize.INTEGER,
                    "field": "tournament_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "CASCADE",
                    "references": {
                        "model": "tournaments",
                        "key": "id"
                    },
                    "unique": "tournament_clubs_club_id_tournament_id_unique"
                },
                "club_id": {
                    "type": Sequelize.INTEGER,
                    "field": "club_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "CASCADE",
                    "references": {
                        "model": "clubs",
                        "key": "id"
                    },
                    "unique": "tournament_clubs_club_id_tournament_id_unique"
                }
            },
            {}
        ]
    },
    {
        fn: "createTable",
        params: [
            "match_events",
            {
                "id": {
                    "type": Sequelize.INTEGER,
                    "field": "id",
                    "primaryKey": true,
                    "autoIncrement": true
                },
                "matchId": {
                    "type": Sequelize.INTEGER,
                    "field": "match_id",
                    "allowNull": false
                },
                "type": {
                    "type": Sequelize.ENUM('START', 'PAUSE', 'RESUME', 'END_ROUND', 'ADD_POINT', 'REMOVE_POINT', 'AUTO_END_BY_GAP', 'CANCEL', 'FINISHED'),
                    "field": "type",
                    "allowNull": false
                },
                "playerId": {
                    "type": Sequelize.INTEGER,
                    "field": "player_id",
                    "allowNull": true
                },
                "points": {
                    "type": Sequelize.INTEGER,
                    "field": "points",
                    "allowNull": true
                },
                "roundNumber": {
                    "type": Sequelize.INTEGER,
                    "field": "round_number",
                    "allowNull": false
                },
                "metadata": {
                    "type": Sequelize.JSONB,
                    "field": "metadata",
                    "allowNull": true
                },
                "createdAt": {
                    "type": Sequelize.DATE,
                    "field": "createdat"
                },
                "createdat": {
                    "type": Sequelize.DATE,
                    "field": "createdat",
                    "allowNull": false
                },
                "match_id": {
                    "type": Sequelize.INTEGER,
                    "field": "match_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "matches",
                        "key": "id"
                    },
                    "allowNull": true
                },
                "player_id": {
                    "type": Sequelize.INTEGER,
                    "field": "player_id",
                    "onUpdate": "CASCADE",
                    "onDelete": "SET NULL",
                    "references": {
                        "model": "players",
                        "key": "id"
                    },
                    "allowNull": true
                }
            },
            {}
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
