// Hand-authored types mirroring supabase/migrations/*.sql.
// Once the project is linked, prefer regenerating with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts

export type PlaceCategory = "been_here" | "want_to_go" | "special_place" | "next_trip";
export type WishlistCategory = "places" | "food" | "movies_shows" | "things_to_do" | "experiences" | "someday";
export type WishlistStatus = "to_do" | "in_progress" | "done";
export type WishlistPriority = "low" | "medium" | "high";
export type GameSlug =
  | "guess_me"
  | "this_or_that"
  | "two_truths"
  | "draw_together"
  | "card_game"
  | "random_challenge"
  | "truth_or_dare";
export type GameSessionStatus = "waiting" | "active" | "locked" | "revealed" | "completed" | "abandoned";
export type FightStatus = "unresolved" | "discussing" | "resolved";
export type FightFeeling = "Hurt" | "Angry" | "Sad" | "Anxious" | "Ignored" | "Disappointed" | "Misunderstood" | "Insecure" | "Overwhelmed" | "Other";
export type FightNeed = "Reassurance" | "Understanding" | "Space" | "Communication" | "Appreciation" | "Clarity" | "Time" | "Other";
export type LittleThingCategory = "just_because" | "open_when_miss_me" | "open_when_bad_day" | "open_when_need_motivation" | "open_when_cant_sleep";
export type TruthDareType = "truth" | "dare";
export type TruthDareLevel = "cute" | "funny" | "deep" | "flirty" | "bold";
export type TruthDareStatus = "pending" | "completed" | "skipped";

export type Profile = {
  id: string;
  username: "shab" | "soumya";
  display_name: string;
  avatar_path: string | null;
  status: string | null;
  bio: string | null;
  birthday: string | null;
  is_online: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ActivityLogEntry = {
  id: string;
  actor_id: string | null;
  action_type: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: PlaceCategory;
  description: string | null;
  notes: string | null;
  place_date: string | null;
  added_by: string;
  visited: boolean;
  visited_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaceMedia = {
  id: string;
  place_id: string;
  storage_path: string;
  created_at: string;
}

export type WishlistItem = {
  id: string;
  title: string;
  description: string | null;
  category: WishlistCategory;
  added_by: string;
  priority: WishlistPriority;
  status: WishlistStatus;
  image_path: string | null;
  location: string | null;
  completed_at: string | null;
  saved_to_memories: boolean;
  created_at: string;
  updated_at: string;
}

export type Memory = {
  id: string;
  caption: string | null;
  memory_date: string;
  location: string | null;
  added_by: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type MemoryMedia = {
  id: string;
  memory_id: string;
  storage_path: string;
  media_type: "image" | "video";
  width: number | null;
  height: number | null;
  created_at: string;
}

export type Game = {
  id: string;
  slug: GameSlug;
  name: string;
  description: string;
  icon: string;
}

export type GameSession = {
  id: string;
  game_id: string;
  status: GameSessionStatus;
  category: string | null;
  custom_question: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type GamePlayer = {
  id: string;
  session_id: string;
  user_id: string;
  is_ready: boolean;
  joined_at: string;
}

export type GameQuestion = {
  id: string;
  game_id: string | null;
  category: string;
  prompt: string;
  target_user_id: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export type GameAnswer = {
  id: string;
  session_id: string;
  question_id: string | null;
  user_id: string;
  answer: string;
  locked_at: string;
  created_at: string;
}

export type GameResult = {
  id: string;
  session_id: string;
  is_match: boolean | null;
  winner_id: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

export type TtalStatement = {
  id: string;
  session_id: string;
  statement_order: number;
  statement: string;
  is_lie: boolean;
  created_by: string;
}

export type TtalGuess = {
  id: string;
  session_id: string;
  guesser_id: string;
  guessed_statement_id: string;
  is_correct: boolean;
  created_at: string;
}

export type Drawing = {
  id: string;
  session_id: string;
  user_id: string;
  storage_path: string;
  submitted_at: string;
  saved_to_memories: boolean;
}

export type TruthDarePrompt = {
  id: string;
  type: TruthDareType;
  level: TruthDareLevel;
  prompt: string;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export type TruthDareRound = {
  id: string;
  session_id: string;
  player_turn: string;
  prompt_id: string | null;
  custom_text: string | null;
  type: TruthDareType;
  status: TruthDareStatus;
  created_at: string;
  completed_at: string | null;
}

export type Challenge = {
  id: string;
  category: string;
  prompt: string;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export type ChallengeCompletion = {
  id: string;
  challenge_id: string;
  user_id: string;
  status: "completed" | "skipped";
  completed_at: string;
}

export type CardItem = {
  id: string;
  category: string;
  prompt: string;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export type CardDraw = {
  id: string;
  card_id: string;
  drawn_by: string;
  note: string | null;
  completed_at: string;
}

export type Fight = {
  id: string;
  fight_number: number;
  title: string;
  what_happened: string | null;
  actual_issue: string | null;
  what_to_do_differently: string | null;
  what_we_learned: string | null;
  status: FightStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export type FightPerspective = {
  id: string;
  fight_id: string;
  user_id: string;
  feelings: string[];
  needs: string[];
  perspective: string;
  other_perspective_guess: string | null;
  submitted_at: string;
}

export type FightResolution = {
  id: string;
  fight_id: string;
  user_id: string;
  felt_heard: boolean;
  understood_perspective: boolean;
  know_next_steps: boolean;
  confirmed_at: string;
}

export type LittleThing = {
  id: string;
  from_user: string;
  category: LittleThingCategory;
  message: string;
  image_path: string | null;
  voice_path: string | null;
  reveal_at: string | null;
  opened_at: string | null;
  created_at: string;
}

export type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  criteria: Record<string, unknown>;
}

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export type Rule = {
  id: string;
  order_index: number;
  text: string;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

type TableDef<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<Profile>;
      activity_log: TableDef<ActivityLogEntry>;
      places: TableDef<Place>;
      place_media: TableDef<PlaceMedia>;
      wishlist_items: TableDef<WishlistItem>;
      memories: TableDef<Memory>;
      memory_media: TableDef<MemoryMedia>;
      games: TableDef<Game>;
      game_sessions: TableDef<GameSession>;
      game_players: TableDef<GamePlayer>;
      game_questions: TableDef<GameQuestion>;
      game_answers: TableDef<GameAnswer>;
      game_results: TableDef<GameResult>;
      ttal_statements: TableDef<TtalStatement>;
      ttal_guesses: TableDef<TtalGuess>;
      drawings: TableDef<Drawing>;
      truth_dare_prompts: TableDef<TruthDarePrompt>;
      truth_dare_rounds: TableDef<TruthDareRound>;
      challenges: TableDef<Challenge>;
      challenge_completions: TableDef<ChallengeCompletion>;
      cards: TableDef<CardItem>;
      card_draws: TableDef<CardDraw>;
      fights: TableDef<Fight>;
      fight_perspectives: TableDef<FightPerspective>;
      fight_resolutions: TableDef<FightResolution>;
      little_things: TableDef<LittleThing>;
      achievements: TableDef<Achievement>;
      user_achievements: TableDef<UserAchievement>;
      rules: TableDef<Rule>;
    };
    Views: Record<string, never>;
    Functions: {
      log_activity: {
        Args: {
          p_action_type: string;
          p_description: string;
          p_target_type?: string | null;
          p_target_id?: string | null;
          p_metadata?: Record<string, unknown>;
        };
        Returns: undefined;
      };
      touch_presence: {
        Args: { p_online: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
  };
}
