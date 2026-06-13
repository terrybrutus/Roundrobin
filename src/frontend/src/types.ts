export interface OddsData {
  key: string;
  active: boolean;
  group: string;
  title: string;
  description: string;
  sport_title: string;
}

export interface Market {
  key: string;
  last_update: string;
  outcomes: Outcome[];
}

export interface Outcome {
  name: string;
  price: number;
  point?: number;
}

export interface Bookmaker {
  key: string;
  title: string;
  last_update: string;
  link?: string;
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
  sport: string;
  game: string;
  market: string;
  selection: string;
  odds: number;
  link?: string;
  marketType?: string;
  oppositeOdds?: number;
}
