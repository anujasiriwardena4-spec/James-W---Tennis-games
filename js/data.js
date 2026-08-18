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
  ['Jannik Sinner',        'ITA', 'R', 2, 88, 93, 96, 92, 90, 82, 92, 94],
  ['Carlos Alcaraz',       'ESP', 'R', 2, 87, 96, 88, 90, 96, 90, 92, 92],
  ['Novak Djokovic',       'SRB', 'R', 2, 86, 90, 97, 97, 94, 86, 93, 97],
  ['Alexander Zverev',     'GER', 'R', 1, 92, 86, 91, 88, 84, 76, 88, 78],
  ['Daniil Medvedev',      'RUS', 'R', 2, 88, 85, 90, 94, 90, 72, 94, 82],
  ['Taylor Fritz',         'USA', 'R', 2, 93, 90, 82, 80, 80, 78, 84, 80],
  ['Jack Draper',          'GBR', 'L', 2, 90, 90, 85, 84, 82, 78, 78, 82],
  ['Casper Ruud',          'NOR', 'R', 2, 82, 91, 84, 84, 86, 74, 88, 82],
  ['Holger Rune',          'DEN', 'R', 2, 86, 89, 86, 85, 87, 80, 82, 76],
  ['Alex de Minaur',       'AUS', 'R', 2, 76, 82, 85, 89, 97, 80, 92, 86],
  ['Lorenzo Musetti',      'ITA', 'R', 1, 82, 86, 93, 82, 88, 86, 78, 78],
  ['Ben Shelton',          'USA', 'L', 2, 95, 88, 78, 76, 84, 82, 82, 80],
  ['Andrey Rublev',        'RUS', 'R', 2, 87, 93, 82, 82, 80, 70, 84, 62],
  ['Stefanos Tsitsipas',   'GRE', 'R', 1, 88, 91, 78, 78, 86, 88, 86, 76],
  ['Grigor Dimitrov',      'BUL', 'R', 1, 86, 89, 88, 82, 88, 88, 80, 76],
  ['Tommy Paul',           'USA', 'R', 2, 84, 86, 84, 84, 90, 82, 86, 84],
  ['Frances Tiafoe',       'USA', 'R', 2, 86, 86, 78, 82, 90, 84, 82, 78],
  ['Hubert Hurkacz',       'POL', 'R', 2, 95, 84, 78, 74, 78, 86, 80, 76],
  ['Felix Auger-Aliassime','CAN', 'R', 2, 91, 88, 82, 80, 86, 84, 84, 74],
  ['Karen Khachanov',      'RUS', 'R', 2, 89, 88, 84, 82, 78, 74, 84, 78],
  ['Ugo Humbert',          'FRA', 'L', 1, 88, 86, 88, 80, 84, 82, 78, 76],
  ['Arthur Fils',          'FRA', 'R', 2, 87, 89, 82, 80, 88, 78, 82, 80],
  ['Jakub Mensik',         'CZE', 'R', 2, 93, 86, 82, 76, 80, 78, 78, 78],
  ['Joao Fonseca',         'BRA', 'R', 2, 88, 93, 84, 78, 84, 76, 78, 82],
  ['Tomas Machac',         'CZE', 'R', 2, 84, 86, 86, 84, 90, 80, 82, 78],
  ['Jiri Lehecka',         'CZE', 'R', 2, 89, 88, 84, 78, 80, 78, 80, 76],
  ['Sebastian Korda',      'USA', 'R', 2, 87, 88, 86, 80, 84, 80, 78, 72],
  ['Alexei Popyrin',       'AUS', 'R', 2, 91, 86, 78, 76, 80, 78, 78, 74],
  ['Alexander Bublik',     'KAZ', 'R', 1, 94, 84, 76, 74, 76, 86, 72, 64],
  ['Denis Shapovalov',     'CAN', 'L', 1, 90, 86, 84, 76, 84, 84, 76, 68],
  ['Matteo Berrettini',    'ITA', 'R', 2, 94, 92, 72, 74, 76, 84, 78, 78],
  ['Francisco Cerundolo',  'ARG', 'R', 2, 80, 91, 78, 80, 84, 70, 84, 74],
  ['Nicolas Jarry',        'CHI', 'R', 1, 92, 88, 76, 74, 76, 76, 80, 70],
  ['Sebastian Baez',       'ARG', 'R', 2, 72, 84, 80, 84, 90, 68, 88, 78],
  ['Tallon Griekspoor',    'NED', 'R', 2, 88, 86, 80, 76, 80, 76, 80, 72],
  ['Flavio Cobolli',       'ITA', 'R', 2, 84, 86, 84, 80, 86, 74, 82, 78],
  ['Brandon Nakashima',    'USA', 'R', 2, 84, 84, 86, 82, 86, 76, 84, 80],
  ['Jordan Thompson',      'AUS', 'R', 2, 84, 80, 82, 80, 84, 88, 84, 80],
  ['Alejandro Davidovich', 'ESP', 'R', 1, 80, 86, 84, 84, 90, 82, 82, 66],
  ['Daniel Altmaier',      'GER', 'R', 2, 80, 84, 84, 82, 84, 72, 86, 76],
  ['Roberto Bautista Agut','ESP', 'R', 2, 76, 84, 86, 86, 84, 72, 88, 88],
  ['Zhizhen Zhang',        'CHN', 'R', 2, 89, 86, 78, 76, 78, 74, 78, 72],
  ['Gael Monfils',         'FRA', 'R', 2, 88, 86, 82, 84, 94, 78, 76, 70],
  ['Stan Wawrinka',        'SUI', 'R', 1, 88, 88, 95, 78, 74, 78, 76, 84],
  ['Marin Cilic',          'CRO', 'R', 2, 92, 88, 84, 76, 74, 76, 78, 78],
  ['Adrian Mannarino',     'FRA', 'L', 2, 78, 78, 86, 84, 82, 80, 82, 76],
  ['Yoshihito Nishioka',   'JPN', 'L', 2, 70, 80, 82, 86, 92, 70, 86, 78],
  ['Botic van de Zandschulp','NED','R', 2, 84, 82, 82, 82, 82, 76, 82, 74]
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

if (typeof module !== 'undefined') {
  module.exports = { ATTRS, ATTR_KEYS, SURFACES, TOUR_RAW, POOL_RAW, PTS, CALENDAR, ROUND_NAMES_32, COUNTRIES, FIRST_NAMES, LAST_NAMES };
}
