export const heroSlides = [
  {
    label: 'VADODARA SPORTS COMMUNITY',
    title: 'PLAY THE GAME.\nOWN THE MOMENT.',
    text: 'Discover sports venues, join tournaments and connect with the sporting community of Vadodara.',
    ctaPrimary: 'Explore Sports',
    ctaSecondary: 'Join Now',
    primaryTarget: '#sports',
    secondaryTarget: '/login',
    image:
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80',
    accent: 'Cricket',
  },
  {
    label: 'FIND YOUR ARENA',
    title: 'YOUR NEXT MATCH\nSTARTS HERE.',
    text: 'Find football turfs across Vadodara and take your game from casual play to competitive action.',
    ctaPrimary: 'Find a Turf',
    ctaSecondary: 'Join Now',
    primaryTarget: '#turfs',
    secondaryTarget: '/login',
    image:
      'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1600&q=80',
    accent: 'Football',
  },
  {
    label: 'PLAY • CONNECT • COMPETE',
    title: 'A NEW WAY\nTO PLAY TOGETHER.',
    text: 'Discover pickleball venues and upcoming sports opportunities around Vadodara.',
    ctaPrimary: 'Explore Pickleball',
    ctaSecondary: 'Join Now',
    primaryTarget: '#sports',
    secondaryTarget: '/login',
    image:
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1600&q=80',
    accent: 'Pickleball',
  },
  {
    label: 'COMPETE IN VADODARA',
    title: "DON'T JUST PLAY.\nCOMPETE.",
    text: 'Discover upcoming tournaments, find your sport and become part of Vadodara\'s growing sports community.',
    ctaPrimary: 'Upcoming Tournaments',
    ctaSecondary: 'Join Now',
    primaryTarget: '/tournaments',
    secondaryTarget: '/login',
    image:
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1600&q=80',
    accent: 'Tournament',
  },
];

export const sports = [
  {
    id: 'cricket',
    name: 'Cricket',
    image:
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80',
    description: 'Competitive and recreational cricket tournaments and turf games.',
    icon: '🏏',
    href: '/login',
  },
  {
    id: 'football',
    name: 'Football',
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=900&q=80',
    description: 'Football matches, turf games and competitive tournaments.',
    icon: '⚽',
    href: '/login',
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    image:
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=900&q=80',
    description: 'Discover pickleball courts, games and upcoming competitions.',
    icon: '🏓',
    href: '/login',
  },
  {
    id: 'tennis',
    name: 'Tennis',
    image:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=900&q=80',
    description: 'Tennis activities and tournaments for players of different levels.',
    icon: '🎾',
    href: '/login',
  },
  {
    id: 'badminton',
    name: 'Badminton',
    image:
      'https://images.unsplash.com/photo-1626224583764-9f4d3f4d87ec?auto=format&fit=crop&w=900&q=80',
    description: 'Badminton games, events and tournament opportunities.',
    icon: '🏸',
    href: '/login',
  },
];

export const turfs = [
  {
    id: 'united-sports-arena',
    name: 'United Sports Arena',
    area: 'Alkapuri',
    sports: ['Cricket', 'Football'],
    facilities: ['Parking', 'Floodlights', 'Washroom'],
    openingHours: '6:00 AM – 11:00 PM',
    price: '₹550 / hour',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'turf-73',
    name: 'TURF 73',
    area: 'Akota',
    sports: ['Cricket', 'Football'],
    facilities: ['Parking', 'Floodlights', 'Locker Room'],
    openingHours: '7:00 AM – 10:30 PM',
    price: '₹650 / hour',
    image:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'the-turf-terra',
    name: 'The Turf Terra',
    area: 'Manjalpur',
    sports: ['Cricket', 'Football'],
    facilities: ['Parking', 'Floodlights', 'Cafeteria'],
    openingHours: '6:30 AM – 11:00 PM',
    price: '₹600 / hour',
    image:
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'amodar-boxcricket',
    name: 'Amodar BoxCricket & FootballTurf',
    area: 'Tarsali',
    sports: ['Cricket', 'Football'],
    facilities: ['Parking', 'Floodlights', 'Washroom'],
    openingHours: '6:00 AM – 11:00 PM',
    price: '₹500 / hour',
    image:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'goat-turf',
    name: 'G.O.A.T Turf',
    area: 'Nizampura',
    sports: ['Football', 'Cricket'],
    facilities: ['Parking', 'Floodlights', 'Washroom'],
    openingHours: '7:00 AM – 10:00 PM',
    price: '₹700 / hour',
    image:
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'big-shot-turf',
    name: 'The Big Shot Turf',
    area: 'Sayajigunj',
    sports: ['Cricket', 'Football'],
    facilities: ['Parking', 'Floodlights', 'Washroom'],
    openingHours: '6:00 AM – 11:00 PM',
    price: '₹750 / hour',
    image:
      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'huddle-arena',
    name: 'Huddle Arena',
    area: 'Karelibaug',
    sports: ['Pickleball', 'Tennis'],
    facilities: ['Parking', 'Air Conditioning', 'Washroom'],
    openingHours: '7:00 AM – 10:00 PM',
    price: '₹400 / hour',
    image:
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'athletes-arena',
    name: 'Athletes Arena Vadodara',
    area: 'Vadoara',
    sports: ['Badminton', 'Tennis'],
    facilities: ['Parking', 'Washroom', 'Refreshments'],
    openingHours: '6:00 AM – 10:30 PM',
    price: '₹420 / hour',
    image:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
  {
    id: 'seven-turf',
    name: '7EVEN TURF & CAFE',
    area: 'Harni',
    sports: ['Football', 'Cricket'],
    facilities: ['Parking', 'Cafeteria', 'Floodlights'],
    openingHours: '8:00 AM – 11:00 PM',
    price: '₹680 / hour',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    href: '/login',
  },
];

export const tournamentData = [
  {
    sport: 'Cricket',
    name: 'Vadodara Premier Cup',
    date: '18 OCT 2026',
    venue: 'United Sports Arena',
    location: 'Vadodara',
    format: 'T20 League',
    status: 'Open Registrations',
    href: '/tournaments',
  },
  {
    sport: 'Football',
    name: 'City League Invitational',
    date: '25 OCT 2026',
    venue: 'The Turf Terra',
    location: 'Vadodara',
    format: '7-a-side',
    status: 'Live Teams',
    href: '/tournaments',
  },
  {
    sport: 'Pickleball',
    name: 'VMC Pickleball Challenge',
    date: '02 NOV 2026',
    venue: 'Huddle Arena',
    location: 'Vadodara',
    format: 'Doubles',
    status: 'Register Soon',
    href: '/tournaments',
  },
  {
    sport: 'Badminton',
    name: 'Champions Weekend Open',
    date: '12 NOV 2026',
    venue: 'Athletes Arena Vadodara',
    location: 'Vadodara',
    format: 'Singles & Doubles',
    status: 'Open Spots',
    href: '/tournaments',
  },
];
