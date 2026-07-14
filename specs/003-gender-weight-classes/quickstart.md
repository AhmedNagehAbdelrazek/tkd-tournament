# Quickstart: Gender-Specific Weight Classes

## Overview

This feature updates the tournament settings to store weight classes organized by gender. Male and female participants each have their own independent weight classes with no cross-gender mixing. Players who don't match any weight class for their gender are identified as excluded.

## Key Changes

### Settings Structure

**Before** (flat array):
```json
{
  "weightClasses": [
    { "name": "10-15kg", "min": 10, "max": 15 }
  ]
}
```

**After** (gender-keyed):
```json
{
  "weightClasses": {
    "MALE": [
      { "name": "Male -58kg", "min": 0, "max": 58 }
    ],
    "FEMALE": [
      { "name": "Female -49kg", "min": 0, "max": 49 }
    ]
  }
}
```

### New Endpoint

| Method | Path | Description |
|--------|------|-------------|
| `PUT` | `/api/tournaments/:id/settings` | Update weight class settings (locked when matches in progress) |
| `GET` | `/api/tournaments/:id/excluded-players` | Get players who don't match any gender-specific weight class |

### Modified Behavior

- **Player registration**: Weight validated against gender-specific classes only
- **Bracket generation**: Uses gender-keyed weight class lookup
- **Tournament create/update response**: Includes `excludedPlayers` array with full details and reasons
- **Tournament settings lock**: Cannot update weight classes while any match is IN_PROGRESS

## Files Changed

| File | Change |
|------|--------|
| `Services/tournamentService.js` | Update `create` and `updateSettings` to compute excluded players; add `getExcludedPlayers` and `findExcludedPlayers` |
| `Services/playerService.js` | Update `validateWeight` for gender-keyed classes; update `list` weight class filter |
| `Services/matchmakingService.js` | Update `generateBracket` weight class lookup |
| `Controllers/tournamentController.js` | Add `updateSettings` and `getExcludedPlayers` handlers |
| `Routes/tournamentRoutes.js` | Add `PUT /:id/settings` and `GET /:id/excluded-players` routes |
| `utils/validators/tournamentValidator.js` | Update validation for gender-keyed `weightClasses` object |

## Testing

```bash
# Run all tests
npm test

# Run specific feature tests
npx jest tests/integration/tournament-gender-weight
npx jest tests/unit/weight-class-validation
```
