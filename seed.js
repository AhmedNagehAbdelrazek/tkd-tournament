require('dotenv').config();
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
const { User, Club, Tournament, Player, Match } = require('./Models');

const HASH = bcrypt.hashSync('password123', 10);

// ponytail: flat arrays, no factories, no abstractions
const users = [
  { email: 'superadmin@tkd.test', password: HASH, role: 'super_admin', name: 'Super Admin', tkdRole: 'ADMIN' },
  { email: 'admin@tkd.test', password: HASH, role: 'admin', name: 'Tournament Admin', tkdRole: 'ADMIN' },
  { email: 'headjudge@tkd.test', password: HASH, role: 'admin', name: 'Head Judge Lee', tkdRole: 'HEAD_JUDGE' },
  { email: 'judge1@tkd.test', password: HASH, role: 'admin', name: 'Judge Kim', tkdRole: 'MAT_JUDGE' },
  { email: 'judge2@tkd.test', password: HASH, role: 'admin', name: 'Judge Park', tkdRole: 'MAT_JUDGE' },
  { email: 'scorekeeper@tkd.test', password: HASH, role: 'admin', name: 'Scorekeeper Choi', tkdRole: 'SCOREKEEPER' },
  { email: 'coach1@tkd.test', password: HASH, role: 'customer', name: 'Coach Wang' },
  { email: 'coach2@tkd.test', password: HASH, role: 'customer', name: 'Coach Jung' },
];

const clubs = [
  { name: 'Seoul Taekwondo Academy' },
  { name: 'Busan Fighters Club' },
  { name: 'Incheon Martial Arts' },
  { name: 'Daegu Tiger Dojang' },
  { name: 'Gwangju Phoenix TKD' },
];

const tournaments = [
  {
    name: 'Spring Open 2026',
    startDate: '2026-04-01',
    endDate: '2026-04-03',
    settings: {
      roundDurationSec: 120, restBetweenRoundsSec: 60, restBetweenMatchesMin: 15, pointGapAutoEnd: 20,
      weightClasses: {
        MALE: [{ name: 'Male -58kg', min: 0, max: 58 }, { name: 'Male -68kg', min: 58.01, max: 68 }, { name: 'Male -80kg', min: 68.01, max: 80 }],
        FEMALE: [{ name: 'Female -49kg', min: 0, max: 49 }, { name: 'Female -57kg', min: 49.01, max: 57 }],
      },
    },
  },
  {
    name: 'Summer Championship 2026',
    startDate: '2026-07-15',
    endDate: '2026-07-17',
    settings: {
      roundDurationSec: 180, restBetweenRoundsSec: 60, restBetweenMatchesMin: 20, pointGapAutoEnd: 15,
      weightClasses: {
        MALE: [{ name: 'Male -63kg', min: 0, max: 63 }, { name: 'Male -74kg', min: 63.01, max: 74 }],
        FEMALE: [{ name: 'Female -53kg', min: 0, max: 53 }, { name: 'Female -67kg', min: 53.01, max: 67 }],
      },
    },
  },
  {
    name: 'Fall Grand Prix 2026',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    isCompleted: true,
    settings: {
      roundDurationSec: 120, restBetweenRoundsSec: 60, restBetweenMatchesMin: 15, pointGapAutoEnd: 20,
      weightClasses: {
        MALE: [{ name: 'Male -58kg', min: 0, max: 58 }],
        FEMALE: [],
      },
    },
  },
];

async function seed() {
  console.log('Seeding...');
  await sequelize.authenticate();
  await sequelize.sync({ force: true }); // ponytail: force drop + recreate
  console.log('Tables recreated.');

  const createdUsers = await User.bulkCreate(users);
  console.log(`  ${createdUsers.length} users`);

  const createdClubs = await Club.bulkCreate(clubs);
  console.log(`  ${createdClubs.length} clubs`);

  const createdTournaments = await Tournament.bulkCreate(tournaments);
  console.log(`  ${createdTournaments.length} tournaments`);

  // ponytail: spread players across clubs and tournaments
  const names = [
    'Kim Minjun', 'Park Jihye', 'Lee Donghyuk', 'Choi Sooyeon', 'Jung Wooyeol',
    'Kang Seunghee', 'Cho Hyunwoo', 'Yoon Seoyeon', 'Han Jintaek', 'Shin Eunbi',
    'Oh Seungwoo', 'Lim Dohyun',
  ];
  const genders = ['MALE', 'MALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'FEMALE', 'MALE', 'MALE'];
  const weights = [55, 48, 62, 52, 70, 54, 75, 46, 60, 50, 65, 72];
  const t = createdTournaments[0]; // all players in first tournament

  const players = names.map((name, i) => ({
    name, dob: `200${10 - (i % 5)}-0${(i % 9) + 1}-15`,
    weight: weights[i], gender: genders[i],
    clubId: createdClubs[i % createdClubs.length].id,
    tournamentId: t.id,
  }));
  const createdPlayers = await Player.bulkCreate(players);
  console.log(`  ${createdPlayers.length} players`);

  // ponytail: a few matches in first tournament
  const matchData = [];
  for (let i = 0; i < createdPlayers.length - 1; i += 2) {
    matchData.push({
      tournamentId: t.id,
      player1Id: createdPlayers[i].id,
      player2Id: createdPlayers[i + 1].id,
      scheduledTime: new Date(Date.now() + (i / 2) * 3600000),
      type: 'SINGLE_ELIMINATION',
      weightClass: t.settings.weightClasses.MALE[0]?.name || 'Open',
      status: i < 4 ? 'FINISHED' : 'SCHEDULED',
      winnerId: i < 4 ? createdPlayers[i].id : null,
      bracketRound: 1,
      bracketPosition: i / 2,
    });
  }
  const createdMatches = await Match.bulkCreate(matchData);
  console.log(`  ${createdMatches.length} matches`);

  await sequelize.close();
  console.log('Done. Passwords: password123');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
