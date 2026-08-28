-- ============================================================
-- Seed: app content only (games registry, question/card/challenge/
-- prompt banks, achievement definitions, default rules). No fake
-- relationship data — memories/wishlist/places/fights start empty.
-- Meant to run once against a fresh database: games/achievements are
-- deduped by slug, but game_questions/truth_dare_prompts/challenges/
-- cards/rules have no natural unique key, so re-running this file
-- will duplicate those rows.
-- ============================================================

insert into public.games (slug, name, description, icon) values
  ('guess_me', 'Guess Me', 'Answer what you think the other would say — see if you''re in sync.', 'Sparkles'),
  ('this_or_that', 'This or That', 'Simultaneous picks. Same wavelength, or time to talk it out.', 'SplitSquareHorizontal'),
  ('two_truths', 'Two Truths & a Lie', 'Three statements, one lie. Can they catch it?', 'Fingerprint'),
  ('draw_together', 'Draw Together', 'Same prompt, two canvases, one reveal.', 'Paintbrush'),
  ('card_game', 'Card Game', 'Draw a card. Funny, deep, flirty, or wild.', 'Layers'),
  ('random_challenge', 'Random Challenge', 'A small dare for right now.', 'Dice5'),
  ('truth_or_dare', 'Truth or Dare', 'Classic, with levels — cute to bold.', 'Flame')
on conflict (slug) do nothing;

-- GUESS ME + THIS OR THAT questions share game_questions, split by game_id.
with g as (select id, slug from public.games where slug in ('guess_me','this_or_that'))
insert into public.game_questions (game_id, category, prompt, is_custom)
select id, category, prompt, false from (
  values
  ('guess_me','funny','What''s the silliest thing I get unreasonably competitive about?'),
  ('guess_me','personality','Am I more of a morning person or a night owl?'),
  ('guess_me','preferences','What''s my go-to comfort food?'),
  ('guess_me','relationship','What''s the first thing I noticed about you?'),
  ('guess_me','deep','What do I think is my biggest fear right now?'),
  ('guess_me','random','If I could teleport anywhere right now, where would I go?'),
  ('guess_me','personality','Am I an introvert or an extrovert on a bad day?'),
  ('guess_me','preferences','What''s my least favorite chore?'),
  ('guess_me','relationship','What do I think you love most about us?'),
  ('guess_me','funny','What''s my most-used emoji?')
) as t(gs, category, prompt)
join g on g.slug = t.gs;

with g as (select id, slug from public.games where slug = 'this_or_that')
insert into public.game_questions (game_id, category, prompt, is_custom)
select id, category, prompt, false from (
  values
  ('food','Sweet or savory?'),
  ('travel','Beach or mountains?'),
  ('personality','Plan everything or wing it?'),
  ('lifestyle','Early mornings or late nights?'),
  ('funny','Cats or dogs?'),
  ('romantic','Slow dance or dance party?'),
  ('deep','Say what you mean or read between the lines?'),
  ('random','Books or movies?'),
  ('food','Coffee or tea?'),
  ('travel','City trip or nature retreat?'),
  ('romantic','Love letters or love songs?'),
  ('lifestyle','Big party or small dinner?')
) as t(category, prompt)
join g on true;

insert into public.truth_dare_prompts (type, level, prompt) values
  ('truth','cute','What''s a small thing I do that makes you smile?'),
  ('truth','cute','What''s your favorite memory of us so far?'),
  ('truth','funny','What''s the most ridiculous thing you''ve done to get my attention?'),
  ('truth','funny','What''s a weird habit of mine you secretly love?'),
  ('truth','deep','What''s something you''ve never told me because it felt too vulnerable?'),
  ('truth','deep','What do you need from me on your hardest days?'),
  ('truth','flirty','What was your first genuinely attracted-to-me moment?'),
  ('truth','flirty','What''s something you find irresistible about me?'),
  ('truth','bold','What''s a fear about us you''ve never said out loud?'),
  ('dare','cute','Send me a voice note saying something you appreciate about me.'),
  ('dare','cute','Describe our relationship in exactly three words.'),
  ('dare','funny','Do your best impression of me for the next minute.'),
  ('dare','funny','Text me the most dramatic version of what you had for breakfast.'),
  ('dare','deep','Tell me one way I''ve helped you grow.'),
  ('dare','flirty','Send the cheesiest compliment you can think of.'),
  ('dare','flirty','Describe our perfect night in.'),
  ('dare','bold','Share the last thing that made you cry.'),
  ('dare','bold','Tell me something you''ve been putting off telling me.')
;

insert into public.challenges (category, prompt) values
  ('funny','Take a photo of something directly in front of you, no cheating.'),
  ('funny','Describe your day in exactly three words.'),
  ('creative','Find something in your room that reminds you of the other person.'),
  ('creative','Write a two-line poem about us, right now.'),
  ('romantic','Send a photo from the day you two met, or one that feels like it.'),
  ('romantic','Tell them one thing you''re grateful for about them today.'),
  ('random','Send the last song you listened to and why.'),
  ('random','Do 10 jumping jacks and send proof.'),
  ('competitive','Whoever replies with the better pun in the next 2 minutes wins.'),
  ('competitive','Name 5 movies in 30 seconds. Loser buys snacks next time.'),
  ('flirty','Send the emoji combo that best describes how you feel about them.'),
  ('flirty','Say one thing you find attractive about them that you don''t say enough.')
;

insert into public.cards (category, prompt) values
  ('funny','What''s the weirdest dream you''ve had about me?'),
  ('funny','Do an impression of how I react when I''m hangry.'),
  ('deep','What''s something you''ve wanted to tell me but never found the right moment?'),
  ('deep','What does "home" mean to you?'),
  ('romantic','What''s your favorite version of "us"?'),
  ('romantic','Plan our next date, out loud, right now.'),
  ('flirty','What first made you want to get to know me?'),
  ('flirty','Send the funniest photo currently in your gallery.'),
  ('random','Choose our next food adventure.'),
  ('random','Pick a song that describes this week for you.'),
  ('challenge','Text a photo of your current view.'),
  ('challenge','Give a genuine compliment you don''t usually say.'),
  ('wild','What''s the boldest thing you''d want us to try together?'),
  ('wild','Describe your ideal spontaneous weekend for us.')
;

insert into public.achievements (slug, name, description, icon, criteria) values
  ('first_win', 'First Win', 'Won a game for the first time.', 'Trophy', '{"type":"wins","count":1}'),
  ('win_streak', 'Win Streak', 'Won three games in a row.', 'Flame', '{"type":"streak","count":3}'),
  ('mind_reader', 'Mind Reader', 'Matched answers five times in Guess Me.', 'Brain', '{"type":"guess_me_matches","count":5}'),
  ('professional_menace', 'Professional Menace', 'Completed 10 dares.', 'Zap', '{"type":"dares_completed","count":10}'),
  ('drawing_disaster', 'Drawing Disaster', 'Finished a Draw Together round — no judgment.', 'Paintbrush', '{"type":"drawings","count":1}'),
  ('perfect_match', 'Perfect Match', 'Agreed on 10 This or That rounds.', 'Heart', '{"type":"this_or_that_matches","count":10}'),
  ('ten_games', '10 Games Played', 'Played 10 games together.', 'Gamepad2', '{"type":"games_played","count":10}'),
  ('twentyfive_games', '25 Games Played', 'Played 25 games together.', 'Gamepad2', '{"type":"games_played","count":25}')
on conflict (slug) do nothing;

insert into public.rules (order_index, text, added_by) values
  (1, 'We''re on the same team.', null),
  (2, 'The problem is the problem, not each other.', null),
  (3, 'We talk to understand, not to win.', null),
  (4, 'We don''t use old fights as ammunition.', null),
  (5, 'We give each other space without making each other feel abandoned.', null),
  (6, 'We celebrate each other''s wins.', null),
  (7, 'We keep choosing each other.', null),
  (8, 'We''re allowed to change the rules as we grow.', null)
on conflict do nothing;
