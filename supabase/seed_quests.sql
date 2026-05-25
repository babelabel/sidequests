-- ===========================================================
-- Sidequest — Hungary/Budapest seed quests
-- Run AFTER schema.sql in Supabase SQL editor.
-- ===========================================================

insert into quest_templates (title, description, category, mode, difficulty, rarity, xp_reward, estimated_minutes, location_hint, tags, weather_pref) values

-- ADVENTURE
('Margitsziget körbefutás', 'Run a full lap of Margaret Island (5.3 km). Bonus XP if you do it under 30 minutes.', 'fitness', 'solo', 'medium', 'common', 120, 45, 'Margitsziget, Budapest', array['outdoors','free','daytime','fitness'], 'sunny'),
('Budai vár éjszaka', 'Walk up to Buda Castle after 22:00. Take a panoramic photo from the bastion.', 'adventure', 'solo', 'easy', 'rare', 150, 60, 'Budai Várnegyed', array['nighttime','outdoors','free','photo','views'], 'any'),
('Villamos a végállomásig', 'Take any tram you have never been on to its terminus. Photograph what is there.', 'exploration', 'solo', 'easy', 'common', 80, 60, 'Bárhol Budapesten', array['transit','exploration','free','photo'], 'any'),
('Hidden lépcső', 'Find and climb a hidden staircase in the Buda hills (try around Gellérthegy or Sashegy). Pin the location.', 'exploration', 'solo', 'medium', 'rare', 110, 90, 'Buda hills', array['outdoors','free','hiking','exploration'], 'sunny'),
('Random BKV', 'Get on the next bus that arrives at your nearest stop. Ride exactly 5 stops. Get off. Find food within 200m.', 'adventure', 'solo', 'easy', 'common', 90, 60, 'Bárhol Budapesten', array['transit','spontaneous','food'], 'any'),
('Sunset a Citadellán', 'Be at the top of Gellérthegy for sunset. Watch the city turn gold.', 'adventure', 'solo', 'easy', 'common', 90, 60, 'Gellérthegy', array['outdoors','free','sunset','views','photo'], 'sunny'),
('Pest-Buda híd-túra', 'Walk across all the Danube bridges in central Budapest in one day. There are 7 (excluding the railway bridges).', 'fitness', 'solo', 'hard', 'epic', 300, 240, 'Duna, Budapest', array['outdoors','free','daytime','fitness','exploration'], 'sunny'),
('Éjjeli bicikli', 'Rent a MOL Bubi at 23:00. Ride along the Duna for at least 30 minutes.', 'adventure', 'solo', 'medium', 'rare', 130, 60, 'Duna-part', array['nighttime','cheap','fitness'], 'any'),

-- SOCIAL
('Random kávé', 'Strike up a 5-minute genuine conversation with a stranger at a kávézó. No phones during it.', 'social', 'solo', 'medium', 'rare', 100, 30, 'Bármelyik kávézó', array['social','indoors','cheap'], 'any'),
('Csapatlángos', 'With 3+ friends: find the best lángos at any strand. Rate each one 1-10 collectively.', 'social', 'group', 'easy', 'common', 150, 90, 'Bármelyik strand', array['social','food','daytime','group_bonus'], 'sunny'),
('Régi barát', 'Message someone you have not talked to in 6+ months. Have a real conversation.', 'social', 'solo', 'easy', 'common', 70, 20, 'Anywhere', array['social','indoors','free'], 'any'),
('Fröccs túra', 'Try 3 different fröccs at 3 different teraszok in one afternoon. With at least one friend.', 'social', 'duo', 'medium', 'rare', 160, 180, 'Belváros vagy Buda terasz', array['social','drinks','daytime','duo'], 'sunny'),
('Új barát', 'Add someone to your contacts who you did not know before today. Real number, real plan to hang out.', 'social', 'solo', 'hard', 'rare', 140, 60, 'Anywhere', array['social','outdoors'], 'any'),
('Romkocsma kezdő', 'Visit a romkocsma you have never been to before. Try one signature drink.', 'social', 'duo', 'easy', 'common', 90, 90, 'VII. kerület', array['nighttime','social','indoors'], 'any'),
('Family time', 'Spend 2 uninterrupted hours with family. No phones. Cook or eat together.', 'social', 'solo', 'easy', 'common', 80, 120, 'Otthon', array['social','indoors','free'], 'any'),
('Csapat főzés', 'Cook a meal together with at least 2 friends. From scratch. Document the chaos.', 'social', 'group', 'medium', 'common', 140, 120, 'Anywhere with kitchen', array['social','indoors','food','creative','group_bonus'], 'any'),

-- CREATIVITY
('Polaroid pillanat', 'Take 3 photos that match a single color theme. Post them as a triptych.', 'creativity', 'solo', 'easy', 'common', 90, 45, 'Anywhere', array['photo','creative','free'], 'any'),
('Street art vadászat', 'Find 5 pieces of street art in the 7. or 8. kerület. Map them with photos.', 'creativity', 'solo', 'medium', 'common', 110, 90, 'VII. és VIII. kerület', array['photo','exploration','creative','daytime'], 'sunny'),
('Egy hely, egy óra', 'Pick a spot in Budapest. Sit there for one hour. Sketch, write, or photograph what you observe.', 'creativity', 'solo', 'easy', 'common', 100, 60, 'Bárhol', array['creative','solo_reflective','free'], 'any'),
('Reggel 7-kor', 'Wake up at 6:30 AM. Be somewhere photogenic by 7. Document the light.', 'creativity', 'solo', 'hard', 'rare', 140, 60, 'Anywhere', array['photo','morning','outdoors'], 'sunny'),
('Zenészi spontán', 'Find live street music somewhere in the city. Stay for at least 3 songs.', 'creativity', 'solo', 'easy', 'common', 80, 45, 'Belváros', array['social','music','daytime','free'], 'sunny'),

-- EXPLORATION
('Kerület hunt', 'Step foot in 3 kerületek in one day that you usually never visit.', 'exploration', 'solo', 'medium', 'common', 110, 180, 'Budapest', array['exploration','transit','daytime'], 'any'),
('Új piac', 'Visit a piac you have never been to. Buy one thing under 1000 Ft.', 'exploration', 'solo', 'easy', 'common', 80, 60, 'Bármelyik piac', array['exploration','cheap','food','daytime'], 'any'),
('Régi metróvonal', 'Ride the M1 (yellow line) from end to end. Get off at one random stop and explore for 20 min.', 'exploration', 'solo', 'easy', 'common', 90, 90, 'M1 vonal', array['transit','exploration','cheap'], 'any'),
('Kávézó vadász', 'Find a kávézó you have never been to. Order something other than what you usually order.', 'exploration', 'solo', 'easy', 'common', 70, 60, 'Anywhere', array['indoors','cheap','food'], 'any'),
('Könyvtár nap', 'Spend 2 hours at a library you have never been to. Read something random.', 'exploration', 'solo', 'medium', 'common', 100, 120, 'Bármelyik könyvtár', array['indoors','free','solo_reflective'], 'rainy_ok'),
('Lost in Buda', 'Get off transit on the Buda side. Walk for 1 hour in a direction you have never gone. No maps.', 'exploration', 'solo', 'medium', 'rare', 130, 90, 'Buda', array['outdoors','exploration','solo_reflective'], 'sunny'),
('Múzeum tour', 'Visit a museum you have never been to. Stay at least 45 minutes.', 'exploration', 'solo', 'easy', 'common', 100, 60, 'Anywhere', array['indoors','culture','daytime'], 'rainy_ok'),

-- NIGHTTIME / RARE
('Budapest éjszaka', 'Be on a Danube bridge at exactly midnight. Take a photo of the lit-up city.', 'adventure', 'solo', 'medium', 'rare', 130, 30, 'Bármelyik Duna-híd', array['nighttime','photo','free'], 'any'),
('Tetőterasz', 'Find a rooftop terrace open to the public. Watch the sunset from above.', 'adventure', 'duo', 'medium', 'rare', 140, 60, 'Belváros', array['nighttime','views','social','duo'], 'sunny'),
('Csillagok', 'Get out of the city far enough to see real stars. Spend at least 20 minutes looking up.', 'adventure', 'solo', 'hard', 'epic', 220, 180, 'City outskirts or HÉV-able destination', array['nighttime','outdoors','transit','solo_reflective'], 'any'),

-- FITNESS
('Reggeli futás', 'Run for at least 20 minutes before 8 AM.', 'fitness', 'solo', 'easy', 'common', 80, 30, 'Anywhere', array['fitness','morning','free'], 'sunny'),
('Mászás session', 'Go bouldering or climbing for at least 90 minutes. Project a route harder than your usual.', 'fitness', 'solo', 'medium', 'common', 130, 120, 'Bárhol mászóterem', array['indoors','fitness','climbing'], 'any'),
('Bringa Margit', 'Bike 3 full laps of Margitsziget. Track your time.', 'fitness', 'solo', 'medium', 'common', 110, 60, 'Margitsziget', array['outdoors','fitness','free'], 'sunny'),
('Strand & úszás', 'Swim at least 1km at any strand or pool.', 'fitness', 'solo', 'medium', 'common', 110, 60, 'Bármelyik strand', array['fitness','outdoors','daytime'], 'sunny'),
('Yoga in the park', 'Do 30 minutes of yoga or stretching outside in any park. Phone face-down.', 'fitness', 'solo', 'easy', 'common', 80, 30, 'Bármelyik park', array['outdoors','fitness','free','solo_reflective'], 'sunny'),

-- CHAOTIC / FUN
('Random restaurant roulette', 'Walk in a direction for 10 minutes. Eat at the first restaurant you pass. With a friend.', 'adventure', 'duo', 'easy', 'common', 100, 90, 'Anywhere', array['social','food','spontaneous','duo'], 'any'),
('Karaoke meglepetés', 'Sing karaoke. Public or private. With friends or alone. Just do it.', 'social', 'group', 'medium', 'rare', 150, 90, 'Karaoke bar', array['social','nighttime','group_bonus'], 'any'),
('No-Phone Lunch', 'Eat lunch with someone with both phones in another room. Just talk.', 'social', 'duo', 'easy', 'common', 90, 60, 'Anywhere', array['social','duo','free'], 'any'),
('Old-school játék', 'Play a board game or card game for at least an hour with 2+ people.', 'social', 'group', 'easy', 'common', 100, 90, 'Indoors', array['social','indoors','free','group_bonus'], 'rainy_ok'),
('Random language', 'Order something in Budapest in a language that is not Hungarian or English.', 'social', 'solo', 'medium', 'rare', 110, 30, 'Anywhere', array['social','daytime','language'], 'any'),

-- LEGENDARY (rare drops)
('Sunrise on Gellért', 'Be at the top of Gellérthegy for actual sunrise. Yes, that early.', 'adventure', 'solo', 'hard', 'legendary', 500, 90, 'Gellérthegy', array['outdoors','sunrise','views','solo_reflective'], 'sunny'),
('Balaton egy napra', 'Take an early train to Lake Balaton. Be back same day. Swim at least once.', 'adventure', 'duo', 'hard', 'legendary', 600, 720, 'Balaton', array['outdoors','daytrip','duo','transit'], 'sunny'),
('Egy teljes nap kamera nélkül', 'Spend a full day out — no phone photos. Live it. Write about it that night.', 'creativity', 'solo', 'hard', 'epic', 350, 720, 'Anywhere', array['creative','solo_reflective','no_phone'], 'any');
