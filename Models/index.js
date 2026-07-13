const User = require('./User');
const UploadedImage = require('./UploadedImage');
const Tournament = require('./Tournament');
const Club = require('./Club');
const Player = require('./Player');
const Match = require('./Match');
const MatchEvent = require('./MatchEvent');

Club.hasMany(Player, { foreignKey: 'club_id' });
Player.belongsTo(Club, { foreignKey: 'club_id' });

Tournament.hasMany(Player, { foreignKey: 'tournament_id' });
Player.belongsTo(Tournament, { foreignKey: 'tournament_id' });

Tournament.hasMany(Match, { foreignKey: 'tournament_id' });
Match.belongsTo(Tournament, { foreignKey: 'tournament_id' });

Match.belongsTo(Player, { as: 'player1', foreignKey: 'player1_id' });
Match.belongsTo(Player, { as: 'player2', foreignKey: 'player2_id' });
Match.belongsTo(Player, { as: 'winner', foreignKey: 'winner_id' });

Match.hasMany(MatchEvent, { foreignKey: 'match_id' });
MatchEvent.belongsTo(Match, { foreignKey: 'match_id' });

MatchEvent.belongsTo(Player, { foreignKey: 'player_id' });

module.exports = {
  User,
  UploadedImage,
  Tournament,
  Club,
  Player,
  Match,
  MatchEvent,
};
