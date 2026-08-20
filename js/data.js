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
  // older eras — the names the game was built on
  ['Rod Laver',          'AUS', 'legend',  88, 94, 90, 88, 94, 96, 94, 96, 'the only man to do it twice'],
  ['Ken Rosewall',       'AUS', 'legend',  78, 84, 97, 88, 90, 90, 94, 92, 'the sliced backhand'],
  ['Jimmy Connors',      'USA', 'legend',  78, 90, 94, 96, 90, 78, 94, 97, 'the will to fight'],
  ['Stefan Edberg',      'SWE', 'legend',  90, 78, 90, 84, 94, 98, 86, 88, 'the best volleys in the game'],
  ['Mats Wilander',      'SWE', 'legend',  76, 88, 90, 90, 92, 76, 96, 94, 'patience as a weapon'],
  ['Arthur Ashe',        'USA', 'legend',  92, 86, 82, 80, 86, 90, 84, 95, 'the thinking man\u2019s game'],
  ['Ilie Nastase',       'ROU', 'legend',  84, 90, 86, 88, 96, 92, 82, 60, 'hands like nobody else'],
  ['Chris Evert',        'USA', 'legend',  70, 88, 96, 92, 84, 64, 90, 98, 'the metronome backhand'],
  ['Billie Jean King',   'USA', 'legend',  86, 84, 82, 88, 90, 96, 84, 96, 'the net and the nerve'],
  ['Margaret Court',     'AUS', 'legend',  88, 90, 82, 84, 88, 94, 88, 90, 'the reach'],
  ['Martina Hingis',     'SUI', 'legend',  70, 84, 88, 92, 90, 88, 78, 92, 'seeing two shots ahead'],
  ['Justine Henin',      'BEL', 'legend',  82, 90, 97, 90, 92, 86, 82, 94, 'the one-hander'],
  ['Venus Williams',     'USA', 'legend',  94, 90, 88, 86, 92, 84, 86, 88, 'the wingspan'],
  ['Guillermo Vilas',    'ARG', 'spec',    74, 92, 84, 86, 90, 68, 98, 92, 'the topspin lefty'],
  ['Yannick Noah',       'FRA', 'spec',    90, 88, 74, 76, 92, 94, 82, 78, 'pure athleticism'],
  ['Jim Courier',        'USA', 'spec',    82, 95, 84, 86, 80, 66, 92, 92, 'the flat forehand'],
  ['Goran Ivanisevic',   'CRO', 'spec',    98, 84, 76, 66, 74, 84, 78, 64, 'the lefty serve'],
  ['Michael Chang',      'USA', 'spec',    70, 84, 86, 92, 97, 66, 96, 94, 'the underarm serve at 17'],
  ['Thomas Muster',      'AUT', 'spec',    74, 94, 78, 82, 88, 64, 97, 92, 'the clay-court bulldozer'],
  ['Patrick Rafter',     'AUS', 'spec',    92, 82, 76, 80, 88, 97, 84, 84, 'the kick serve and charge'],
  ['Marcelo Rios',       'CHI', 'spec',    76, 90, 94, 88, 92, 80, 76, 58, 'the purest lefty hands'],
  ['Lleyton Hewitt',     'AUS', 'spec',    74, 84, 88, 94, 95, 74, 94, 96, 'chasing everything down'],
  ['Juan Carlos Ferrero','ESP', 'spec',    82, 92, 82, 84, 94, 74, 92, 84, 'the mosquito'],
  ['Richard Krajicek',   'NED', 'spec',    96, 86, 74, 68, 74, 88, 76, 74, 'the Wimbledon serve'],
  ['Pat Cash',           'AUS', 'spec',    90, 80, 78, 76, 84, 95, 80, 82, 'climbing into the box'],
  ['Maria Sharapova',    'RUS', 'spec',    88, 88, 90, 84, 78, 66, 84, 97, 'refusing to lose'],
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

/* --- Eras -----------------------------------------------------------------
   Which tour you turn pro into. Each era ships its own top-of-the-field
   roster; the journeyman pool is generated on top of it either way, so the
   draw sizes and the ranking maths are identical across eras. Ratings use the
   same inflated tour scale as TOUR_RAW so a 1983 field and a 2026 field are
   directly comparable — the difference is the shape of the field, not its
   level. Rows are [name, country, hand, backhand, SRV, FH, BH, RET, MOV, NET, STA, MEN].
------------------------------------------------------------------------- */

const ERA_1983 = [
  ['John McEnroe',        'USA', 'L', 1, 94, 88, 86, 90, 92, 99, 78, 74],
  ['Ivan Lendl',          'CZE', 'R', 1, 93, 97, 85, 88, 86, 78, 94, 90],
  ['Jimmy Connors',       'USA', 'L', 2, 80, 92, 95, 96, 91, 80, 95, 97],
  ['Mats Wilander',       'SWE', 'R', 2, 78, 90, 92, 92, 93, 78, 96, 94],
  ['Bjorn Borg',          'SWE', 'R', 2, 90, 93, 90, 91, 96, 80, 98, 97],
  ['Guillermo Vilas',     'ARG', 'L', 1, 76, 93, 86, 88, 91, 70, 97, 92],
  ['Stefan Edberg',       'SWE', 'R', 1, 91, 80, 91, 86, 94, 97, 87, 88],
  ['Boris Becker',        'GER', 'R', 2, 96, 90, 82, 80, 86, 95, 85, 89],
  ['Yannick Noah',        'FRA', 'R', 1, 91, 89, 76, 78, 93, 94, 83, 79],
  ['Vitas Gerulaitis',    'USA', 'R', 1, 84, 85, 84, 84, 93, 90, 85, 80],
  ['Jose Luis Clerc',     'ARG', 'R', 1, 78, 91, 80, 84, 89, 72, 92, 84],
  ['Miloslav Mecir',      'SVK', 'R', 2, 79, 88, 91, 90, 88, 86, 82, 78],
  ['Anders Jarryd',       'SWE', 'R', 1, 86, 82, 86, 86, 88, 93, 84, 82],
  ['Joakim Nystrom',      'SWE', 'R', 2, 76, 86, 88, 88, 90, 78, 92, 82],
  ['Henri Leconte',       'FRA', 'L', 1, 90, 92, 84, 80, 88, 90, 76, 66],
  ['Kevin Curren',        'RSA', 'R', 1, 95, 84, 78, 76, 82, 91, 80, 76],
  ['Pat Cash',            'AUS', 'R', 2, 91, 82, 80, 78, 86, 96, 82, 84],
  ['Tim Mayotte',         'USA', 'R', 1, 89, 84, 80, 78, 84, 92, 82, 80],
  ['Aaron Krickstein',    'USA', 'R', 2, 82, 90, 82, 84, 86, 72, 92, 86],
  ['Jimmy Arias',         'USA', 'R', 1, 80, 93, 76, 80, 84, 70, 88, 78],
  ['Eliot Teltscher',     'USA', 'R', 2, 74, 86, 88, 88, 86, 76, 88, 84],
  ['Andres Gomez',        'ECU', 'L', 1, 86, 91, 80, 80, 84, 82, 88, 82],
  ['Johan Kriek',         'RSA', 'R', 2, 85, 86, 82, 84, 92, 84, 84, 78],
  ['Jose Higueras',       'ESP', 'R', 1, 72, 88, 86, 88, 90, 70, 94, 86],
  ['Tomas Smid',          'CZE', 'R', 1, 84, 82, 84, 82, 84, 90, 84, 78],
  ['Henrik Sundstrom',    'SWE', 'R', 2, 76, 88, 84, 84, 88, 72, 90, 82],
  ['Brad Gilbert',        'USA', 'R', 2, 74, 80, 82, 90, 86, 78, 88, 92],
  ['Paul Annacone',       'USA', 'R', 1, 88, 80, 78, 76, 82, 93, 80, 78],
  ['Mikael Pernfors',     'SWE', 'R', 2, 72, 86, 88, 88, 90, 74, 90, 82],
  ['Emilio Sanchez',      'ESP', 'R', 2, 76, 86, 82, 84, 88, 84, 90, 82]
];

const ERA_1993 = [
  ['Pete Sampras',        'USA', 'R', 1, 98, 93, 84, 80, 89, 95, 88, 95],
  ['Andre Agassi',        'USA', 'R', 2, 82, 95, 96, 97, 88, 72, 88, 87],
  ['Boris Becker',        'GER', 'R', 2, 96, 90, 82, 80, 86, 95, 85, 89],
  ['Stefan Edberg',       'SWE', 'R', 1, 91, 80, 91, 86, 94, 97, 87, 88],
  ['Jim Courier',         'USA', 'R', 2, 84, 96, 86, 88, 82, 68, 93, 93],
  ['Goran Ivanisevic',    'CRO', 'L', 2, 99, 86, 78, 68, 76, 86, 80, 66],
  ['Michael Chang',       'USA', 'R', 2, 72, 86, 88, 93, 97, 68, 96, 94],
  ['Sergi Bruguera',      'ESP', 'R', 1, 76, 92, 84, 84, 90, 70, 95, 86],
  ['Thomas Muster',       'AUT', 'L', 2, 76, 95, 80, 84, 89, 66, 97, 92],
  ['Michael Stich',       'GER', 'R', 1, 94, 88, 86, 80, 86, 93, 82, 80],
  ['Yevgeny Kafelnikov',  'RUS', 'R', 2, 86, 90, 90, 88, 86, 84, 90, 78],
  ['Richard Krajicek',    'NED', 'R', 2, 97, 88, 76, 70, 76, 89, 78, 76],
  ['Marcelo Rios',        'CHI', 'L', 2, 78, 92, 95, 90, 93, 82, 78, 62],
  ['Patrick Rafter',      'AUS', 'R', 1, 93, 84, 78, 82, 89, 97, 86, 85],
  ['Carlos Moya',         'ESP', 'R', 1, 88, 94, 78, 80, 86, 74, 90, 82],
  ['Alex Corretja',       'ESP', 'R', 1, 76, 88, 86, 88, 90, 74, 94, 86],
  ['Thomas Enqvist',      'SWE', 'R', 2, 88, 92, 86, 80, 82, 76, 86, 78],
  ['Andrei Medvedev',     'UKR', 'R', 2, 84, 90, 86, 84, 82, 76, 86, 74],
  ['Todd Martin',         'USA', 'R', 2, 91, 86, 88, 82, 78, 90, 84, 86],
  ['Cedric Pioline',      'FRA', 'R', 1, 87, 88, 84, 82, 86, 84, 84, 78],
  ['MaliVai Washington',  'USA', 'R', 2, 84, 88, 84, 86, 88, 80, 86, 80],
  ['Marc Rosset',         'SUI', 'R', 1, 95, 86, 76, 70, 74, 86, 78, 74],
  ['Albert Costa',        'ESP', 'R', 1, 74, 90, 84, 86, 88, 70, 93, 84],
  ['Tim Henman',          'GBR', 'R', 1, 88, 82, 80, 80, 88, 95, 82, 76],
  ['Mark Philippoussis',  'AUS', 'R', 2, 97, 90, 76, 70, 76, 84, 78, 70],
  ['Wayne Ferreira',      'RSA', 'R', 2, 86, 88, 86, 84, 86, 84, 84, 76],
  ['Gustavo Kuerten',     'BRA', 'R', 1, 88, 95, 88, 84, 88, 80, 90, 87],
  ['Magnus Gustafsson',   'SWE', 'R', 2, 76, 88, 84, 84, 88, 72, 90, 80],
  ['Jonas Bjorkman',      'SWE', 'R', 2, 82, 82, 84, 88, 90, 92, 86, 80],
  ['Greg Rusedski',       'GBR', 'L', 2, 97, 86, 74, 70, 76, 86, 78, 72]
];

const ERA_2005 = [
  ['Roger Federer',       'SUI', 'R', 1, 95, 98, 88, 90, 96, 96, 91, 96],
  ['Rafael Nadal',        'ESP', 'L', 2, 85, 97, 88, 91, 96, 87, 97, 98],
  ['Andy Roddick',        'USA', 'R', 2, 98, 92, 74, 76, 80, 80, 84, 84],
  ['Lleyton Hewitt',      'AUS', 'R', 2, 76, 86, 90, 95, 96, 76, 95, 96],
  ['Marat Safin',         'RUS', 'R', 2, 94, 95, 91, 86, 84, 82, 82, 60],
  ['Juan Carlos Ferrero', 'ESP', 'R', 2, 84, 93, 84, 86, 95, 76, 93, 85],
  ['David Nalbandian',    'ARG', 'R', 2, 82, 92, 95, 92, 88, 80, 88, 82],
  ['Nikolay Davydenko',   'RUS', 'R', 2, 76, 90, 91, 92, 92, 74, 92, 78],
  ['Novak Djokovic',      'SRB', 'R', 2, 86, 89, 94, 94, 92, 84, 90, 92],
  ['Andy Murray',         'GBR', 'R', 2, 88, 86, 92, 95, 93, 88, 90, 84],
  ['James Blake',         'USA', 'R', 2, 88, 95, 80, 80, 92, 80, 82, 72],
  ['Fernando Gonzalez',   'CHI', 'R', 1, 88, 98, 74, 76, 84, 76, 86, 76],
  ['Ivan Ljubicic',       'CRO', 'R', 2, 95, 90, 80, 76, 78, 80, 84, 78],
  ['Guillermo Coria',     'ARG', 'R', 2, 70, 88, 86, 90, 95, 76, 92, 70],
  ['Tommy Robredo',       'ESP', 'R', 1, 80, 90, 84, 86, 88, 76, 92, 84],
  ['Tomas Berdych',       'CZE', 'R', 2, 93, 92, 86, 80, 78, 82, 86, 76],
  ['Marcos Baghdatis',    'CYP', 'R', 2, 84, 90, 88, 86, 88, 78, 84, 80],
  ['Tommy Haas',          'GER', 'R', 1, 88, 90, 90, 84, 86, 86, 80, 78],
  ['Mario Ancic',         'CRO', 'R', 2, 92, 84, 80, 78, 82, 90, 82, 78],
  ['Richard Gasquet',     'FRA', 'R', 1, 82, 84, 97, 82, 88, 84, 82, 72],
  ['Gael Monfils',        'FRA', 'R', 2, 90, 88, 84, 86, 97, 80, 80, 72],
  ['Fernando Verdasco',   'ESP', 'L', 2, 90, 93, 80, 80, 86, 78, 88, 76],
  ['Radek Stepanek',      'CZE', 'R', 2, 84, 82, 82, 84, 88, 94, 84, 82],
  ['Mikhail Youzhny',     'RUS', 'R', 1, 82, 86, 88, 86, 88, 84, 86, 78],
  ['Jo-Wilfried Tsonga',  'FRA', 'R', 2, 93, 94, 80, 80, 88, 88, 84, 78],
  ['Juan Martin del Potro','ARG','R', 2, 93, 99, 80, 82, 74, 80, 80, 87],
  ['Robin Soderling',     'SWE', 'R', 2, 94, 95, 84, 78, 78, 78, 84, 78],
  ['Gilles Simon',        'FRA', 'R', 2, 74, 86, 88, 90, 92, 72, 92, 82],
  ['Marin Cilic',         'CRO', 'R', 2, 94, 90, 86, 80, 78, 80, 84, 78],
  ['Stan Wawrinka',       'SUI', 'R', 1, 89, 90, 96, 82, 78, 82, 80, 84]
];

const ERA_2015 = [
  ['Novak Djokovic',      'SRB', 'R', 2, 88, 92, 98, 98, 95, 87, 94, 98],
  ['Roger Federer',       'SUI', 'R', 1, 95, 97, 87, 88, 93, 96, 88, 94],
  ['Andy Murray',         'GBR', 'R', 2, 90, 88, 94, 96, 94, 89, 92, 87],
  ['Rafael Nadal',        'ESP', 'L', 2, 85, 96, 88, 90, 93, 86, 94, 95],
  ['Stan Wawrinka',       'SUI', 'R', 1, 91, 92, 97, 83, 79, 83, 81, 88],
  ['Kei Nishikori',       'JPN', 'R', 2, 76, 90, 94, 90, 92, 78, 80, 80],
  ['Tomas Berdych',       'CZE', 'R', 2, 94, 93, 87, 81, 79, 83, 87, 77],
  ['David Ferrer',        'ESP', 'R', 2, 72, 86, 84, 90, 95, 74, 99, 91],
  ['Milos Raonic',        'CAN', 'R', 2, 98, 91, 76, 72, 76, 86, 82, 76],
  ['Marin Cilic',         'CRO', 'R', 2, 95, 91, 87, 80, 78, 80, 84, 79],
  ['Jo-Wilfried Tsonga',  'FRA', 'R', 2, 93, 94, 80, 81, 88, 89, 84, 78],
  ['Richard Gasquet',     'FRA', 'R', 1, 82, 84, 97, 82, 88, 84, 82, 72],
  ['Juan Martin del Potro','ARG','R', 2, 93, 99, 80, 82, 74, 80, 78, 88],
  ['Grigor Dimitrov',     'BUL', 'R', 1, 91, 92, 91, 85, 92, 92, 84, 78],
  ['Dominic Thiem',       'AUT', 'R', 1, 88, 95, 93, 84, 88, 76, 90, 84],
  ['David Goffin',        'BEL', 'R', 2, 74, 88, 90, 90, 93, 78, 84, 78],
  ['John Isner',          'USA', 'R', 2, 99, 84, 72, 64, 64, 78, 78, 76],
  ['Kevin Anderson',      'RSA', 'R', 2, 96, 89, 82, 76, 74, 80, 82, 78],
  ['Gael Monfils',        'FRA', 'R', 2, 90, 88, 84, 87, 97, 80, 78, 72],
  ['Alexander Zverev',    'GER', 'R', 1, 93, 87, 92, 89, 86, 78, 88, 76],
  ['Jack Sock',           'USA', 'R', 2, 88, 95, 74, 78, 82, 86, 80, 74],
  ['Roberto Bautista Agut','ESP','R', 2, 78, 88, 90, 90, 88, 76, 92, 90],
  ['Lucas Pouille',       'FRA', 'R', 2, 88, 88, 84, 82, 86, 84, 82, 76],
  ['Nick Kyrgios',        'AUS', 'R', 2, 97, 89, 85, 80, 82, 89, 72, 60],
  ['Borna Coric',         'CRO', 'R', 2, 82, 86, 88, 88, 90, 76, 88, 82],
  ['Karen Khachanov',     'RUS', 'R', 2, 94, 93, 88, 84, 82, 78, 88, 80],
  ['Daniil Medvedev',     'RUS', 'R', 2, 89, 84, 90, 93, 91, 74, 93, 82],
  ['Stefanos Tsitsipas',  'GRE', 'R', 1, 92, 94, 82, 82, 90, 92, 90, 80],
  ['Denis Shapovalov',    'CAN', 'L', 1, 93, 90, 90, 82, 88, 88, 80, 72],
  ['Fabio Fognini',       'ITA', 'R', 2, 78, 90, 88, 86, 88, 82, 82, 66]
];

/* The wheel's outcomes. `year` is the season you debut in; `tour` is the field
   at the top of the rankings that year. */
const ERAS = [
  { id: '1983', year: 1983, name: 'The Wood-to-Graphite Years',
    blurb: 'Serve-and-volley on fast grass, five-set finals on slow clay, and a top of the game split between McEnroe’s hands and Lendl’s forehand.',
    tour: ERA_1983 },
  { id: '1993', year: 1993, name: 'The Serve-and-Volley Era',
    blurb: 'Sampras against Agassi, a Wimbledon where the ball barely bounced, and a clay season nobody from the grass tour wanted.',
    tour: ERA_1993 },
  { id: '2005', year: 2005, name: 'Federer’s Rise',
    blurb: 'One man is winning almost everything and a teenager from Mallorca has just worked out how to stop him on clay.',
    tour: ERA_2005 },
  { id: '2015', year: 2015, name: 'The Big Four Peak',
    blurb: 'The hardest era to win a major in. Four players are holding the door shut and everyone else is fighting over the scraps.',
    tour: ERA_2015 },
  { id: '2026', year: 2026, name: 'The New Guard',
    blurb: 'Sinner and Alcaraz have taken over, Djokovic is still dangerous, and the rest of the top ten changes every fortnight.',
    tour: TOUR_RAW }
];

function eraById(id) { return ERAS.find(e => e.id === id) || ERAS[ERAS.length - 1]; }

/* --- Rookie routes --------------------------------------------------------
   How you arrive on tour. `pts` is the ranking total you start the season on
   (0 means you begin outside the rankings and qualify for everything), `cash`
   is money in the bank before your first cheque, and `bonus` is a small
   head-start on the attributes the route implies. `wildcards` buys you
   automatic main-draw entry that many times, skipping qualifying.
------------------------------------------------------------------------- */
const ROOKIE_ROUTES = [
  { id: 'junior-slam', name: 'Junior Slam Champion',
    blurb: 'You won a junior major and the tour already knows your name. The expectation arrives with it.',
    pts: 260, cash: 120000, wildcards: 3, fame: 12, bonus: { mental: 2 } },
  { id: 'wildcard', name: 'Home Wildcard',
    blurb: 'Your federation handed you a main-draw wildcard at the home slam. One good week and you never have to qualify again.',
    pts: 90, cash: 200000, wildcards: 4, fame: 8, bonus: { serve: 2 } },
  { id: 'qualifier', name: 'Qualifying Grinder',
    blurb: 'No hype, no help, three matches every week just to reach the first round. You will be fit, at least.',
    pts: 25, cash: 30000, wildcards: 0, fame: 1, bonus: { stamina: 4 } },
  { id: 'academy', name: 'Academy Prodigy',
    blurb: 'A decade inside a famous academy, funded by people expecting a return. The strokes are finished; the results are not.',
    pts: 170, cash: 380000, wildcards: 2, fame: 6, bonus: { forehand: 2, backhand: 2 } },
  { id: 'challenger', name: 'Challenger Champion',
    blurb: 'You cleaned up on the second tier all year. Nobody watched, but the ranking points are real.',
    pts: 320, cash: 80000, wildcards: 1, fame: 4, bonus: { movement: 2 } },
  { id: 'college', name: 'College Standout',
    blurb: 'Four years of team tennis and a degree to fall back on. You arrive late but you arrive knowing how to compete.',
    pts: 70, cash: 110000, wildcards: 2, fame: 3, bonus: { mental: 3 } },
  { id: 'tour-family', name: 'Tour Family',
    blurb: 'A parent played. The travel, the coaches and the contacts were all sorted before you hit a ball for money.',
    pts: 110, cash: 850000, wildcards: 3, fame: 9, bonus: { net: 1, mental: 1 } },
  { id: 'olympic', name: 'Olympic Medallist',
    blurb: 'A medal before a ranking. Sponsors found you first and the tour is still working out whether it was a fluke.',
    pts: 200, cash: 170000, wildcards: 2, fame: 15, bonus: { ret: 2 } },
  { id: 'late-bloomer', name: 'Late Bloomer',
    blurb: 'You were nowhere at eighteen. Something clicked, and now the weakest part of your game is no longer weak.',
    pts: 45, cash: 45000, wildcards: 1, fame: 2, bonus: { lowest: 5 } },
  { id: 'unknown', name: 'Complete Unknown',
    blurb: 'No federation, no academy, no backer. If you get anywhere it will be entirely on the racquet.',
    pts: 0, cash: 15000, wildcards: 0, fame: 0, bonus: { all: 1 } }
];

/* --- Life stages ----------------------------------------------------------
   The rung of the ladder you're standing on. Stages gate which life events
   can reach you, and the hub shows the whole track so you can see where the
   career sits. Order matters: `stageFor` walks this list and takes the first
   stage whose test passes, so the specific cases sit above the general ones.
------------------------------------------------------------------------- */
const LIFE_STAGES = [
  { id: 'rookie',    name: 'Rookie',       blurb: 'First season on tour. Nobody knows your name yet.' },
  { id: 'grinder',   name: 'The Grind',    blurb: 'Qualifying draws, cheap flights, and results that will not come.' },
  { id: 'regular',   name: 'Tour Regular', blurb: 'Into main draws on ranking alone. A living, if not yet a career.' },
  { id: 'contender', name: 'Contender',    blurb: 'Seeded, dangerous, and expected to go deep.' },
  { id: 'elite',     name: 'Elite',        blurb: 'Top of the game. Everything you do is now news.' },
  { id: 'veteran',   name: 'Veteran',      blurb: 'The body is negotiating. The head knows more than it ever did.' }
];

function stageFor(ctx) {
  if (ctx.age >= 32) return 'veteran';
  if (ctx.seasons === 0) return 'rookie';
  if (ctx.slams >= 1 || ctx.rank <= 5) return 'elite';
  if (ctx.rank <= 25) return 'contender';
  if (ctx.rank <= 70) return 'regular';
  return 'grinder';
}

/* --- Life events ----------------------------------------------------------
   The bit between the matches. One can land after any tournament; each is
   drawn from the pool your current stage unlocks and never repeats.

   Effects a choice can carry:
     cash    money in or out (a choice you cannot afford is offered greyed out)
     fame    0-100, drives the endorsement cheque paid at the end of each season
     fatigue 0-100, straight onto the fatigue meter (negative is rest)
     form    the 0.92-1.08 form multiplier, nudged
     attrs   permanent rating changes
------------------------------------------------------------------------- */
const LIFE_EVENTS = [
  /* ---------------- rookie ---------------- */
  { id: 'first-cheque', stages: ['rookie'], title: 'The first real cheque',
    text: 'Your first main-draw prize money has cleared. It is more than either of your parents made last year, and they spent a decade driving you to courts at six in the morning.',
    choices: [
      { label: 'Send it home', detail: 'They earned it as much as you did.',
        fx: { cash: -40000, fame: 2, attrs: { mental: 2 } },
        outcome: 'Your mum cries down the phone. Whatever happens now, that part is already paid back.' },
      { label: 'Bank every cent', detail: 'A season on tour is expensive and nobody is funding you.',
        fx: { cash: 25000, attrs: { mental: 1 } },
        outcome: 'Unglamorous, and exactly right. You can now afford a full season without begging anyone.' },
      { label: 'Buy proper kit', detail: 'New frames, strung right, and shoes that fit.',
        fx: { cash: -18000, attrs: { serve: 1, movement: 1 } },
        outcome: 'The difference is small and instant. You had been playing with the wrong tension for a year.' }
    ] },
  { id: 'school-or-tour', stages: ['rookie'], title: 'Exams or entries',
    text: 'Your final school exams fall in the same fortnight as two events you are entered in. You cannot do both.',
    choices: [
      { label: 'Sit the exams', detail: 'Something to fall back on.',
        fx: { fatigue: 10, attrs: { mental: 3 } },
        outcome: 'You pass. It changes nothing about your tennis and everything about how you sleep.' },
      { label: 'Play the events', detail: 'The ranking will not wait.',
        fx: { fame: 1, attrs: { ret: 1, movement: 1 } },
        outcome: 'Two wins and a hard loss. You are a tennis player now, formally, with nothing behind you.' }
    ] },
  { id: 'first-agent', stages: ['rookie', 'grinder'], title: 'A man with a card',
    text: 'An agent from a large management group finds you in the player lounge. He has watched two of your matches and knows your junior record by heart.',
    choices: [
      { label: 'Sign with the agency', detail: 'Doors open, but they take their cut.',
        fx: { cash: 60000, fame: 6 },
        outcome: 'A boot deal lands inside a month. So does a schedule you did not entirely agree to.' },
      { label: 'Stay independent', detail: 'Slower, but nobody owns a piece of you.',
        fx: { attrs: { mental: 2 } },
        outcome: 'He is gracious about it. You book your own flights for another two years and never regret it.' }
    ] },
  { id: 'homesick', stages: ['rookie'], title: 'Eleven weeks away',
    text: 'You have been on the road since February. Tonight is another hotel room in another city where you know nobody.',
    choices: [
      { label: 'Fly a parent out', detail: 'Expensive, and worth it.',
        fx: { cash: -12000, fatigue: -12, attrs: { mental: 2 } },
        outcome: 'They stay a fortnight, cook once, and say almost nothing useful. You play free for a month.' },
      { label: 'Put your head down', detail: 'Everyone does this. Get on with it.',
        fx: { fatigue: 8, attrs: { mental: 1 } },
        outcome: 'You get through it. Something hardens that you will be grateful for later and cannot describe now.' }
    ] },

  /* ---------------- grinder ---------------- */
  { id: 'challenger-grind', stages: ['grinder'], title: 'Six weeks, six challengers',
    text: 'The only way up is a block of second-tier events back to back — night buses, shared rooms, no physio.',
    choices: [
      { label: 'Play all six', detail: 'Points are points.',
        fx: { fatigue: 26, fame: 2, attrs: { stamina: 2, mental: 1 } },
        outcome: 'You come out of it exhausted, ranked considerably higher, and able to play tired without panicking.' },
      { label: 'Play three and train', detail: 'Half the points, half the wear.',
        fx: { fatigue: 8, attrs: { forehand: 1, backhand: 1 } },
        outcome: 'The block in the middle is the most useful fortnight of practice you have had in two years.' }
    ] },
  { id: 'the-backer', stages: ['grinder', 'regular'], title: 'An offer of funding',
    text: 'A businessman who watches you at your home club offers to fund a full season — flights, coach, physio — for a slice of your prize money for the next five years.',
    choices: [
      { label: 'Take the money', detail: 'A proper season, right now.',
        fx: { cash: 220000, fatigue: -10, attrs: { mental: -1 } },
        outcome: 'You travel properly for the first time. The percentage will follow you around for years, and you knew that.' },
      { label: 'Turn it down', detail: 'Keep every cent you win.',
        fx: { attrs: { mental: 2 } },
        outcome: 'Harder, cheaper, yours. You fly economy with a bag of your own strings.' }
    ] },
  { id: 'coach-split', stages: ['grinder', 'regular'], title: 'The coach who got you here',
    text: 'The man who has coached you since you were nine says, plainly and without self-pity, that he has taken you as far as he can.',
    choices: [
      { label: 'Move on', detail: 'He is right, and he knows it.',
        fx: { cash: -60000, attrs: { forehand: 1, backhand: 1, ret: 1 } },
        outcome: 'The new voice fixes a return position you have had wrong for a decade. You still call him after finals.' },
      { label: 'Keep him', detail: 'Loyalty is worth something too.',
        fx: { attrs: { mental: 3 } },
        outcome: 'Your technique stops improving. Your head never once wobbles in a tight third set.' }
    ] },
  { id: 'wrong-draw', stages: ['grinder', 'regular'], title: 'A brutal draw',
    text: 'You have drawn a seed in the first round for the fourth event running. The ranking says you deserve it; the schedule says you have no chance to build anything.',
    choices: [
      { label: 'Study the tape', detail: 'Two days of it, shot by shot.',
        fx: { fatigue: 6, attrs: { ret: 2 } },
        outcome: 'You find a pattern on the second serve nobody had told you about. You lose in three, closely.' },
      { label: 'Forget the seeding', detail: 'Play your game and see.',
        fx: { form: 0.02, attrs: { mental: 1 } },
        outcome: 'It goes badly and you do not care. Something about that turns out to be useful.' }
    ] },

  /* ---------------- regular ---------------- */
  { id: 'first-endorsement', stages: ['regular', 'contender'], title: 'A racquet contract',
    text: 'A manufacturer wants you in their frames. The money is real. The frame is not the one you have used since you were fourteen.',
    choices: [
      { label: 'Sign and switch', detail: 'Take the deal, learn the frame.',
        fx: { cash: 400000, fame: 5, attrs: { forehand: -1, backhand: -1 } },
        outcome: 'Three bad months, then it settles. The cheque clears either way.' },
      { label: 'Sign, keep your frame', detail: 'They paint your old frame in their colours. Less money.',
        fx: { cash: 150000, fame: 3 },
        outcome: 'A common arrangement, quietly done. Nobody watching at home can tell.' },
      { label: 'Walk away', detail: 'Nothing changes about your equipment.',
        fx: { attrs: { mental: 1 } },
        outcome: 'Your agent is furious. Your forehand is exactly where you left it.' }
    ] },
  { id: 'fitness-overhaul', stages: ['regular', 'contender'], title: 'A brutal off-court block',
    text: 'A fitness coach has looked at your data and told you the truth: you lose matches in the fourth set because you are not fit enough, not because you are not good enough.',
    choices: [
      { label: 'Do the whole block', detail: 'Six weeks of work you will hate.',
        fx: { cash: -90000, fatigue: 20, attrs: { stamina: 4, movement: 2 } },
        outcome: 'You have never felt worse. Next February you win a five-setter you would have lost in straight sets.' },
      { label: 'A lighter version', detail: 'Keep some tennis in the schedule.',
        fx: { cash: -35000, fatigue: 8, attrs: { stamina: 2 } },
        outcome: 'A sensible compromise that makes you slightly better at everything and dramatically better at nothing.' }
    ] },
  { id: 'nagging-wrist', stages: ['regular', 'contender', 'elite'], title: 'The wrist',
    text: 'It has been sore for six weeks. The scan shows nothing structural, which the doctor says is good news and does not feel like it.',
    choices: [
      { label: 'Take a month off', detail: 'Rest it properly, lose the points.',
        fx: { fatigue: -30, attrs: { mental: 1 } },
        outcome: 'The ranking slides. The wrist stops talking to you and never brings it up again.' },
      { label: 'Play through it', detail: 'Tape it and keep entering.',
        fx: { fatigue: 16, form: -0.02, attrs: { forehand: -1 } },
        outcome: 'You get the points. The wrist becomes a thing you manage rather than a thing you fixed.' }
    ] },
  { id: 'tabloid', stages: ['regular', 'contender', 'elite'], title: 'A photo you did not pose for',
    text: 'A picture of you leaving a bar at 2am the night before a first round is on the back page. You lost that match.',
    choices: [
      { label: 'Own it publicly', detail: 'Say the obvious thing and move on.',
        fx: { fame: 4, attrs: { mental: 2 } },
        outcome: 'The story dies in a day. Players you have never spoken to tell you it was the right call.' },
      { label: 'Say nothing', detail: 'Let it burn out on its own.',
        fx: { fame: -2, attrs: { mental: 1 } },
        outcome: 'It takes a fortnight instead of a day, and you learn who in your box talks to journalists.' }
    ] },
  { id: 'charity-exo', stages: ['regular', 'contender', 'elite'], title: 'A hospital exhibition',
    text: 'A children’s hospital in your home city wants you for an afternoon. There is no fee and it falls in the middle of your only rest week.',
    choices: [
      { label: 'Go', detail: 'Give up the rest day.',
        fx: { fatigue: 6, fame: 5, attrs: { mental: 2 } },
        outcome: 'A nine-year-old with a drip in her arm returns your serve. You think about it before every final you ever play.' },
      { label: 'Send kit instead', detail: 'Signed racquets and a video message.',
        fx: { cash: -8000, fame: 1 },
        outcome: 'Genuinely appreciated, and not the same thing, and you know it.' }
    ] },

  /* ---------------- contender ---------------- */
  { id: 'super-coach', stages: ['contender', 'elite'], title: 'A former great calls',
    text: 'Someone who won majors when you were a child wants to work with you. The fee is enormous and so is the demand: their schedule, their pre-season, their opinion on everything.',
    choices: [
      { label: 'Hire them', detail: 'Hand over the keys.',
        fx: { cash: -800000, attrs: { mental: 3, ret: 2, net: 1 } },
        outcome: 'They rebuild how you think about a match. You have never been coached this hard and it works.' },
      { label: 'Consultancy only', detail: 'A fortnight before each major.',
        fx: { cash: -220000, attrs: { mental: 1, ret: 1 } },
        outcome: 'You get the good bits and keep your independence. They think you are wasting the opportunity.' },
      { label: 'Decline', detail: 'Your team got you here.',
        fx: { attrs: { mental: 1 } },
        outcome: 'Your coach hears about the offer anyway. He never mentions it and works twice as hard.' }
    ] },
  { id: 'december-exos', stages: ['contender', 'elite'], title: 'The December money',
    text: 'A promoter offers a fortnight of exhibitions across three countries in December. It is a serious amount of money for six matches that count for nothing.',
    choices: [
      { label: 'Play the tour', detail: 'Take the money, lose the pre-season.',
        fx: { cash: 1200000, fatigue: 22, fame: 6, attrs: { stamina: -1 } },
        outcome: 'You arrive in January rich and underdone. The Australian Open is not kind about it.' },
      { label: 'Do the pre-season', detail: 'Six weeks of proper work instead.',
        fx: { fatigue: -20, attrs: { stamina: 2, movement: 1 } },
        outcome: 'Nobody pays you a cent for December. You start the season in the best shape of your life.' }
    ] },
  { id: 'the-rival', stages: ['contender', 'elite'], title: 'Words at the net',
    text: 'You beat someone you have never liked, and the handshake was three seconds of something the cameras caught. A reporter asks you about it while you are still sweating.',
    choices: [
      { label: 'Fan the flames', detail: 'Say what you actually think.',
        fx: { fame: 10, attrs: { mental: -1 } },
        outcome: 'The rivalry sells out arenas for six years. It also lives in your head at 4–5 in the third.' },
      { label: 'Defuse it', detail: 'Praise him and change the subject.',
        fx: { fame: -1, attrs: { mental: 2 } },
        outcome: 'The story dies. He sends a message that evening, and the next time you play it is only tennis.' }
    ] },
  { id: 'parents-house', stages: ['contender', 'elite'], title: 'The house on the hill',
    text: 'Your parents still live in the house you grew up in, with the garage door you hit a thousand balls against. You can now buy them any house they want.',
    choices: [
      { label: 'Buy it for them', detail: 'They will refuse, then accept.',
        fx: { cash: -1400000, fame: 3, attrs: { mental: 3 } },
        outcome: 'Your father walks around it for an hour without speaking. It is the best money you ever spend.' },
      { label: 'Pay off their mortgage', detail: 'Quieter, and what they actually asked for.',
        fx: { cash: -320000, attrs: { mental: 2 } },
        outcome: 'They stay in the house with the garage door. Everyone is happier this way.' }
    ] },

  /* ---------------- elite ---------------- */
  { id: 'mega-deal', stages: ['elite'], title: 'An apparel contract',
    text: 'The number in front of you is larger than everything you have won in your career. It comes with eighteen commercial days a year.',
    choices: [
      { label: 'Sign it', detail: 'Life-changing money, real obligations.',
        fx: { cash: 9000000, fame: 18, fatigue: 14, attrs: { stamina: -1 } },
        outcome: 'You are on a building in Tokyo. You are also on a plane far more often than your physio would like.' },
      { label: 'Negotiate it down', detail: 'Half the money, half the days.',
        fx: { cash: 4000000, fame: 9, fatigue: 4 },
        outcome: 'Your agent calls it the most expensive lie-in in history. You win a major that year.' }
    ] },
  { id: 'foundation', stages: ['elite'], title: 'Start a foundation',
    text: 'You want to put courts and coaching into the kind of place you came from. Doing it properly means money and, more expensively, your time.',
    choices: [
      { label: 'Fund it properly', detail: 'Endow it and show up.',
        fx: { cash: -2600000, fame: 12, attrs: { mental: 3 } },
        outcome: 'Four courts, two coaches and a minibus. Eleven years later one of those kids makes the top 100.' },
      { label: 'Lend your name', detail: 'Others run it, you appear twice a year.',
        fx: { cash: -400000, fame: 6, attrs: { mental: 1 } },
        outcome: 'It does real good and you are honest with yourself about how much of it is yours.' }
    ] },
  { id: 'olympic-year', stages: ['elite', 'contender'], title: 'The Olympic question',
    text: 'The Games fall three weeks before the last major of the year, on a different surface, on the other side of the world. Half the top ten are skipping it.',
    choices: [
      { label: 'Go', detail: 'Play for the flag.',
        fx: { fatigue: 20, fame: 14, attrs: { mental: 2 } },
        outcome: 'You march behind your flag with a swimmer on either side. Whatever happens in New York, you went.' },
      { label: 'Skip it', detail: 'Protect the major.',
        fx: { fatigue: -14, fame: -6, form: 0.02 },
        outcome: 'The federation is unhappy in public and understanding in private. You arrive fresh and it shows.' }
    ] },
  { id: 'documentary', stages: ['elite'], title: 'A camera in the corridor',
    text: 'A streaming service wants a full season of access — the practice courts, the team meetings, the ten minutes after you lose.',
    choices: [
      { label: 'Full access', detail: 'Let them film everything.',
        fx: { cash: 2200000, fame: 20, attrs: { mental: -1 } },
        outcome: 'It is very good television. There is footage of the worst night of your career and you agreed to it.' },
      { label: 'Matches only', detail: 'Nothing behind the door.',
        fx: { cash: 700000, fame: 8 },
        outcome: 'They make something decent and slightly bloodless. Your locker room stays yours.' }
    ] },
  { id: 'burnout', stages: ['elite', 'contender'], title: 'Empty',
    text: 'You won last week and felt nothing at all. You have played thirty-one weeks this year and the thought of the Asian swing makes you want to lie down.',
    choices: [
      { label: 'Pull out of the swing', detail: 'Go home for a month.',
        fx: { fatigue: -35, fame: -4, attrs: { mental: 3 } },
        outcome: 'You do not touch a racquet for eighteen days. You come back wanting it, which had stopped being true.' },
      { label: 'Push through', detail: 'Finish the year as planned.',
        fx: { fatigue: 22, form: -0.03, attrs: { mental: -1 } },
        outcome: 'You get the points and end the year hollow. Something about the sport goes quiet for a while.' }
    ] },

  /* ---------------- veteran ---------------- */
  { id: 'the-body', stages: ['veteran'], title: 'What the specialist says',
    text: 'The scan is not catastrophic and it is not good. His recommendation is twelve events a year instead of twenty-two, and he says it in the tone of someone who has had this conversation before.',
    choices: [
      { label: 'Cut the schedule', detail: 'Majors and the biggest events only.',
        fx: { fatigue: -30, fame: -3, attrs: { stamina: 1, mental: 2 } },
        outcome: 'You rank lower and arrive at every major able to play five sets. It buys you three more years.' },
      { label: 'Keep the full calendar', detail: 'Play while you still can.',
        fx: { fatigue: 18, attrs: { stamina: -2, movement: -1 } },
        outcome: 'You get a full last chapter instead of a careful one, and you pay for it in the mornings.' }
    ] },
  { id: 'mentoring', stages: ['veteran', 'elite'], title: 'The kid on the practice court',
    text: 'An eighteen-year-old from your own country has been hitting with you all week. He asks, badly and directly, whether you would keep doing it.',
    choices: [
      { label: 'Take him on', detail: 'Hit with him, travel with him.',
        fx: { fame: 4, attrs: { mental: 3, net: 1 } },
        outcome: 'Explaining it out loud makes you better at it. He beats you in two years and thanks you at the net.' },
      { label: 'Stay focused', detail: 'You have your own season to play.',
        fx: { form: 0.02 },
        outcome: 'The right call for your ranking. You watch his first main draw on a phone in an airport.' }
    ] },
  { id: 'commentary', stages: ['veteran'], title: 'The booth',
    text: 'A broadcaster offers you a commentary contract starting whenever you want it. It is a soft landing and everyone can see it.',
    choices: [
      { label: 'Sign for after', detail: 'Take it, starting the day you retire.',
        fx: { cash: 900000, fame: 6, attrs: { mental: 2 } },
        outcome: 'Knowing what happens next makes the last two years lighter rather than shorter.' },
      { label: 'Not yet', detail: 'Do not plan the ending.',
        fx: { attrs: { mental: 1 } },
        outcome: 'You are still a tennis player and not a man deciding when to stop being one.' }
    ] },
  { id: 'one-more-year', stages: ['veteran'], title: 'One more year?',
    text: 'Your team, your family and your body all have an opinion, and none of them agree. There is a version of this where you stop at the end of the season.',
    choices: [
      { label: 'Commit to another', detail: 'Full pre-season, full schedule.',
        fx: { fatigue: 10, fame: 3, attrs: { mental: 2, stamina: 1 } },
        outcome: 'Deciding is the whole thing. You play the next twelve months lighter than the last twelve.' },
      { label: 'Play it week to week', detail: 'Decide nothing, enter everything.',
        fx: { form: -0.02, attrs: { mental: -1 } },
        outcome: 'The question follows you into every press conference and every changeover for a year.' }
    ] },

  /* ---------------- any stage ---------------- */
  { id: 'frame-change', stages: ['grinder', 'regular', 'contender'], title: 'A heavier frame',
    text: 'Your stringer thinks you are under-gunned against the top guys and wants you in something heavier. It will feel wrong for months.',
    choices: [
      { label: 'Make the change', detail: 'Wear the bad months.',
        fx: { form: -0.03, attrs: { serve: 2, forehand: 1 } },
        outcome: 'Awful until March, then the serve starts arriving somewhere it never used to.' },
      { label: 'Stay as you are', detail: 'You know what you have.',
        fx: { form: 0.02 },
        outcome: 'No disruption, no upside. You keep losing the same way to the same players.' }
    ] },
  { id: 'the-approach', stages: ['grinder', 'regular'], title: 'A number you did not save',
    text: 'A man you half-recognise from the players’ hotel asks, very casually, what it would take for a first set to go a certain way.',
    choices: [
      { label: 'Report it', detail: 'Integrity unit, tonight, in writing.',
        fx: { fame: 3, attrs: { mental: 3 } },
        outcome: 'A long evening of statements. Two years later you read that he was banned from every tour.' },
      { label: 'Walk away', detail: 'Say nothing to anyone.',
        fx: { attrs: { mental: -1 } },
        outcome: 'You never see him again and you think about the players who did not say no.' }
    ] },
  { id: 'travel-chaos', stages: ['rookie', 'grinder', 'regular', 'contender', 'elite', 'veteran'], title: 'Thirty-one hours',
    text: 'A cancellation, a rerouting and a lost racquet bag. You land four hours before your first-round match with borrowed frames.',
    choices: [
      { label: 'Ask for a delay', detail: 'Referee might move you to the night session.',
        fx: { fatigue: 6, form: -0.01 },
        outcome: 'They move you. You sleep two hours in the locker room and it is nearly enough.' },
      { label: 'Play on borrowed frames', detail: 'Wrong tension, right attitude.',
        fx: { fatigue: 12, attrs: { mental: 2 } },
        outcome: 'You win in three ugly sets and never complain about equipment again.' }
    ] },
  { id: 'the-letter', stages: ['regular', 'contender', 'elite', 'veteran'], title: 'A letter forwarded by the tour',
    text: 'A boy in a country you have never played in has written to say he started playing because of a match of yours he watched on a phone.',
    choices: [
      { label: 'Write back properly', detail: 'By hand, with a signed shirt.',
        fx: { fame: 2, attrs: { mental: 2 } },
        outcome: 'He writes again every year. You keep all of them in the same drawer.' },
      { label: 'Have the team handle it', detail: 'A standard reply and a signed card.',
        fx: { fame: 1 },
        outcome: 'He gets something in the post with your name on it, which is more than most people get.' }
    ] }
];

if (typeof module !== 'undefined') {
  module.exports = { ATTRS, ATTR_KEYS, SURFACES, TOUR_RAW, POOL_RAW, PTS, PRIZE_BY_CAT, PRIZE_DEFAULT,
    CALENDAR, ROUND_NAMES_32, COUNTRIES, FIRST_NAMES, LAST_NAMES, LIFESTYLE_CATALOG, LIFESTYLE_RESALE_PCT, TRIVIA,
    ERAS, eraById, ROOKIE_ROUTES, LIFE_STAGES, stageFor, LIFE_EVENTS };
}
