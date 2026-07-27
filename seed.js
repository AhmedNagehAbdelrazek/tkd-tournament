require('dotenv').config();
const bcrypt = require('bcrypt');
const sequelize = require('./config/database');
const { User, Club, Tournament, Player, Match, TournamentClub, Category } = require('./Models');

const HASH = bcrypt.hashSync('password123', 10);

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
    isCompleted: false,
    settings: {
      bracketDepth: 4,
      categories: [
        { gender: 'MALE', bracketDepth: 4, weights: [{ name: 'Male -58kg', min: 0, max: 58 }, { name: 'Male -68kg', min: 58.01, max: 68 }, { name: 'Male -80kg', min: 68.01, max: 80 }] },
        { gender: 'FEMALE', bracketDepth: 4, weights: [{ name: 'Female -49kg', min: 0, max: 49 }, { name: 'Female -57kg', min: 49.01, max: 57 }] },
      ],
    },
  },
  {
    name: 'Summer Championship 2026',
    startDate: '2026-07-15',
    endDate: '2026-07-17',
    isCompleted: false,
    settings: {
      bracketDepth: 4,
      categories: [
        { gender: 'MALE', bracketDepth: 4, weights: [{ name: 'Male -63kg', min: 0, max: 63 }, { name: 'Male -74kg', min: 63.01, max: 74 }] },
        { gender: 'FEMALE', bracketDepth: 4, weights: [{ name: 'Female -53kg', min: 0, max: 53 }, { name: 'Female -67kg', min: 53.01, max: 67 }] },
      ],
    },
  },
  {
    name: 'Fall Grand Prix 2026',
    startDate: '2026-10-10',
    endDate: '2026-10-12',
    isCompleted: true,
    settings: {
      bracketDepth: 3,
      categories: [
        { gender: 'MALE', bracketDepth: 3, weights: [{ name: 'Male -58kg', min: 0, max: 58 }] },
      ],
    },
  },
];

async function seed() {
  console.log('Seeding...');
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
  console.log('Tables recreated.');

  const createdUsers = await User.bulkCreate(users);
  console.log(`  ${createdUsers.length} users`);

  const createdClubs = await Club.bulkCreate(clubs);
  console.log(`  ${createdClubs.length} clubs`);

  const createdTournaments = await Tournament.bulkCreate(tournaments);
  console.log(`  ${createdTournaments.length} tournaments`);

  // Register clubs for all tournaments
  const tcData = [];
  for (const t of createdTournaments) {
    for (const club of createdClubs) {
      tcData.push({ tournamentId: t.id, clubId: club.id });
    }
  }
  await TournamentClub.bulkCreate(tcData);
  console.log(`  ${tcData.length} tournament-club registrations`);

  // Create categories from tournament settings
  const allCategories = [];
  for (const t of createdTournaments) {
    const cats = t.settings.categories || [];
    for (const catDef of cats) {
      for (const w of catDef.weights) {
        allCategories.push({
          name: w.name,
          tournamentId: t.id,
          bracketDepth: catDef.bracketDepth,
          gender: catDef.gender,
          minWeight: w.min,
          maxWeight: w.max,
        });
      }
    }
  }
  const createdCategories = await Category.bulkCreate(allCategories);
  console.log(`  ${createdCategories.length} categories`);

  // Players — use model field names (name, dob, weight, gender, clubId, nationalId)
  const playerData = [
    { name: 'Kim Minjun', dob: '2010-01-15', weight: 55.00, gender: 'MALE', clubId: createdClubs[0].id, nationalId: '10010010010001' },
    { name: 'Park Jihye', dob: '2011-03-22', weight: 48.00, gender: 'FEMALE', clubId: createdClubs[1].id, nationalId: '10010010010002' },
    { name: 'Lee Donghyuk', dob: '2009-06-10', weight: 62.00, gender: 'MALE', clubId: createdClubs[2].id, nationalId: '10010010010003' },
    { name: 'Choi Sooyeon', dob: '2012-09-05', weight: 52.00, gender: 'FEMALE', clubId: createdClubs[3].id, nationalId: '10010010010004' },
    { name: 'Jung Wooyeol', dob: '2010-12-18', weight: 70.00, gender: 'MALE', clubId: createdClubs[4].id, nationalId: '10010010010005' },
    { name: 'Kang Seunghee', dob: '2011-04-30', weight: 54.00, gender: 'FEMALE', clubId: createdClubs[0].id, nationalId: '10010010010006' },
    { name: 'Cho Hyunwoo', dob: '2009-08-12', weight: 75.00, gender: 'MALE', clubId: createdClubs[1].id, nationalId: '10010010010007' },
    { name: 'Yoon Seoyeon', dob: '2012-02-25', weight: 46.00, gender: 'FEMALE', clubId: createdClubs[2].id, nationalId: '10010010010008' },
    { name: 'Han Jintaek', dob: '2010-07-08', weight: 60.00, gender: 'MALE', clubId: createdClubs[3].id, nationalId: '10010010010009' },
    { name: 'Shin Eunbi', dob: '2011-11-20', weight: 50.00, gender: 'FEMALE', clubId: createdClubs[4].id, nationalId: '10010010010010' },
    { name: 'Oh Seungwoo', dob: '2009-05-03', weight: 65.00, gender: 'MALE', clubId: createdClubs[0].id, nationalId: '10010010010011' },
    { name: 'Lim Dohyun', dob: '2010-10-14', weight: 72.00, gender: 'MALE', clubId: createdClubs[1].id, nationalId: '10010010010012' },
  ];
  const createdPlayers = await Player.bulkCreate(playerData);
  console.log(`  ${createdPlayers.length} players`);

  // Matches in first tournament — use correct status enum values
  const t = createdTournaments[0];
  const maleCats = createdCategories.filter((c) => c.tournamentId === t.id && c.gender === 'MALE');
  const matchData = [];
  for (let i = 0; i < createdPlayers.length - 1; i += 2) {
    const p1 = createdPlayers[i];
    const p2 = createdPlayers[i + 1];
    // Assign category based on player weight
    const cat = maleCats.find((c) => p1.weight >= c.minWeight && p1.weight <= c.maxWeight) || maleCats[0];
    const isFinished = i < 4;
    matchData.push({
      tournamentId: t.id,
      categoryId: cat ? cat.id : null,
      player1Id: p1.id,
      player2Id: p2.id,
      scheduledTime: new Date(Date.now() + (i / 2) * 3600000),
      type: 'SINGLE_ELIMINATION',
      weightClass: cat ? cat.name : 'Open',
      status: isFinished ? 'FINISHED' : 'SCHEDULED',
      winnerId: isFinished ? p1.id : null,
      bracketRound: 3,
      bracketPosition: i / 2,
      stageName: 'Round 1',
      currentRound: 1,
      totalRounds: 3,
      roundDurationSeconds: 120,
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
