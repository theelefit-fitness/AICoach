from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import openai
import redis
import json
from langdetect import detect
import os
from dotenv import load_dotenv
import time
import uuid
from utils import calculate_bmi, calculate_tdee, goal_config, user_profile_default

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for development
CORS(app)

# Set your OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")

# Initialize Redis client (make sure Redis is running locally)
# redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

# Test Redis connection
# try:
#     redis_test = redis_client.ping()
#     print(f"Redis connection test: {'SUCCESS' if redis_test else 'FAILED'}")
# except Exception as e:
#     print(f"Redis connection error: {str(e)}")
#     # Set up a dummy redis client that won't error on operations if Redis fails
#     class DummyRedis:
#         def get(self, key):
#             print(f"DummyRedis: get({key}) - Redis not available")
#             return None
#             
#         def setex(self, key, time, value):
#             print(f"DummyRedis: setex({key}, {time}, {value[:30]}...) - Redis not available")
#             return None
#     
#     redis_client = DummyRedis()
#     print("Using DummyRedis for cache operations")

@app.route('/')
def index():
    return "<h2>Fitness Chatbot Backend is Running</h2>"

@app.route('/chat', methods=['OPTIONS', 'POST'])
def chat_with_gpt():
    try:
        if request.method == 'OPTIONS':
            response = jsonify({"message": "CORS preflight successful"})
            response.status_code = 204
            return response

        data = request.get_json()
        prompt = data.get('prompt', '')
        incoming_profile = data.get('userProfile', {})

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        user_profile = {**user_profile_default, **incoming_profile}

        # Use consistent keys (fallback to both possible keys)
        weight = user_profile.get("weight_kg") or user_profile.get("weight")
        height = user_profile.get("height_cm") or user_profile.get("height")
        age = user_profile.get("age")
        gender = user_profile.get("gender")
        diet = user_profile.get("diet", "vegetarian")
        allergies = user_profile.get("allergies", [])
        goal = user_profile.get("goal", "fat loss")
        activity_level = user_profile.get("activity_level") or user_profile.get("activityLevel", "moderate")
        location = user_profile.get("location", "")
        preferences = user_profile.get("preferences", [])

        bmi = calculate_bmi(weight, height)
        tdee = calculate_tdee(weight, height, age, gender, activity_level)
        goal_plan = goal_config.get(goal, goal_config["get_fit"])
        target_calories = tdee + goal_plan["calorie_offset"]
        workout_focus = goal_plan["workout_focus"]
        user_context = f"""
USER PROFILE:
- Age: {age}
- Weight: {weight} kg
- Height: {height} cm
- BMI: {bmi}
- Gender: {gender}
- Activity Level: {activity_level}
- Goal: {goal}
- Location: {location}
- Dietary Preferences: {", ".join(preferences)}
- Allergies: {", ".join(allergies)}
- TDEE: {tdee} kcal/day
- Target Calories for Goal: {target_calories} kcal/day
- Primary Workout Focus: {workout_focus}
"""

        # Add a unique identifier to the prompt
        unique_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        # Actual prompt sent to AI includes the unique identifier
        unique_prompt = f"{prompt}\n\nRequest-ID: {unique_id}-{timestamp}"

        print(f"Making API call to OpenAI with prompt: '{user_context[:50]}...'")
        # Call OpenAI
        client = openai.OpenAI(api_key=api_key)
        print("Target calories for goal:", target_calories)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages = [
                {
                    "role": "system",
                    "content": f"""

You are generating a personalized fitness and nutrition plan for a user based on their profile and goals.
Your task is to create a detailed 7-day plan that includes both meal and workout plans.
Take into consideration the target calories, dietary preferences, allergies, cultural background, and fitness level of the user.
Make a meal plan that has exactly that number of calories per day, and a workout plan that matches the user's fitness level and goals.
Keep all the text normalized and concise, avoiding unnecessary verbosity.
Generate a complete 7-day personalized fitness plan for the user above. The plan should include:

1. MEAL_PLAN:
   - 3 meals + 1 snack per day
   - Each item should include portion size and calories
   - Total daily calories should be close to the user's target

2. WORKOUT_PLAN:
   - 4 exercises per day
   - Include sets and reps
   - Match intensity to the user’s goal and fitness level

The plan must follow dietary preferences, avoid allergens, and align with the user’s goal (e.g., weight loss, muscle gain, flexibility). Meals should reflect the user's cultural background if specified.
The user profile is as follows:
{user_context}
Output must include:
- A clear `MEAL_PLAN` section with daily breakdowns
For each day (Day 1 to N, where N is user requested days):
Day X:
- Breakfast (XXX calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]
- Lunch (XXX calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]
- Snack (XXX calories(compusolry)):
  1. [[Snack item 1] with quantity(compusolry)]
  2. [[Snack item 2] with quantity(compusolry)]
  3. [[Snack item 3] with quantity(compusolry)]
- Dinner (XXX calories(compusolry)):
  1. [[Meal item 1] with quantity(compusolry)]
  2. [[Meal item 2] with quantity(compusolry)]
  3. [[Meal item 3] with quantity(compusolry)]

Total Daily Calories: XXXX(compusolry)


- A `WORKOUT_PLAN` section with daily exercises

WORKOUT_PLAN FORMAT:
WORKOUT_PLAN:
Timeline: X months
Weekly Schedule: Y days per week
Expected Results: [Describe expected results after following this plan for the specified months]

For each day (Day 1 to N, where N is user requested days):
Day X - [Focus Area]:
1. [Exercise 1 with sets/reps]
2. [Exercise 2 with sets/reps]
3. [Exercise 3 with sets/reps]
4. [Exercise 4 with sets/reps]

- 7 days of both meal and workout plans

CULTURAL & PERSONAL CUSTOMIZATION:
1. If the user mentions their nationality, country, or cultural background (e.g., "Indian food," "I am from Mexico"), provide meals specific to that culture using authentic ingredients and dishes.
2. If the user mentions dietary restrictions (vegetarian, vegan, halal, kosher, etc.), strictly adhere to those guidelines.
3. If user mentions specific physical attributes (age, weight, height, BMI, gender), customize the plan accordingly with appropriate calorie counts and exercise intensity.
4. For medical conditions (diabetes, hypertension, etc.), include appropriate dietary modifications.
5. Match exercise intensity to stated fitness levels (beginner, intermediate, advanced).

Notes:
- Each meal MUST include calorie count
- Each meal type MUST have EXACTLY 3 items
- Each day MUST have a total calorie count
- Each workout day MUST have EXACTLY 4 exercises
- Workouts MUST be appropriate for the specified fitness level
- Include expected results after following the plan for specified months
- Adjust intensity based on experience level
- Consider any health conditions or dietary restrictions in recommendations
- IMPORTANT: Both MEAL_PLAN and WORKOUT_PLAN must have EXACTLY the same number of days

"""
                },
                {
                    "role": "user",
                    "content": unique_prompt
                }
            ]
        )

        # Defensive: ensure reply is always a string
        reply = response.choices[0].message.content
        if not reply:
            print("No reply from OpenAI, sending error to frontend.")
            return jsonify({"error": "No reply from OpenAI"}), 500

        # Print what is being sent to the frontend
        print("Sending to frontend:", {"reply": reply, "cached": False})

        return jsonify({"reply": reply, "cached": False}), 200

    except Exception as e:
        print("Exception in /chat:", e)
        return jsonify({"error": str(e)}), 500

# @app.route('/check-cache', methods=['OPTIONS', 'POST'])
# def check_cache():
#     """Endpoint to quickly check if a response is cached without making API call"""
#     try:
#         if request.method == 'OPTIONS':
#             response = jsonify({"message": "CORS preflight successful"})
#             response.status_code = 204
#             return response

#         data = request.get_json()
#         prompt = data.get('prompt', '')

#         if not prompt:
#             return jsonify({"error": "Prompt is required"}), 400

#         # Parse useful information from the prompt
#         prompt_info = {
#             "requested_days": 7,  # Default value
#             "countries": [],
#             "dietary_preferences": [],
#             "age": None,
#             "gender": None,
#         }
        
#         # Extract days
#         days_match = prompt.lower().find("days")
#         if days_match > 0:
#             # Look for a number before "days"
#             for i in range(days_match - 1, max(0, days_match - 5), -1):
#                 if prompt[i].isdigit():
#                     day_str = ""
#                     while i >= 0 and prompt[i].isdigit():
#                         day_str = prompt[i] + day_str
#                         i -= 1
#                     if day_str:
#                         prompt_info["requested_days"] = int(day_str)
#                         break
        
#         # Look for country or cuisine references
#         countries = ["indian", "chinese", "mexican", "italian", "japanese", "thai", 
#                     "korean", "french", "greek", "mediterranean", "american", "middle eastern",
#                     "spanish", "turkish", "brazilian", "vietnamese"]
        
#         for country in countries:
#             if country.lower() in prompt.lower():
#                 prompt_info["countries"].append(country)
        
#         # Look for dietary preferences
#         diets = ["vegetarian", "vegan", "keto", "paleo", "gluten-free", "dairy-free", 
#                 "low-carb", "high-protein", "halal", "kosher"]
        
#         for diet in diets:
#             if diet.lower() in prompt.lower():
#                 prompt_info["dietary_preferences"].append(diet)
        
#         # Check Redis cache
#         try:
#             print(f"Cache check for key: '{prompt[:50]}...'")
#             cached_response = redis_client.get(prompt)
            
#             if cached_response:
#                 print(f"Cache check HIT for key: '{prompt[:50]}...'")
#                 return jsonify({
#                     "cached": True,
#                     "reply": json.loads(cached_response),
#                     "requestedDays": prompt_info["requested_days"],
#                     "promptInfo": prompt_info
#                 })
#             else:
#                 print(f"Cache check MISS for key: '{prompt[:50]}...'")
#         except Exception as e:
#             print(f"Error checking cache: {str(e)}")
#             # Continue with miss response if cache check fails
        
#         return jsonify({
#             "cached": False,
#             "promptInfo": prompt_info
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

# Run locally
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
#                 return jsonify({
#                     "cached": True,
#                     "reply": json.loads(cached_response),
#                     "requestedDays": prompt_info["requested_days"],
#                     "promptInfo": prompt_info
#                 })
#             else:
#                 print(f"Cache check MISS for key: '{prompt[:50]}...'")
#         except Exception as e:
#             print(f"Error checking cache: {str(e)}")
#             # Continue with miss response if cache check fails
        
#         return jsonify({
#             "cached": False,
#             "promptInfo": prompt_info
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
# Run locally
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
#                 return jsonify({
#                     "cached": True,
#                     "reply": json.loads(cached_response),
#                     "requestedDays": prompt_info["requested_days"],
#                     "promptInfo": prompt_info
#                 })
#             else:
#                 print(f"Cache check MISS for key: '{prompt[:50]}...'")
#         except Exception as e:
#             print(f"Error checking cache: {str(e)}")
#             # Continue with miss response if cache check fails
        
#         return jsonify({
#             "cached": False,
#             "promptInfo": prompt_info
#         })

#     except Exception as e:
#         return jsonify({"error": str(e)}), 500

