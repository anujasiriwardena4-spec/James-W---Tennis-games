/* ============================================================================
   BASELINE — data layer
   Attribute scale is 40-99. Every rated human on the tour and in the spin pool
   uses the same eight keys so ratings are directly comparable.
   ==========================================================================*/

const ATTRS = [
  { key: 'serve',    label: 'Serve',     short: 'SRV', blurb: 'First-strike power, placement and free points.' },
  { key: 'forehand', label: 'Forehand',  short: 'FH',  blurb: 'Your weapon wing — winners and rally control.' },
  { key: 'backhand', label: 'Backhand',  short: 'BH',  blurb: 'Depth, redirection and defence off the other side.' },
  { key: 'ret',      label: 'Return',    short: 'RET', blurb: 'Neutralising serves and manufacturing break points.' },
  { key: 'movement', label: 'Movement',  short: 'MOV', blurb: 'Court coverage, slides, recovery between shots.' },
  { key: 'net',      label: 'Net Play',  short: 'NET', blurb: 'Volleys, transition game, finishing short balls.' },
  { key: 'stamina',  label: 'Stamina',   short: 'STA', blurb: 'Fifth-set legs and back-to-back-week durability.' },
  { key: 'mental',   label: 'Mental',    short: 'MEN', blurb: 'Clutch on break points, tiebreaks and big stages.' }
];

const ATTR_KEYS = ATTRS.map(a => a.key);

const SURFACES = {
  hard:   { label: 'Hard',         cls: 'hard',   serve: 1.00, ret: 1.00, rally: 1.00 },
  clay:   { label: 'Clay',         cls: 'clay',   serve: 0.92, ret: 1.07, rally: 1.06 },
  grass:  { label: 'Grass',        cls: 'grass',  serve: 1.09, ret: 0.93, rally: 0.95 },
  indoor: { label: 'Indoor Hard',  cls: 'indoor', serve: 1.05, ret: 0.98, rally: 0.99 }
};

/* --- Tour roster ---------------------------------------------------------
   [name, country, hand, backhand(1/2), serve, fh, bh, ret, mov, net, sta, men]
   These are the AI rivals you fight for ranking points all season.
------------------------------------------------------------------------- */
const TOUR_RAW = [
  ['Jannik Sinner',         'ITA', 'R', 2, 88, 93, 96, 92, 90, 82, 92, 94],
  ['Carlos Alcaraz',        'ESP', 'R', 2, 87, 96, 88, 90, 96, 90, 92, 92],
  ['Novak Djokovic',        'SRB', 'R', 2, 86, 90, 97, 97, 94, 86, 93, 97],
  ['Alexander Zverev',      'GER', 'R', 1, 95, 89, 94, 91, 87, 79, 91, 81],
  ['Daniil Medvedev',       'RUS', 'R', 2, 91, 88, 93, 96, 93, 75, 96, 85],
  ['Taylor Fritz',          'USA', 'R', 2, 96, 93, 85, 83, 83, 81, 87, 83],
  ['Jack Draper',           'GBR', 'L', 2, 93, 93, 88, 87, 85, 81, 81, 85],
  ['Casper Ruud',           'NOR', 'R', 2, 85, 94, 87, 87, 89, 77, 91, 85],
  ['Holger Rune',           'DEN', 'R', 2, 89, 92, 89, 88, 90, 83, 85, 79],
  ['Alex de Minaur',        'AUS', 'R', 2, 79, 85, 88, 92, 96, 83, 95, 89],
  ['Lorenzo Musetti',       'ITA', 'R', 1, 88, 92, 96, 88, 94, 92, 84, 84],
  ['Ben Shelton',           'USA', 'L', 2, 96, 94, 84, 82, 90, 88, 88, 86],
  ['Andrey Rublev',         'RUS', 'R', 2, 93, 96, 88, 88, 86, 76, 90, 68],
  ['Stefanos Tsitsipas',    'GRE', 'R', 1, 94, 96, 84, 84, 92, 94, 92, 82],
  ['Grigor Dimitrov',       'BUL', 'R', 1, 92, 95, 94, 88, 94, 94, 86, 82],
  ['Tommy Paul',            'USA', 'R', 2, 90, 92, 90, 90, 96, 88, 92, 90],
  ['Frances Tiafoe',        'USA', 'R', 2, 92, 92, 84, 88, 96, 90, 88, 84],
  ['Hubert Hurkacz',        'POL', 'R', 2, 96, 90, 84, 80, 84, 92, 86, 82],
  ['Felix Auger-Aliassime', 'CAN', 'R', 2, 96, 94, 88, 86, 92, 90, 90, 80],
  ['Karen Khachanov',       'RUS', 'R', 2, 95, 94, 90, 88, 84, 80, 90, 84],
  ['Ugo Humbert',           'FRA', 'L', 1, 94, 92, 94, 86, 90, 88, 84, 82],
  ['Arthur Fils',           'FRA', 'R', 2, 93, 95, 88, 86, 94, 84, 88, 86],
  ['Jakub Mensik',          'CZE', 'R', 2, 96, 92, 88, 82, 86, 84, 84, 84],
  ['Joao Fonseca',          'BRA', 'R', 2, 94, 96, 90, 84, 90, 82, 84, 88],
  ['Tomas Machac',          'CZE', 'R', 2, 90, 92, 92, 90, 96, 86, 88, 84],
  ['Jiri Lehecka',          'CZE', 'R', 2, 94, 93, 89, 83, 85, 83, 85, 81],
  ['Sebastian Korda',       'USA', 'R', 2, 92, 93, 91, 85, 89, 85, 83, 77],
  ['Alexei Popyrin',        'AUS', 'R', 2, 96, 91, 83, 81, 85, 83, 83, 79],
  ['Alexander Bublik',      'KAZ', 'R', 1, 96, 89, 81, 79, 81, 91, 77, 69],
  ['Denis Shapovalov',      'CAN', 'L', 1, 95, 91, 89, 81, 89, 89, 81, 73],
  ['Matteo Berrettini',     'ITA', 'R', 2, 96, 96, 77, 79, 81, 89, 83, 83],
  ['Francisco Cerundolo',   'ARG', 'R', 2, 85, 96, 83, 85, 89, 75, 89, 79],
  ['Nicolas Jarry',         'CHI', 'R', 1, 96, 93, 81, 79, 81, 81, 85, 75],
  ['Sebastian Baez',        'ARG', 'R', 2, 77, 89, 85, 89, 95, 73, 93, 83],
  ['Tallon Griekspoor',     'NED', 'R', 2, 93, 91, 85, 81, 85, 81, 85, 77],
  ['Flavio Cobolli',        'ITA', 'R', 2, 89, 91, 89, 85, 91, 79, 87, 83],
  ['Brandon Nakashima',     'USA', 'R', 2, 89, 89, 91, 87, 91, 81, 89, 85],
  ['Jordan Thompson',       'AUS', 'R', 2, 89, 85, 87, 85, 89, 93, 89, 85],
  ['Alejandro Davidovich',  'ESP', 'R', 1, 85, 91, 89, 89, 95, 87, 87, 71],
  ['Daniel Altmaier',       'GER', 'R', 2, 85, 89, 89, 87, 89, 77, 91, 81],
  ['Roberto Bautista Agut', 'ESP', 'R', 2, 79, 87, 89, 89, 87, 75, 91, 91],
  ['Zhizhen Zhang',         'CHN', 'R', 2, 92, 89, 81, 79, 81, 77, 81, 75],
  ['Gael Monfils',          'FRA', 'R', 2, 91, 89, 85, 87, 96, 81, 79, 73],
  ['Stan Wawrinka',         'SUI', 'R', 1, 91, 91, 96, 81, 77, 81, 79, 87],
  ['Marin Cilic',           'CRO', 'R', 2, 95, 91, 87, 79, 77, 79, 81, 81],
  ['Adrian Mannarino',      'FRA', 'L', 2, 81, 81, 89, 87, 85, 83, 85, 79],
  ['Yoshihito Nishioka',    'JPN', 'L', 2, 73, 83, 85, 89, 95, 73, 89, 81],
  ['Botic van de Zandschulp','NED', 'R', 2, 87, 85, 85, 85, 85, 79, 85, 77],
];

/* --- Spin pool -----------------------------------------------------------
   Who the wheel can land on in the builder. Legends carry one or two truly
   elite numbers — that's the whole point of the spin.
------------------------------------------------------------------------- */
const POOL_RAW = [
  // era-defining legends
  ['Roger Federer',      'SUI', 'legend',  95, 98, 86, 88, 95, 96, 90, 95, 'that forehand'],
  ['Rafael Nadal',       'ESP', 'legend',  84, 97, 86, 90, 96, 86, 97, 98, 'the buffalo lungs'],
  ['Novak Djokovic',     'SRB', 'legend',  86, 90, 97, 97, 94, 86, 93, 97, 'the return of serve'],
  ['Pete Sampras',       'USA', 'legend',  98, 92, 82, 78, 88, 95, 86, 94, 'the running forehand'],
  ['Andre Agassi',       'USA', 'legend',  80, 94, 95, 96, 86, 70, 86, 86, 'ball-striking on the rise'],
  ['Andy Murray',        'GBR', 'legend',  88, 86, 92, 95, 92, 88, 90, 86, 'the lob and the legs'],
  ['Bjorn Borg',         'SWE', 'legend',  88, 92, 88, 90, 95, 78, 98, 97, 'ice in the veins'],
  ['John McEnroe',       'USA', 'legend',  90, 86, 84, 88, 90, 99, 76, 72, 'hands at the net'],
  ['Ivan Lendl',         'CZE', 'legend',  90, 95, 82, 86, 84, 76, 92, 88, 'the inside-out forehand'],
  ['Boris Becker',       'GER', 'legend',  95, 88, 80, 78, 84, 94, 84, 88, 'the diving volley'],
  ['Steffi Graf',        'GER', 'legend',  86, 97, 84, 88, 97, 84, 90, 94, 'the slice and the sprint'],
  ['Martina Navratilova','USA', 'legend',  92, 86, 84, 86, 92, 99, 88, 92, 'serve and volley, perfected'],
  ['Serena Williams',    'USA', 'legend',  96, 96, 92, 94, 86, 82, 86, 96, 'the biggest serve in the game'],
  ['Monica Seles',       'USA', 'legend',  78, 95, 96, 90, 82, 66, 86, 90, 'two hands off both wings'],
  // specialists — one freakish number each
  ['John Isner',         'USA', 'spec',    99, 82, 70, 62, 62, 76, 76, 74, 'the unreturnable serve'],
  ['Andy Roddick',       'USA', 'spec',    97, 90, 72, 74, 78, 78, 82, 82, '155mph'],
  ['Juan Martin del Potro','ARG','spec',   92, 99, 78, 80, 72, 78, 78, 86, 'the flat forehand bomb'],
  ['Gustavo Kuerten',    'BRA', 'spec',    86, 94, 86, 82, 88, 78, 88, 86, 'clay-court artistry'],
  ['Marat Safin',        'RUS', 'spec',    93, 94, 90, 84, 82, 80, 80, 58, 'pure ball-striking'],
  ['David Ferrer',       'ESP', 'spec',    70, 84, 82, 88, 94, 72, 99, 90, 'never misses a ball'],
  ['Gael Monfils',       'FRA', 'spec',    88, 86, 82, 84, 97, 78, 76, 70, 'inhuman athleticism'],
  ['Stan Wawrinka',      'SUI', 'spec',    88, 88, 98, 78, 74, 78, 76, 84, 'the one-handed backhand'],
  ['Richard Gasquet',    'FRA', 'spec',    80, 82, 96, 80, 84, 82, 78, 70, 'the prettiest backhand alive'],
  ['Nick Kyrgios',       'AUS', 'spec',    97, 88, 84, 78, 80, 88, 70, 58, 'the underarm and the tweener'],
  ['Kei Nishikori',      'JPN', 'spec',    74, 88, 92, 88, 90, 76, 78, 78, 'taking the ball early'],
  // current tour headliners
  ['Jannik Sinner',      'ITA', 'current', 88, 93, 96, 92, 90, 82, 92, 94, 'the cleanest backhand on tour'],
  ['Carlos Alcaraz',     'ESP', 'current', 87, 96, 88, 90, 96, 90, 92, 92, 'the drop shot'],
  ['Daniil Medvedev',    'RUS', 'current', 88, 85, 90, 94, 90, 72, 94, 82, 'returning from the back fence'],
  ['Alexander Zverev',   'GER', 'current', 92, 86, 91, 88, 84, 76, 88, 78, 'the wingspan'],
  ['Alex de Minaur',     'AUS', 'current', 76, 82, 85, 89, 97, 80, 92, 86, 'the fastest legs on tour'],
  ['Ben Shelton',        'USA', 'current', 95, 88, 78, 76, 84, 82, 82, 80, 'the lefty rocket'],
  ['Taylor Fritz',       'USA', 'current', 93, 90, 82, 80, 80, 78, 84, 80, 'first-strike tennis'],
  ['Lorenzo Musetti',    'ITA', 'current', 82, 86, 93, 82, 88, 86, 78, 78, 'the touch game'],
  ['Jack Draper',        'GBR', 'current', 90, 90, 85, 84, 82, 78, 78, 82, 'the lefty forehand'],
  ['Hubert Hurkacz',     'POL', 'current', 95, 84, 78, 74, 78, 86, 80, 76, 'the free points'],
  ['Iga Swiatek',        'POL', 'current', 84, 96, 88, 90, 94, 76, 92, 88, 'the buggy-whip forehand'],
  ['Aryna Sabalenka',    'BLR', 'current', 94, 95, 90, 86, 82, 74, 84, 82, 'raw power'],
  ['Coco Gauff',         'USA', 'current', 88, 82, 90, 92, 96, 82, 90, 86, 'the wheels and the return'],
  ['Grigor Dimitrov',    'BUL', 'current', 86, 89, 88, 82, 88, 88, 80, 76, 'the all-court feel'],
  ['Stefanos Tsitsipas', 'GRE', 'current', 88, 91, 78, 78, 86, 88, 86, 76, 'the transition game'],
  ['Andrey Rublev',      'RUS', 'current', 87, 93, 82, 82, 80, 70, 84, 62, 'the biggest forehand in the top 10']
];

/* --- Calendar ----------------------------------------------------------- */
const PTS = {
  gs:      [10, 100, 400, 800, 1300, 2000],
  m1000:   [10,  50, 200, 400,  650, 1000],
  atp500:  [ 0,  25, 100, 200,  330,  500]
};

// winner's cheque per category — the single source both the calendar display
// and the actual payout in finishEvent() read from
const PRIZE_BY_CAT = { gs: 3000000, m1000: 1100000, atp500: 500000, finals: 4800000 };
const PRIZE_DEFAULT = 400000;

const CALENDAR = [
  { id:'ade', week: 1,  name:'Adelaide International', city:'Adelaide',       cat:'atp500', surface:'hard',   draw:32, bestOf:3, mandatory:false },
  { id:'ao',  week: 3,  name:'Australian Open',        city:'Melbourne',      cat:'gs',     surface:'hard',   draw:32, bestOf:5, mandatory:true  },
  { id:'rot', week: 7,  name:'Rotterdam Open',         city:'Rotterdam',      cat:'atp500', surface:'indoor', draw:32, bestOf:3, mandatory:false },
  { id:'iw',  week:10,  name:'Indian Wells Masters',   city:'Indian Wells',   cat:'m1000',  surface:'hard',   draw:32, bestOf:3, mandatory:true  },
  { id:'mia', week:12,  name:'Miami Open',             city:'Miami',          cat:'m1000',  surface:'hard',   draw:32, bestOf:3, mandatory:true  },
  { id:'mc',  week:15,  name:'Monte-Carlo Masters',    city:'Monte-Carlo',    cat:'m1000',  surface:'clay',   draw:32, bestOf:3, mandatory:false },
  { id:'mad', week:17,  name:'Madrid Open',            city:'Madrid',         cat:'m1000',  surface:'clay',   draw:32, bestOf:3, mandatory:true  },
  { id:'rom', week:19,  name:'Italian Open',           city:'Rome',           cat:'m1000',  surface:'clay',   draw:32, bestOf:3, mandatory:true  },
  { id:'rg',  week:21,  name:'Roland-Garros',          city:'Paris',          cat:'gs',     surface:'clay',   draw:32, bestOf:5, mandatory:true  },
  { id:'qc',  week:24,  name:"Queen's Club",           city:'London',         cat:'atp500', surface:'grass',  draw:32, bestOf:3, mandatory:false },
  { id:'wim', week:26,  name:'Wimbledon',              city:'London',         cat:'gs',     surface:'grass',  draw:32, bestOf:5, mandatory:true  },
  { id:'can', week:31,  name:'Canadian Open',          city:'Toronto',        cat:'m1000',  surface:'hard',   draw:32, bestOf:3, mandatory:true  },
  { id:'cin', week:32,  name:'Cincinnati Masters',     city:'Cincinnati',     cat:'m1000',  surface:'hard',   draw:32, bestOf:3, mandatory:true  },
  { id:'uso', week:34,  name:'US Open',                city:'New York',       cat:'gs',     surface:'hard',   draw:32, bestOf:5, mandatory:true  },
  { id:'sha', week:40,  name:'Shanghai Masters',       city:'Shanghai',       cat:'m1000',  surface:'hard',   draw:32, bestOf:3, mandatory:true  },
  { id:'par', week:44,  name:'Paris Masters',          city:'Paris',          cat:'m1000',  surface:'indoor', draw:32, bestOf:3, mandatory:true  },
  { id:'fin', week:46,  name:'Tour Finals',            city:'Turin',          cat:'finals', surface:'indoor', draw:8,  bestOf:3, mandatory:true  }
];

const ROUND_NAMES_32 = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Final'];

const COUNTRIES = ['AUS','USA','GBR','ESP','ITA','FRA','GER','SRB','SUI','ARG','BRA','CAN','JPN','NED','POL','SWE','CZE','GRE','NOR','DEN','RUS','KAZ','CHN','IND','RSA','MEX','CRO','BUL','CHI','KOR'];

const FIRST_NAMES = ['Milo','Kaito','Andre','Luca','Theo','Nikola','Rafa','Aleks','Bruno','Ivan','Emil','Dario','Otto','Rui','Sami','Noel','Enzo','Lars','Vito','Yannis','Kian','Reid','Cody','Marek','Tobias','Elias','Nate','Rowan','Damir','Felipe'];
const LAST_NAMES  = ['Varga','Okonkwo','Silva','Kovac','Brandt','Ferreira','Ilic','Nowak','Aranda','Petrov','Larsson','Haddad','Moreau','Duarte','Bianchi','Reyes','Kaminski','Vidal','Novak','Ostrowski','Bergman','Delgado','Sato','Ranieri','Chen','Aziz','Halvorsen','Pereira','Marek','Toth'];

/* --- Lifestyle -------------------------------------------------------------
   What prize money buys off the court. Houses and the coaching team carry a
   small permanent attribute nudge — the same clamp(40,99) system pre-season
   training already uses — so a purchase is a real if modest strategic choice,
   not just a number going up. Cars are pure net-worth flex, no bonus at all.
   Upgrading within a category sells the old tier back at half price and
   swaps its bonus out for the new one — you can't stack two houses.
   ---------------------------------------------------------------------------*/
const LIFESTYLE_CATALOG = {
  house: [
    { id: 'house1', name: 'City Apartment',    price: 500000,   blurb: 'A quiet base between tournaments.', attrBonus: { stamina: 1 } },
    { id: 'house2', name: 'Riverside House',   price: 2500000,  blurb: 'Room for a proper recovery setup — pool, gym, the works.', attrBonus: { stamina: 3 } },
    { id: 'house3', name: 'Hilltop Mansion',   price: 8000000,  blurb: 'Nothing left to think about except tennis.', attrBonus: { stamina: 5, mental: 2 } }
  ],
  car: [
    { id: 'car1', name: 'Reliable Sedan', price: 60000,   blurb: 'Gets you to the courts.', attrBonus: {} },
    { id: 'car2', name: 'Sports Coupe',   price: 250000,  blurb: 'Turns heads in the players’ car park.', attrBonus: {} },
    { id: 'car3', name: 'Hypercar',       price: 1200000, blurb: 'Entirely unnecessary. That’s the point.', attrBonus: {} }
  ],
  team: [
    { id: 'team1', name: 'Personal Coach',         price: 150000,   blurb: 'Someone in your corner full-time.', attrBonus: { mental: 1 }, trainingBonus: 1 },
    { id: 'team2', name: 'Coaching Team',          price: 1500000,  blurb: 'Coach, hitting partner and physio on retainer.', attrBonus: { mental: 2, stamina: 1 }, trainingBonus: 2 },
    { id: 'team3', name: 'Full Performance Staff', price: 6000000,  blurb: 'Coach, physio, nutritionist, sports psychologist. Nothing left to chance.', attrBonus: { mental: 3, stamina: 2 }, trainingBonus: 3 }
  ]
};
const LIFESTYLE_RESALE_PCT = 0.5;

/* --- Trivia ----------------------------------------------------------------
   [question, [options], correctIndex, explanation]. Deliberately kept to
   long-settled facts — records that stand for decades, rules, and history —
   rather than "current world No. 1" style questions that rot immediately.
   ---------------------------------------------------------------------------*/
const TRIVIA = [
  ['What is the score called when a game reaches 40–40?', ['Deuce', 'Advantage', 'Break point', 'Set point'], 0,
   'From deuce a player must win two straight points — advantage, then the game.'],
  ['Which Grand Slam is played on clay?', ['Wimbledon', 'US Open', 'Roland-Garros', 'Australian Open'], 2,
   'Roland-Garros in Paris is the only Grand Slam played on clay.'],
  ['Which Grand Slam is played on grass?', ['Wimbledon', 'US Open', 'Roland-Garros', 'Australian Open'], 0,
   'Wimbledon is the only remaining Grand Slam on grass, and the oldest tournament in tennis.'],
  ['What does a score of "love" mean?', ['One point', 'Zero points', 'A tie', 'Match point'], 1,
   'Love means zero. 15–love means the server leads by a point to nothing.'],
  ['How many Grand Slam tournaments are there each year?', ['Three', 'Four', 'Six', 'Nine'], 1,
   'Australian Open, Roland-Garros, Wimbledon and the US Open.'],
  ['What is it called when the server wins the point untouched by the returner?', ['A winner', 'A let', 'An ace', 'A smash'], 2,
   'An ace — a legal serve the returner never makes contact with.'],
  ['In a standard set, how many games do you normally need to win it?', ['Four', 'Five', 'Six', 'Seven'], 2,
   'Six, and you must lead by two — otherwise it goes on, usually to a tiebreak at 6–6.'],
  ['What happens if a serve clips the net but still lands in the correct box?', ['Point to the returner', 'A let, the serve is replayed', 'A fault', 'Play continues'], 1,
   'It is a let: that serve is simply replayed, with no penalty.'],
  ['How many players are on court in a doubles match?', ['Two', 'Three', 'Four', 'Six'], 2,
   'Four — two per team.'],
  ['What is a "break of serve"?', ['Winning a game on your own serve', 'Winning a game on your opponent’s serve', 'Breaking a racquet', 'A rest period'], 1,
   'Taking a game while your opponent is serving. Holding serve is expected; breaking is how sets are won.'],
  ['Which surface generally produces the fastest, lowest bounce?', ['Clay', 'Grass', 'Hard court', 'Carpet'], 1,
   'Grass — the ball skids through low and fast, which rewards big servers.'],
  ['Which surface generally produces the slowest, highest bounce?', ['Clay', 'Grass', 'Hard court', 'Indoor hard'], 0,
   'Clay slows the ball and kicks it up, which rewards defence and stamina.'],
  ['How many points must you normally win a standard tiebreak by?', ['One', 'Two', 'Three', 'Four'], 1,
   'First to seven, but you must lead by two — so tiebreaks can run well past 7.'],
  ['What is the term for winning all four Grand Slams in one calendar year?', ['A Career Slam', 'A Golden Slam', 'A Calendar Grand Slam', 'A Triple Crown'], 2,
   'A Calendar Grand Slam. Winning all four across a whole career instead is a Career Slam.'],
  ['A "Golden Slam" adds which title to all four Grand Slams?', ['The Tour Finals', 'An Olympic gold medal', 'The Davis Cup', 'A Masters 1000'], 1,
   'Olympic singles gold in the same year, on top of all four majors.'],
  ['How many Masters 1000 tournaments are on the ATP calendar?', ['Six', 'Nine', 'Twelve', 'Four'], 1,
   'Nine Masters 1000 events sit just below the Grand Slams in prestige.'],
  ['What does "hold serve" mean?', ['Winning your service game', 'Delaying the serve', 'Serving twice', 'Returning a serve'], 0,
   'Winning the game in which you were serving — the baseline expectation at tour level.'],
  ['In tennis scoring, what comes after 30?', ['35', '40', '45', 'Game'], 1,
   'The sequence is 15, 30, 40, then game.'],
  ['What is a "double fault"?', ['Two aces in a row', 'Missing both serve attempts', 'Hitting the net twice', 'Two winners'], 1,
   'Missing both first and second serve, which hands the point straight to the returner.'],
  ['Best-of-five-set matches are played in men’s singles at which events?', ['All tour events', 'Masters 1000 only', 'Grand Slams only', 'The Tour Finals only'], 2,
   'Only the four Grand Slams. Everything else on tour is best of three.'],
  ['What is the "service box"?', ['The area a serve must land in', 'Where players sit', 'The umpire’s chair', 'Behind the baseline'], 0,
   'The serve must land in the box diagonally opposite the server.'],
  ['Which shot is hit above head height, usually to finish a point at the net?', ['Slice', 'Drop shot', 'Smash', 'Lob'], 2,
   'The smash — an overhead put-away, usually off a short lob.'],
  ['What is a "lob"?', ['A high ball hit over an opponent at the net', 'A very fast serve', 'A shot into the net', 'A backhand slice'], 0,
   'A high, looping ball played over a net-rushing opponent.'],
  ['What is a "drop shot"?', ['A powerful baseline drive', 'A softly played ball just over the net', 'A second serve', 'An overhead'], 1,
   'A delicately played ball that barely clears the net, to drag a deep opponent forward.'],
  ['How long is a standard singles tennis court?', ['78 feet (23.77 m)', '60 feet (18.3 m)', '94 feet (28.7 m)', '100 feet (30.5 m)'], 0,
   '78 feet — 23.77 metres — from baseline to baseline.'],
  ['In doubles, the court is wider by how much on each side?', ['The alleys (tramlines)', 'It is the same width', 'One metre of clay', 'The service box'], 0,
   'The doubles alleys, also called tramlines, are in play in doubles only.'],
  ['What is the "deciding set" tiebreak at most Grand Slams played to?', ['7 points', '10 points', '12 points', 'No tiebreak'], 1,
   'A 10-point tiebreak at 6–6 in the final set, now standardised across the majors.'],
  ['Which country hosts the Australian Open?', ['Austria', 'Australia', 'New Zealand', 'South Africa'], 1,
   'Melbourne, Australia — the first Grand Slam of the calendar year.'],
  ['What is the ATP?', ['A tournament', 'The men’s professional tour body', 'A racquet brand', 'A scoring system'], 1,
   'The Association of Tennis Professionals, which runs the men’s tour.'],
  ['What does "unforced error" mean?', ['A point lost to a great shot', 'A mistake not caused by opponent pressure', 'A foot fault', 'A broken string'], 1,
   'A miss you had full control over — nothing about the opponent’s shot forced it.']
];

if (typeof module !== 'undefined') {
  module.exports = { ATTRS, ATTR_KEYS, SURFACES, TOUR_RAW, POOL_RAW, PTS, PRIZE_BY_CAT, PRIZE_DEFAULT,
    CALENDAR, ROUND_NAMES_32, COUNTRIES, FIRST_NAMES, LAST_NAMES, LIFESTYLE_CATALOG, LIFESTYLE_RESALE_PCT, TRIVIA };
}
