'use strict';

var info = {
    "revision": 3,
    "name": "add_coach_to_role_enum",
    "created": "2026-08-02T12:50:00.000Z",
    "comment": "Add coach value to users role and tkd_role enums using ALTER TYPE"
};

var migrationCommands = [{
    fn: "sequelize",
    params: [
        `DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'coach'
            ) THEN
                ALTER TYPE "enum_users_role" ADD VALUE 'coach';
            END IF;
        END$$;`,
        null
    ]
}];

module.exports = {
    pos: 0,
    up: async function(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(
            `DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum e
                    JOIN pg_type t ON e.enumtypid = t.oid
                    WHERE t.typname = 'enum_users_role' AND e.enumlabel = 'coach'
                ) THEN
                    ALTER TYPE "enum_users_role" ADD VALUE 'coach';
                END IF;
            END$$;`
        );

        const [tkdResult] = await queryInterface.sequelize.query(
            `SELECT 1 FROM pg_type WHERE typname = 'enum_users_tkd_role'`
        );

        if (tkdResult.length > 0) {
            await queryInterface.sequelize.query(
                `DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'enum_users_tkd_role' AND e.enumlabel = 'coach'
                    ) THEN
                        ALTER TYPE "enum_users_tkd_role" ADD VALUE 'coach';
                    END IF;
                END$$;`
            );
        }
    },
    info: info
};
