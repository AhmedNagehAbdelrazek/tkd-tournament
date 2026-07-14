# Specification: Gender-Specific Weight Classes

## Overview

Tournament settings currently define a single flat list of weight classes that apply to all players regardless of gender. This feature updates the tournament settings structure so that male and female participants each have their own independent set of weight classes with no cross-gender mixing. Players whose weight does not fall within any weight class configured for their gender are automatically identified as excluded ("out") and surfaced both during tournament setup and via a dedicated endpoint.

## Clarifications

### Session 2026-07-14

- Q: Should weight classes only be configurable before the tournament starts, or can they also be changed mid-tournament? → A: Before tournament starts only. Weight classes can only be set or changed while the tournament has no matches in IN_PROGRESS status.
- Q: What level of detail should the excluded player information contain in the tournament creation/update response? → A: Full player details (id, name, gender, weight, club, reason) returned directly in the response.
- Q: Is it valid to configure an empty weight class list for a gender? → A: Yes. An empty array for a gender is allowed and means no players of that gender can register. This supports single-gender tournaments without placeholder weight classes.
- User: Excluded players response must include the reason why they are excluded → A: Reason field added to all excluded player response descriptions (FR-03, FR-04, scenarios, success criteria).

## User Scenarios & Testing

### Primary User Scenarios

1. **Tournament administrator configures gender-specific weight classes**: An admin creates or updates a tournament and provides separate weight class lists for male and female divisions. Each list contains named ranges (e.g., "Male -58kg", "Female -49kg"). The system stores these independently and enforces that male players are only matched against male weight classes and female players against female weight classes. Weight classes can only be configured while the tournament has no matches in progress; once matches begin, settings are locked.

2. **System identifies excluded players after weight class configuration**: Once weight classes are set (or updated), the system evaluates all registered players in the tournament. Any player whose weight does not fall within any configured weight class for their gender is flagged as excluded. The tournament creation/update response includes the full details of each excluded player (id, name, gender, weight, club, reason) so the admin is immediately aware why each player was excluded.

3. **Admin retrieves the full list of excluded players**: An admin calls a dedicated endpoint to get all players in a specific tournament who do not fit into any gender-matched weight class. The response includes each excluded player's name, gender, weight, and the reason they were excluded (no matching weight class for their gender).

4. **Player registration respects gender-specific weight classes**: When a new player is registered for a tournament, the system validates their weight against the weight classes configured for their specific gender. Registration is rejected if no weight class matches. If a gender has an empty weight class list, no players of that gender can register.

### Acceptance Scenarios

1. Given a tournament with weight classes configured for both MALE and FEMALE, when a male player registers with a weight that falls within a male weight class, then the player is accepted.
2. Given a tournament with weight classes configured for both MALE and FEMALE, when a female player registers with a weight that falls within a female weight class, then the player is accepted.
3. Given a tournament with weight classes configured for both MALE and FEMALE, when a male player registers with a weight that does not fall within any male weight class, then the registration is rejected with a clear error message.
4. Given a tournament where weight classes are updated after players are already registered, when the update completes, then the response includes the full details and exclusion reason of each player who no longer matches any weight class for their gender.
5. Given a tournament with registered players, when an admin calls the excluded players endpoint, then the response lists all players whose weight does not match any weight class for their gender, including their name, gender, weight, club, and reason for exclusion.
6. Given a tournament with weight classes configured only for MALE (no FEMALE weight classes), when a female player attempts to register, then the registration is rejected because no female weight classes exist.
7. Given a tournament with no weight classes configured for either gender, when any player attempts to register, then the registration is rejected.
8. Given a tournament that already has matches in IN_PROGRESS status, when an admin attempts to update weight classes, then the update is rejected with an error indicating settings are locked while matches are in progress.
9. Given a tournament with MALE weight classes configured as an empty array, when a male player attempts to register, then the registration is rejected because no male weight classes are configured.

### Edge Cases

- A tournament has weight classes for only one gender (e.g., MALE only). All players of the other gender (FEMALE) are excluded and cannot register.
- A tournament has weight classes with overlapping ranges for the same gender. The system matches the first qualifying range (by order in the list).
- Weight classes are updated (added, removed, or ranges changed) after players are already registered but before any matches start. Players who no longer match are flagged as excluded in the update response and via the excluded players endpoint.
- A player's weight falls exactly on a weight class boundary (e.g., weight = 58kg and a class is 53-58kg). Boundary values are inclusive on both min and max.
- The tournament has zero registered players. The excluded players endpoint returns an empty list.
- Bulk player registration where some players match and others do not. The response reports created players and per-player errors for those who did not match.
- An admin attempts to update weight classes while matches are in progress. The system rejects the update and returns an error indicating the tournament is locked.
- A gender has an empty weight class array. No players of that gender can register; any existing players of that gender are marked as excluded.

## Requirements

### Functional Requirements

**FR-01: Gender-keyed weight class storage**
The tournament settings must store weight classes organized by gender. Each gender (MALE, FEMALE) has its own independent array of weight classes. Each weight class contains a name, minimum weight, and maximum weight. An empty array is valid and means no players of that gender can register.

**FR-02: Gender-specific weight validation on player registration**
When a player is registered for a tournament, the system must validate the player's weight against only the weight classes configured for that player's gender. If the gender's weight class list is empty or no weight class matches, registration must be rejected with a descriptive error.

**FR-03: Excluded player identification on tournament settings change**
When tournament weight class settings are created or updated, the system must evaluate all existing players in the tournament and identify those whose weight does not fall within any configured weight class for their gender. The tournament creation/update response must include the full details (id, name, gender, weight, club, reason) of each excluded player, where reason explains why the player does not match any weight class. Weight class changes are only permitted while the tournament has no matches in IN_PROGRESS status; attempts to update while matches are in progress must be rejected.

**FR-04: Excluded players endpoint**
The system must provide an endpoint to retrieve all excluded players for a given tournament. The response must include each excluded player's identifier, name, gender, weight, club name, and the reason for exclusion.

**FR-05: Backward-compatible settings structure**
The tournament settings field must support the new gender-keyed weight class structure. Existing flat weight class configurations must be handled gracefully (either migrated or rejected with a clear message requiring reconfiguration).

### Non-functional Requirements

**NFR-01: Weight class evaluation performance**
Evaluating excluded players for a tournament must complete within 5 seconds for tournaments with up to 500 registered players.

**NFR-02: Response clarity**
All error messages related to weight class mismatches must clearly state the player's gender and weight, and indicate that no matching weight class was found for their gender division.

## Success Criteria

- Tournament administrators can configure completely independent weight class lists for male and female divisions with no overlap or mixing between genders.
- Players are only matched against weight classes appropriate for their gender; cross-gender matching never occurs.
- When weight class settings change (before matches start), administrators immediately see the full details and exclusion reason of affected (excluded) players in the API response.
- Administrators can query a dedicated endpoint at any time to get the current list of excluded players for a tournament.
- Player registration automatically rejects players whose weight does not match any configured weight class for their gender, with a clear error message.
- The system handles boundary weights (min and max values) inclusively so that players at exact boundaries are correctly matched.
- Weight class settings are locked once any match in the tournament reaches IN_PROGRESS status, preventing mid-tournament configuration changes.

## Key Entities

**Tournament Settings (updated structure)**
- `weightClasses`: A structure organized by gender (`MALE`, `FEMALE`), where each gender maps to its own list of weight class definitions. A gender may have an empty list.
- Each weight class definition: `name` (text label), `min` (minimum weight in kg), `max` (maximum weight in kg).

**Player (existing, no schema change)**
- `gender`: MALE or FEMALE (already exists)
- `weight`: decimal value in kg (already exists)
- `tournamentId`: links player to a tournament (already exists)

**Excluded Player (read-only, computed)**
- `id`: player identifier
- `name`: player name
- `gender`: MALE or FEMALE
- `weight`: player's registered weight
- `clubName`: player's club name
- `reason`: explanation of why the player is excluded (e.g., "No weight class found for MALE division at 75kg")

## Assumptions

- The existing `MALE` and `FEMALE` gender enum values are sufficient; no additional genders are needed.
- Weight class ranges within the same gender should not overlap. If they do, the first matching range (by order in the array) is used.
- Weight class min/max boundaries are inclusive (a player at exactly 58kg matches a class of min=58, max=62).
- The tournament settings structure change is a breaking change that requires existing tournaments with flat weight class arrays to be reconfigured.
- "Excluded players" means players registered in the tournament whose weight does not fall within any weight class configured for their gender. These players cannot be matched in any bracket.
- The excluded players endpoint requires authentication (any authenticated user, consistent with existing player listing permissions).
- Weight class settings are immutable once any match in the tournament has started (IN_PROGRESS status). This prevents cascading match cancellations.

## Dependencies

- Depends on the existing Player model with `gender` and `weight` fields.
- Depends on the existing Tournament model with `settings` JSONB field.
- Impacts the player registration flow (weight validation logic).
- Impacts the tournament creation and update flows (settings structure and excluded player evaluation).
- Impacts the matchmaking/bracket generation flow (must use gender-keyed weight classes when filtering players).
