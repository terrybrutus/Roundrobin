export interface OddsData {
  key: string;
  active: boolean;
  group: string;
  title: string;
  description: string;
  sport_title: string;
}

export interface LinkData {
  link?: string;
  sid?: string;
}

export interface Market extends LinkData {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome extends LinkData {
  name: string;
  description?: string;
  price: number;
  point?: number;
}

export interface Bookmaker extends LinkData {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
}

export interface GameOdds {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
  markets?: Market[];
}

export interface Bet {
  id?: string;
  eventId?: string;
  sport: string;
  game: string;
  market: string;
  selection: string;
  description?: string;
  odds: number;
  point?: number;
  link?: string;
  marketType?: string;
  commenceTime?: string;
  lastUpdate?: string;
  isLive?: boolean;
}

export interface ApiUsage {
  used: number | null;
  remaining: number | null;
  last: number | null;
  updatedAt: string;
}

export interface OddsCache {
  bets: Bet[];
  fetchedAt: string;
  usage: ApiUsage;
}

export interface AppSettings {
  rememberKey: boolean;
  apiKey: string;
  bookmaker: string;
  markets: string[];
  customMarkets: string;
  timeWindowHours: number;
  cacheMinutes: number;
  liveFirst: boolean;
  todayFirst: boolean;
  requireDeepLink: boolean;
  propsMode: boolean;
  propEventLimit: number;
  bankroll: number;
  roundRobinSize: number;
}

export interface RoundRobinSet {
  id: string;
  bets: Bet[];
  createdAt: string;
  submitted: boolean;
}
