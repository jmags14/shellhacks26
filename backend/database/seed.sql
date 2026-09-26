-- ============================================================
-- KitchenOS Seed Data
-- ============================================================

-- INGREDIENTS
INSERT INTO ingredients (name, category) VALUES
('chicken breast', 'protein'),
('ground beef', 'protein'),
('salmon', 'protein'),
('tofu', 'protein'),
('egg', 'protein'),
('pasta', 'grain'),
('rice', 'grain'),
('tortilla', 'grain'),
('bread', 'grain'),
('black beans', 'legume'),
('tomato', 'vegetable'),
('onion', 'vegetable'),
('garlic', 'vegetable'),
('bell pepper', 'vegetable'),
('broccoli', 'vegetable'),
('spinach', 'vegetable'),
('avocado', 'fruit'),
('lime', 'fruit'),
('heavy cream', 'dairy'),
('parmesan cheese', 'dairy'),
('cheddar cheese', 'dairy'),
('butter', 'dairy'),
('olive oil', 'oil'),
('soy sauce', 'condiment'),
('sriracha', 'condiment'),
('taco seasoning', 'spice'),
('garam masala', 'spice'),
('curry powder', 'spice'),
('salt', 'spice'),
('black pepper', 'spice')
ON CONFLICT (name) DO NOTHING;


-- ============================================================
-- RECIPES
-- owner_id is NULL because these are system/seeded recipes.
-- ============================================================

INSERT INTO recipes
(title, description, source, cuisine, servings,
 prep_time_minutes, cook_time_minutes, price_estimate)
VALUES

('Chicken Alfredo',
 'Creamy pasta with seasoned chicken and parmesan.',
 'seeded', 'Italian', 4, 10, 25, 16.00),

('Spicy Chicken Tacos',
 'Seasoned chicken tacos with avocado, lime, and spicy sauce.',
 'seeded', 'Mexican', 4, 15, 20, 14.00),

('Beef Tacos',
 'Classic ground beef tacos with cheese and vegetables.',
 'seeded', 'Mexican', 4, 10, 20, 13.00),

('Chicken Tikka Masala',
 'Chicken simmered in a creamy tomato sauce with Indian spices.',
 'seeded', 'Indian', 4, 20, 35, 18.00),

('Vegetable Curry',
 'Vegetables cooked in a warm and flavorful curry sauce.',
 'seeded', 'Indian', 4, 15, 30, 11.00),

('Teriyaki Chicken Rice Bowl',
 'Chicken, vegetables, and rice with a savory soy-based sauce.',
 'seeded', 'Japanese', 4, 10, 25, 14.00),

('Spicy Tofu Rice Bowl',
 'Crispy tofu served with rice, vegetables, and spicy sauce.',
 'seeded', 'Asian', 2, 10, 20, 9.00),

('Garlic Parmesan Pasta',
 'Simple creamy garlic and parmesan pasta.',
 'seeded', 'Italian', 4, 5, 20, 10.00),

('Salmon Rice Bowl',
 'Salmon served over rice with avocado and vegetables.',
 'seeded', 'Asian', 2, 10, 20, 16.00),

('Black Bean Tacos',
 'Vegetarian tacos with seasoned black beans and avocado.',
 'seeded', 'Mexican', 4, 10, 15, 9.00),

('Chicken Fried Rice',
 'Rice stir-fried with chicken, egg, vegetables, and soy sauce.',
 'seeded', 'Chinese', 4, 10, 20, 12.00),

('Vegetable Fried Rice',
 'Quick fried rice with egg, vegetables, and soy sauce.',
 'seeded', 'Chinese', 4, 10, 15, 8.00),

('Creamy Tomato Pasta',
 'Comforting pasta in a creamy garlic tomato sauce.',
 'seeded', 'Italian', 4, 10, 25, 11.00),

('Chicken Avocado Wrap',
 'Quick chicken wrap with avocado and fresh vegetables.',
 'seeded', 'American', 2, 10, 10, 10.00),

('Spinach Egg Breakfast Toast',
 'Toast topped with sautéed spinach and eggs.',
 'seeded', 'American', 1, 5, 10, 5.00)

ON CONFLICT (title) DO NOTHING;

 -- ============================================================
-- RECIPE INGREDIENTS
-- ============================================================

-- Chicken Alfredo
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 1.0, 'lb', 'sliced'),
        ('pasta', 12.0, 'oz', NULL),
        ('heavy cream', 1.0, 'cup', NULL),
        ('parmesan cheese', 1.0, 'cup', 'grated'),
        ('garlic', 3.0, 'cloves', 'minced'),
        ('butter', 2.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Chicken Alfredo'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Spicy Chicken Tacos
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 1.0, 'lb', 'diced'),
        ('tortilla', 8.0, 'pieces', NULL),
        ('avocado', 1.0, 'whole', 'sliced'),
        ('lime', 1.0, 'whole', NULL),
        ('sriracha', 2.0, 'tbsp', NULL),
        ('taco seasoning', 2.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Spicy Chicken Tacos'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Beef Tacos
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('ground beef', 1.0, 'lb', NULL),
        ('tortilla', 8.0, 'pieces', NULL),
        ('cheddar cheese', 1.0, 'cup', 'shredded'),
        ('onion', 0.5, 'whole', 'diced'),
        ('tomato', 1.0, 'whole', 'diced'),
        ('taco seasoning', 2.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Beef Tacos'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Chicken Tikka Masala
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 1.0, 'lb', 'cubed'),
        ('tomato', 3.0, 'whole', 'diced'),
        ('heavy cream', 1.0, 'cup', NULL),
        ('garlic', 3.0, 'cloves', 'minced'),
        ('garam masala', 2.0, 'tbsp', NULL),
        ('rice', 2.0, 'cups', 'cooked')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Chicken Tikka Masala'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Vegetable Curry
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('broccoli', 2.0, 'cups', 'chopped'),
        ('bell pepper', 1.0, 'whole', 'sliced'),
        ('onion', 1.0, 'whole', 'diced'),
        ('garlic', 2.0, 'cloves', 'minced'),
        ('curry powder', 2.0, 'tbsp', NULL),
        ('rice', 2.0, 'cups', 'cooked')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Vegetable Curry'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Teriyaki Chicken Rice Bowl
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 1.0, 'lb', 'diced'),
        ('rice', 2.0, 'cups', 'cooked'),
        ('broccoli', 2.0, 'cups', 'chopped'),
        ('soy sauce', 0.25, 'cup', NULL),
        ('garlic', 2.0, 'cloves', 'minced')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Teriyaki Chicken Rice Bowl'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Spicy Tofu Rice Bowl
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('tofu', 14.0, 'oz', 'cubed'),
        ('rice', 2.0, 'cups', 'cooked'),
        ('broccoli', 1.0, 'cup', 'chopped'),
        ('soy sauce', 2.0, 'tbsp', NULL),
        ('sriracha', 1.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Spicy Tofu Rice Bowl'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Garlic Parmesan Pasta
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('pasta', 12.0, 'oz', NULL),
        ('garlic', 4.0, 'cloves', 'minced'),
        ('parmesan cheese', 1.0, 'cup', 'grated'),
        ('butter', 3.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Garlic Parmesan Pasta'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Salmon Rice Bowl
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('salmon', 12.0, 'oz', 'cubed'),
        ('rice', 2.0, 'cups', 'cooked'),
        ('avocado', 1.0, 'whole', 'sliced'),
        ('soy sauce', 2.0, 'tbsp', NULL),
        ('lime', 1.0, 'whole', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Salmon Rice Bowl'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Black Bean Tacos
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('black beans', 2.0, 'cups', 'cooked'),
        ('tortilla', 8.0, 'pieces', NULL),
        ('avocado', 1.0, 'whole', 'sliced'),
        ('tomato', 1.0, 'whole', 'diced'),
        ('lime', 1.0, 'whole', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Black Bean Tacos'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Chicken Fried Rice
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 0.75, 'lb', 'diced'),
        ('rice', 3.0, 'cups', 'cooked'),
        ('egg', 2.0, 'whole', 'beaten'),
        ('soy sauce', 3.0, 'tbsp', NULL),
        ('onion', 0.5, 'whole', 'diced')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Chicken Fried Rice'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Vegetable Fried Rice
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('rice', 3.0, 'cups', 'cooked'),
        ('egg', 2.0, 'whole', 'beaten'),
        ('broccoli', 1.0, 'cup', 'chopped'),
        ('bell pepper', 1.0, 'whole', 'diced'),
        ('soy sauce', 3.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Vegetable Fried Rice'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Creamy Tomato Pasta
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('pasta', 12.0, 'oz', NULL),
        ('tomato', 3.0, 'whole', 'diced'),
        ('heavy cream', 0.75, 'cup', NULL),
        ('garlic', 3.0, 'cloves', 'minced'),
        ('parmesan cheese', 0.5, 'cup', 'grated')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Creamy Tomato Pasta'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Chicken Avocado Wrap
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('chicken breast', 0.5, 'lb', 'sliced'),
        ('tortilla', 2.0, 'pieces', NULL),
        ('avocado', 1.0, 'whole', 'sliced'),
        ('spinach', 1.0, 'cup', NULL),
        ('tomato', 1.0, 'whole', 'sliced')
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Chicken Avocado Wrap'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- Spinach Egg Breakfast Toast
INSERT INTO recipe_ingredients
(recipe_id, ingredient_id, quantity, unit, preparation)
SELECT r.id, i.id, x.quantity, x.unit, x.preparation
FROM recipes r
CROSS JOIN (
    VALUES
        ('bread', 2.0, 'slices', 'toasted'),
        ('egg', 2.0, 'whole', NULL),
        ('spinach', 1.0, 'cup', NULL),
        ('butter', 1.0, 'tbsp', NULL)
) AS x(ingredient_name, quantity, unit, preparation)
JOIN ingredients i ON i.name = x.ingredient_name
WHERE r.title = 'Spinach Egg Breakfast Toast'
ON CONFLICT (recipe_id, ingredient_id) DO NOTHING;


-- ============================================================
-- INSTRUCTIONS
-- ============================================================

INSERT INTO recipe_instructions
(recipe_id, step_number, instruction)

SELECT id, 1, 'Cook the pasta according to package instructions.'
FROM recipes WHERE title = 'Chicken Alfredo'
UNION ALL
SELECT id, 2, 'Season and cook the sliced chicken until fully cooked.'
FROM recipes WHERE title = 'Chicken Alfredo'
UNION ALL
SELECT id, 3, 'Melt butter and cook the garlic until fragrant.'
FROM recipes WHERE title = 'Chicken Alfredo'
UNION ALL
SELECT id, 4, 'Add heavy cream and parmesan and stir until smooth.'
FROM recipes WHERE title = 'Chicken Alfredo'
UNION ALL
SELECT id, 5, 'Combine the pasta, sauce, and chicken and serve.'
FROM recipes WHERE title = 'Chicken Alfredo'

UNION ALL

SELECT id, 1, 'Season the chicken with taco seasoning and cook until done.'
FROM recipes WHERE title = 'Spicy Chicken Tacos'
UNION ALL
SELECT id, 2, 'Warm the tortillas.'
FROM recipes WHERE title = 'Spicy Chicken Tacos'
UNION ALL
SELECT id, 3, 'Fill each tortilla with chicken and avocado.'
FROM recipes WHERE title = 'Spicy Chicken Tacos'
UNION ALL
SELECT id, 4, 'Top with sriracha and fresh lime juice.'
FROM recipes WHERE title = 'Spicy Chicken Tacos'

UNION ALL

SELECT id, 1, 'Brown the ground beef in a skillet.'
FROM recipes WHERE title = 'Beef Tacos'
UNION ALL
SELECT id, 2, 'Add taco seasoning and cook until combined.'
FROM recipes WHERE title = 'Beef Tacos'
UNION ALL
SELECT id, 3, 'Warm the tortillas.'
FROM recipes WHERE title = 'Beef Tacos'
UNION ALL
SELECT id, 4, 'Fill tortillas with beef, cheese, onion, and tomato.'
FROM recipes WHERE title = 'Beef Tacos'

UNION ALL

SELECT id, 1, 'Season the chicken with garam masala and cook until browned.'
FROM recipes WHERE title = 'Chicken Tikka Masala'
UNION ALL
SELECT id, 2, 'Cook garlic and tomatoes until softened.'
FROM recipes WHERE title = 'Chicken Tikka Masala'
UNION ALL
SELECT id, 3, 'Add cream and simmer until the sauce thickens.'
FROM recipes WHERE title = 'Chicken Tikka Masala'
UNION ALL
SELECT id, 4, 'Return chicken to the sauce and simmer until cooked through.'
FROM recipes WHERE title = 'Chicken Tikka Masala'
UNION ALL
SELECT id, 5, 'Serve over rice.'
FROM recipes WHERE title = 'Chicken Tikka Masala'

UNION ALL

SELECT id, 1, 'Cook onion and garlic until softened.'
FROM recipes WHERE title = 'Vegetable Curry'
UNION ALL
SELECT id, 2, 'Add broccoli and bell pepper.'
FROM recipes WHERE title = 'Vegetable Curry'
UNION ALL
SELECT id, 3, 'Add curry powder and cook until the vegetables are tender.'
FROM recipes WHERE title = 'Vegetable Curry'
UNION ALL
SELECT id, 4, 'Serve the curry over rice.'
FROM recipes WHERE title = 'Vegetable Curry'

UNION ALL

SELECT id, 1, 'Cook the chicken in a skillet until browned.'
FROM recipes WHERE title = 'Teriyaki Chicken Rice Bowl'
UNION ALL
SELECT id, 2, 'Add broccoli and garlic and cook until tender.'
FROM recipes WHERE title = 'Teriyaki Chicken Rice Bowl'
UNION ALL
SELECT id, 3, 'Add soy sauce and toss until everything is coated.'
FROM recipes WHERE title = 'Teriyaki Chicken Rice Bowl'
UNION ALL
SELECT id, 4, 'Serve over cooked rice.'
FROM recipes WHERE title = 'Teriyaki Chicken Rice Bowl'

UNION ALL

SELECT id, 1, 'Cook tofu until crispy on all sides.'
FROM recipes WHERE title = 'Spicy Tofu Rice Bowl'
UNION ALL
SELECT id, 2, 'Cook broccoli until tender.'
FROM recipes WHERE title = 'Spicy Tofu Rice Bowl'
UNION ALL
SELECT id, 3, 'Mix soy sauce and sriracha and toss with the tofu.'
FROM recipes WHERE title = 'Spicy Tofu Rice Bowl'
UNION ALL
SELECT id, 4, 'Serve the tofu and broccoli over rice.'
FROM recipes WHERE title = 'Spicy Tofu Rice Bowl'

UNION ALL

SELECT id, 1, 'Cook pasta according to package instructions.'
FROM recipes WHERE title = 'Garlic Parmesan Pasta'
UNION ALL
SELECT id, 2, 'Melt butter and sauté garlic until fragrant.'
FROM recipes WHERE title = 'Garlic Parmesan Pasta'
UNION ALL
SELECT id, 3, 'Add the pasta and parmesan and toss until coated.'
FROM recipes WHERE title = 'Garlic Parmesan Pasta'

UNION ALL

SELECT id, 1, 'Cook the salmon until browned and cooked through.'
FROM recipes WHERE title = 'Salmon Rice Bowl'
UNION ALL
SELECT id, 2, 'Divide cooked rice between bowls.'
FROM recipes WHERE title = 'Salmon Rice Bowl'
UNION ALL
SELECT id, 3, 'Top with salmon, avocado, soy sauce, and lime.'
FROM recipes WHERE title = 'Salmon Rice Bowl'

UNION ALL

SELECT id, 1, 'Warm the black beans in a skillet.'
FROM recipes WHERE title = 'Black Bean Tacos'
UNION ALL
SELECT id, 2, 'Warm the tortillas.'
FROM recipes WHERE title = 'Black Bean Tacos'
UNION ALL
SELECT id, 3, 'Fill tortillas with beans, avocado, and tomato.'
FROM recipes WHERE title = 'Black Bean Tacos'
UNION ALL
SELECT id, 4, 'Finish with fresh lime juice.'
FROM recipes WHERE title = 'Black Bean Tacos'

UNION ALL

SELECT id, 1, 'Cook the chicken until browned and cooked through.'
FROM recipes WHERE title = 'Chicken Fried Rice'
UNION ALL
SELECT id, 2, 'Add onion and cook until softened.'
FROM recipes WHERE title = 'Chicken Fried Rice'
UNION ALL
SELECT id, 3, 'Push everything aside and scramble the eggs.'
FROM recipes WHERE title = 'Chicken Fried Rice'
UNION ALL
SELECT id, 4, 'Add cooked rice and soy sauce and stir-fry until hot.'
FROM recipes WHERE title = 'Chicken Fried Rice'

UNION ALL

SELECT id, 1, 'Cook broccoli, bell pepper, and other vegetables until tender.'
FROM recipes WHERE title = 'Vegetable Fried Rice'
UNION ALL
SELECT id, 2, 'Push the vegetables aside and scramble the eggs.'
FROM recipes WHERE title = 'Vegetable Fried Rice'
UNION ALL
SELECT id, 3, 'Add rice and soy sauce and stir-fry until hot.'
FROM recipes WHERE title = 'Vegetable Fried Rice'

UNION ALL

SELECT id, 1, 'Cook pasta according to package instructions.'
FROM recipes WHERE title = 'Creamy Tomato Pasta'
UNION ALL
SELECT id, 2, 'Cook garlic and tomatoes until softened.'
FROM recipes WHERE title = 'Creamy Tomato Pasta'
UNION ALL
SELECT id, 3, 'Add heavy cream and parmesan and simmer until creamy.'
FROM recipes WHERE title = 'Creamy Tomato Pasta'
UNION ALL
SELECT id, 4, 'Add the pasta and toss until coated.'
FROM recipes WHERE title = 'Creamy Tomato Pasta'

UNION ALL

SELECT id, 1, 'Cook the chicken until fully cooked and slice it.'
FROM recipes WHERE title = 'Chicken Avocado Wrap'
UNION ALL
SELECT id, 2, 'Place chicken, avocado, spinach, and tomato onto the tortillas.'
FROM recipes WHERE title = 'Chicken Avocado Wrap'
UNION ALL
SELECT id, 3, 'Roll the tortillas tightly and serve.'
FROM recipes WHERE title = 'Chicken Avocado Wrap'

UNION ALL

SELECT id, 1, 'Toast the bread.'
FROM recipes WHERE title = 'Spinach Egg Breakfast Toast'
UNION ALL
SELECT id, 2, 'Sauté the spinach in butter until wilted.'
FROM recipes WHERE title = 'Spinach Egg Breakfast Toast'
UNION ALL
SELECT id, 3, 'Cook the eggs to your preference.'
FROM recipes WHERE title = 'Spinach Egg Breakfast Toast'
UNION ALL
SELECT id, 4, 'Top the toast with spinach and eggs.'
FROM recipes WHERE title = 'Spinach Egg Breakfast Toast'

ON CONFLICT (recipe_id, step_number) DO NOTHING;

-- ============================================================
-- TEST USERS
-- IDs match Supabase Auth users
-- ============================================================

INSERT INTO users (id, username)
VALUES
('65bb98b1-4cfd-4bba-a73c-19b1634b7f86', 'clara'),
('e1516a40-1a23-425d-9123-37371ccb84d2', 'leo'),
('f09e6506-d106-4fbd-8990-a6c36f9cf0bd', 'mia')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- USER PREFERENCES
-- ============================================================

INSERT INTO user_preferences
(user_id, diet, cooking_skill, servings_default, spice_preference, budget_preference)
VALUES
-- Clara: vegetarian, likes spicy food
('65bb98b1-4cfd-4bba-a73c-19b1634b7f86',
 'vegetarian', 'intermediate', 2, 'spicy', 15.00),

-- Leo: eats anything, beginner, doesn't like spicy food
('e1516a40-1a23-425d-9123-37371ccb84d2',
 NULL, 'beginner', 2, 'mild', 12.00),

-- Mia: pescatarian, experienced cook
('f09e6506-d106-4fbd-8990-a6c36f9cf0bd',
 'pescatarian', 'advanced', 1, 'medium', 20.00)

ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- ALLERGIES
-- ============================================================

INSERT INTO allergies (name)
VALUES
('dairy'),
('peanuts'),
('shellfish')
ON CONFLICT (name) DO NOTHING;


-- Clara: dairy allergy
INSERT INTO user_allergies (user_id, allergy_id, severity)
SELECT
'65bb98b1-4cfd-4bba-a73c-19b1634b7f86',
id,
'severe'
FROM allergies
WHERE name = 'dairy'
ON CONFLICT DO NOTHING;


-- Leo: peanut allergy
INSERT INTO user_allergies (user_id, allergy_id, severity)
SELECT
'e1516a40-1a23-425d-9123-37371ccb84d2',
id,
'moderate'
FROM allergies
WHERE name = 'peanuts'
ON CONFLICT DO NOTHING;


-- Mia: shellfish allergy
INSERT INTO user_allergies (user_id, allergy_id, severity)
SELECT
'f09e6506-d106-4fbd-8990-a6c36f9cf0bd',
id,
'severe'
FROM allergies
WHERE name = 'shellfish'
ON CONFLICT DO NOTHING;


-- ============================================================
-- PANTRY
-- ============================================================

-- Clara
INSERT INTO pantry_items
(user_id, ingredient_id, quantity, unit, availability_confidence)
SELECT
'65bb98b1-4cfd-4bba-a73c-19b1634b7f86',
id,
5,
'servings',
0.90
FROM ingredients
WHERE name IN ('tofu', 'rice', 'black beans', 'broccoli', 'sriracha')
ON CONFLICT (user_id, ingredient_id) DO NOTHING;


-- Leo
INSERT INTO pantry_items
(user_id, ingredient_id, quantity, unit, availability_confidence)
SELECT
'e1516a40-1a23-425d-9123-37371ccb84d2',
id,
5,
'servings',
0.90
FROM ingredients
WHERE name IN ('chicken breast', 'pasta', 'garlic', 'butter', 'parmesan cheese')
ON CONFLICT (user_id, ingredient_id) DO NOTHING;


-- Mia
INSERT INTO pantry_items
(user_id, ingredient_id, quantity, unit, availability_confidence)
SELECT
'f09e6506-d106-4fbd-8990-a6c36f9cf0bd',
id,
5,
'servings',
0.90
FROM ingredients
WHERE name IN ('salmon', 'rice', 'avocado', 'spinach', 'soy sauce')
ON CONFLICT (user_id, ingredient_id) DO NOTHING;


-- ============================================================
-- RECIPE HISTORY
-- ============================================================

-- Clara likes vegetarian/spicy recipes
INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'65bb98b1-4cfd-4bba-a73c-19b1634b7f86',
id,
5
FROM recipes
WHERE title = 'Spicy Tofu Rice Bowl';


INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'65bb98b1-4cfd-4bba-a73c-19b1634b7f86',
id,
4
FROM recipes
WHERE title = 'Black Bean Tacos';


-- Leo likes chicken/pasta
INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'e1516a40-1a23-425d-9123-37371ccb84d2',
id,
5
FROM recipes
WHERE title = 'Chicken Alfredo';


INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'e1516a40-1a23-425d-9123-37371ccb84d2',
id,
4
FROM recipes
WHERE title = 'Teriyaki Chicken Rice Bowl';


-- Mia likes seafood / lighter meals
INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'f09e6506-d106-4fbd-8990-a6c36f9cf0bd',
id,
5
FROM recipes
WHERE title = 'Salmon Rice Bowl';


INSERT INTO recipe_history (user_id, recipe_id, rating)
SELECT
'f09e6506-d106-4fbd-8990-a6c36f9cf0bd',
id,
4
FROM recipes
WHERE title = 'Vegetable Curry';