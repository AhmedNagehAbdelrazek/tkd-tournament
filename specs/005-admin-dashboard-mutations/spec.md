# Specification: Admin Dashboard Mutations

## Overview

The TKD tournament management system currently provides read endpoints and limited create-only operations for its core entities. This feature adds comprehensive admin endpoints that cover every data mutation needed by a tournament dashboard: full CRUD for Players, Clubs, and Tournaments; match scheduling and rescheduling; tournament lifecycle management; and administrative user management. These endpoints allow dashboard administrators to create, read, update, and delete all domain entities, manage tournament state transitions, and administer user roles and permissions.

## Clarifications

### Session 2026-07-15

- Q: Which authorization layer controls Player, Club, and Tournament entity CRUD? → A: Global admin role (via adminGuard). TKD roles remain reserved for match operations only.
- Q: Should the spec include explicit bulk create functional requirements, and for which entities? → A: Players only. Formalize existing bulk player creation endpoint; clubs and matches do not need bulk operations.
- Q: How should match time conflicts be determined when scheduling/rescheduling? → A: Use the tournament's roundDurationSec × maxRounds as the estimated match window for conflict checks. No new fields needed.
- Q: How should non-match entity mutations (player, club, tournament CRUD) be audited? → A: Add a new audit_log table (id, actorId, action, entityType, entityId, metadata, timestamp) for all non-match state-changing operations.
- Q: What should the default and maximum page sizes be for paginated list endpoints? → A: Default 20 per page, maximum 100. Standard REST API convention.

## User Scenarios & Testing

### Primary User Scenarios

**S1 — Player Management**
A tournament administrator navigates to the Players section of the dashboard. They can view a list of all players filtered by tournament, club, or gender. They create a new player by entering name, date of birth, weight, gender, and club assignment. They edit an existing player to correct weight or reassign clubs. They delete a player who has been deregistered. They upload or change a player's profile photo.

**S2 — Club Management**
An administrator views the Clubs list. They create a new club with a unique name. They edit a club name after a typo. They delete a club that has no registered players. They view individual club details including the list of players assigned to it.

**S3 — Tournament Lifecycle Management**
An administrator creates a new tournament with a name, date range, and initial settings (weight classes, round duration, rest periods). They update tournament settings before the tournament begins. They mark a tournament as completed once it has finished. They delete a tournament that was created in error and has no associated players or matches.

**S4 — Match Scheduling and Overrides**
An administrator or head judge views the match list for a tournament. They manually schedule a friendly or exhibition match by selecting two players and a time. They reschedule an existing match to a different time. They cancel a scheduled match. They assign a walkover result to a match when a player fails to appear.

**S5 — User and Role Administration**
A super administrator views all registered users. They assign a TKD role (ADMIN, HEAD_JUDGE, MAT_JUDGE, SCOREKEEPER) to a user. They revoke a TKD role from a user. They deactivate a user account. They view user activity and last login information.

**S6 — Dashboard Overview**
An administrator opens the dashboard and sees an overview of the current tournament: total players, total matches, matches in progress, upcoming matches, and completed matches. They see a list of all tournaments with quick status indicators.

### Acceptance Scenarios

**AC1 — Player CRUD**
- GIVEN an authenticated admin
- WHEN they submit a valid player creation request
- THEN a new player record is created and returned with all fields
- WHEN they submit an update to an existing player
- THEN the player record is updated and returned with the new values
- WHEN they request deletion of a player
- THEN the player record is removed and a success confirmation is returned
- WHEN they request a single player by ID
- THEN the full player record is returned including computed age

**AC2 — Club CRUD**
- GIVEN an authenticated admin
- WHEN they create a club with a unique name
- THEN the club is created and returned
- WHEN they create a club with a duplicate name
- THEN an error is returned indicating the name is already taken
- WHEN they update a club name
- THEN the club is updated and returned
- WHEN they delete a club with no players
- THEN the club is removed
- WHEN they attempt to delete a club that still has players
- THEN an error is returned indicating players are still assigned

**AC3 — Tournament Full Lifecycle**
- GIVEN an authenticated admin
- WHEN they create a tournament with name, dates, and settings
- THEN the tournament is created with status pending
- WHEN they update settings on a non-completed tournament
- THEN the settings are updated
- WHEN they mark a tournament as completed
- THEN its isCompleted flag is set to true
- WHEN they attempt to delete a tournament with associated players or matches
- THEN an error is returned

**AC4 — Match Scheduling**
- GIVEN an authenticated admin or head judge
- WHEN they schedule a match with two valid players and a future time
- THEN the match is created with status SCHEDULED
- WHEN they reschedule a SCHEDULED match to a new time
- THEN the match time is updated
- WHEN they cancel a SCHEDULED match
- THEN the match status changes to CANCELLED
- WHEN they assign a walkover to a match
- THEN the match is ended with the appropriate winner and endReason

**AC5 — User Role Management**
- GIVEN an authenticated super administrator
- WHEN they assign a TKD role to a user
- THEN the user's tkdRole field is updated
- WHEN they revoke a TKD role
- THEN the user's tkdRole is set to null
- WHEN they deactivate a user
- THEN the user's isActive flag is set to false and they can no longer authenticate
- WHEN a non-super-admin attempts these operations
- THEN an authorization error is returned

**AC6 — Dashboard Statistics**
- GIVEN an authenticated admin
- WHEN they request dashboard overview for a tournament
- THEN they receive counts of players, matches by status, and upcoming match schedule

### Edge Cases

- **EC1**: Attempting to delete a player who is assigned as a participant in an in-progress or scheduled match should be rejected with a clear error message indicating the active match dependency.
- **EC2**: Updating a tournament's weight classes after matches have been generated should warn that existing matches may need to be regenerated.
- **EC3**: Creating a match between two players from the same club when intra-club warnings are enabled should flag the match accordingly.
- **EC4**: Scheduling or rescheduling a match where either player already has a match within the conflict window (roundDurationSec × maxRounds from the proposed start time) should be rejected.
- **EC5**: Bulk player creation (FR-PM-05) where some entries have duplicate names within the same tournament should reject the entire batch and report which entries failed.
- **EC6**: Deactivating a user who is currently assigned as a judge on an in-progress match should require reassignment of that match first.
- **EC7**: Marking a tournament as completed when there are still IN_PROGRESS matches should be rejected.

## Requirements

### Functional Requirements

**Player Management**

- FR-PM-01: The system SHALL provide an endpoint to retrieve a single player by ID, including computed age and club name.
- FR-PM-02: The system SHALL provide an endpoint to update player attributes: name, date of birth, weight, gender, club assignment, seed, and photo.
- FR-PM-03: The system SHALL provide an endpoint to delete a player, rejecting the operation if the player has active (SCHEDULED or IN_PROGRESS) matches.
- FR-PM-04: The system SHALL provide an endpoint to list all players with filtering by tournament, club, gender, and weight class, with pagination (default 20 per page, max 100).
- FR-PM-05: The system SHALL provide an endpoint to bulk-create players in a single request (up to 500 records), rejecting the entire batch if any entry has a duplicate name within the same tournament and reporting which entries failed.

**Club Management**

- FR-CM-01: The system SHALL provide an endpoint to retrieve a single club by ID, including its assigned player count.
- FR-CM-02: The system SHALL provide an endpoint to update a club's name, enforcing uniqueness.
- FR-CM-03: The system SHALL provide an endpoint to delete a club, rejecting the operation if any players are still assigned to it.
- FR-CM-04: The system SHALL provide an endpoint to list all clubs with optional search by name and player count, with pagination (default 20 per page, max 100).

**Tournament Management**

- FR-TM-01: The system SHALL provide an endpoint to update a tournament's name and date range.
- FR-TM-02: The system SHALL provide an endpoint to mark a tournament as completed, rejecting the operation if any matches are still IN_PROGRESS.
- FR-TM-03: The system SHALL provide an endpoint to delete a tournament, rejecting the operation if players or matches are associated with it.
- FR-TM-04: The system SHALL provide an endpoint to retrieve a single tournament by ID with summary statistics (player count, match count, matches by status).
- FR-TM-05: The system SHALL provide an endpoint to list all tournaments with optional filtering by completion status and date range, with pagination (default 20 per page, max 100).

**Match Management**

- FR-MM-01: The system SHALL provide an endpoint to list all matches for a tournament, filterable by status, weight class, and bracket round, with pagination (default 20 per page, max 100).
- FR-MM-02: The system SHALL provide an endpoint to manually schedule a match by specifying two players, a scheduled time, and optional match type.
- FR-MM-03: The system SHALL provide an endpoint to reschedule an existing SCHEDULED match to a new time, rejecting the operation if either player has another match within the conflict window (tournament's roundDurationSec × maxRounds from the proposed start time).
- FR-MM-04: The system SHALL provide an endpoint to cancel a SCHEDULED match.
- FR-MM-05: The system SHALL provide an endpoint to assign a walkover result to a match, ending it with the non-walking-over player as winner.
- FR-MM-06: The system SHALL provide an endpoint to retrieve match details including full event history.

**User Administration**

- FR-UA-01: The system SHALL provide an endpoint to list all registered users with their roles and active status.
- FR-UA-02: The system SHALL provide an endpoint to assign or update a TKD role for a user, restricted to super administrators.
- FR-UA-03: The system SHALL provide an endpoint to deactivate a user account, restricted to super administrators.
- FR-UA-04: The system SHALL provide an endpoint to reactivate a deactivated user account, restricted to super administrators.

**Dashboard Overview**

- FR-DO-01: The system SHALL provide an endpoint that returns an aggregate overview for a tournament: total players, total matches, matches grouped by status, and upcoming matches within the next hour.
- FR-DO-02: The system SHALL provide an endpoint that returns a list of all tournaments with quick-glance status (name, dates, isCompleted, player count, match count).

### Non-functional Requirements

- NFR-01: All mutation endpoints SHALL require authentication via JWT.
- NFR-02: All admin-only operations SHALL enforce role-based authorization (global admin role for Player, Club, and Tournament entity CRUD; super_admin global role for user administration; TKD roles for match operations and bracket overrides).
- NFR-03: All mutation endpoints SHALL validate input and return structured error responses with descriptive messages.
- NFR-04: All mutation endpoints SHALL respond within 2 seconds under normal load (up to 100 concurrent admin users).
- NFR-05: All mutations SHALL be auditable — each state-changing operation SHALL create an AuditLog record (actor, action, entityType, entityId, metadata, timestamp). Match-specific events continue using the existing MatchEvent model.
- NFR-06: Bulk operations SHALL process up to 500 records in a single request without timing out.

## Success Criteria

- SC-01: Administrators can perform full CRUD operations on Players, Clubs, and Tournaments through API endpoints without requiring direct database access.
- SC-02: Tournament lifecycle can be managed end-to-end: create, configure, generate brackets, manage matches, and mark complete — all through API endpoints.
- SC-03: All entity mutations enforce appropriate authorization, ensuring only users with the correct role can perform restricted operations.
- SC-04: Input validation prevents creation of invalid data (missing required fields, invalid enums, duplicate unique constraints) and returns clear error messages.
- SC-05: Dashboard overview endpoints provide real-time tournament statistics that update immediately after any mutation.
- SC-06: Delete operations safely cascade, preventing orphaned records and rejecting deletions that would violate referential integrity.
- SC-07: Match scheduling operations prevent double-booking players and validate temporal constraints.

## Key Entities

| Entity     | Description                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| Player     | A competitor registered in a tournament, with name, DOB, weight, gender, club, seed, and optional photo. |
| Club       | An organization that players belong to, identified by a unique name.         |
| Tournament | A competition event with a name, date range, configurable settings (weight classes, round timing), and completion status. |
| Match      | A scheduled or completed contest between two players within a tournament, with status, scores, bracket position, and event history. |
| MatchEvent | An immutable log entry recording a scoring action, round transition, or match state change. |
| User       | A registered account with global role (super_admin, admin, customer) and optional TKD role for tournament-specific duties. |
| AuditLog   | An immutable record of a state-changing operation, capturing the actor, action type, entity affected, and timestamp. |

## Assumptions

- The existing data model and entity relationships remain largely unchanged; this feature adds endpoints and one new entity (AuditLog for non-match mutations).
- Authorization follows the existing two-tier role system: global roles (super_admin, admin, customer) for entity CRUD and user management; TKD roles (ADMIN, HEAD_JUDGE, MAT_JUDGE, SCOREKEEPER) for match operations and bracket controls.
- The existing `adminGuard` middleware protects tournament and entity mutation endpoints; the `tkdRoleGuard` middleware protects operational endpoints (bracket generation, match control).
- Input validation follows the existing `express-validator` patterns already established in the codebase.
- Error responses follow the existing `ApiError` structure with status codes and descriptive messages.
- Photo upload for players reuses the existing Cloudinary-based upload infrastructure.
- Tournament settings updates follow the existing gender-keyed weight class structure.
- "Dashboard" refers to the conceptual admin interface consuming these API endpoints; no frontend implementation is included in this feature.

## Dependencies

- Existing authentication and authorization middleware (protect, roleGuard, tkdRoleGuard, adminGuard).
- Existing database models and Sequelize ORM configuration.
- Existing Cloudinary integration for photo uploads.
- Existing utility functions for response formatting (successResponse, ApiError).
- Existing rate limiting infrastructure for sensitive endpoints.
