export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type MarketIdea = {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  image_url: string | null;
  resolution_criteria: string;
  resolution_type: 'date' | 'event';
  resolution_date: string | null;
  created_at: string;
  score: number;
  profiles?: Profile; // Joined creator profile
  market_options?: MarketOption[];
  user_vote?: number; // Virtual field for current user's vote
};

export type MarketOption = {
  id: string;
  market_id: string;
  name: string;
};

export type Vote = {
  id: string;
  user_id: string;
  market_id: string;
  vote_type: 1 | -1;
  created_at: string;
};
