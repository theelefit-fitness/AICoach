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
from utils import calculate_bmi, calculate_tdee, goal_config, user_context

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for development
CORS(app)

# Set your OpenAI API key
api_key = os.getenv("OPENAI_API_KEY")

# Initialize Redis client (make sure Redis is running locally)
redis_client = redis.Redis(host='127.0.0.1', port=6379, db=0, decode_responses=True)

# Test Redis connection
try:
    redis_test = redis_client.ping()
    print(f"Redis connection test: {'SUCCESS' if redis_test else 'FAILED'}")
except Exception as e:
    print(f"Redis connection error: {str(e)}")
    # Set up a dummy redis client that won't error on operations if Redis fails
    class DummyRedis:
        def get(self, key):
            print(f"DummyRedis: get({key}) - Redis not available")
            return None
            
        def setex(self, key, time, value):
            print(f"DummyRedis: setex({key}, {time}, {value[:30]}...) - Redis not available")
            return None
    
    redis_client = DummyRedis()
    print("Using DummyRedis for cache operations")

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
        force_new = data.get('forceNew', False)

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400

        # Add a unique identifier to the prompt
        unique_id = str(uuid.uuid4())[:8]
        timestamp = int(time.time())
        
        # Cache key will be the original prompt
        cache_key = prompt
        
        # Actual prompt sent to AI includes the unique identifier
        unique_prompt = f"{prompt}\n\nRequest-ID: {unique_id}-{timestamp}"

        # Redis cache (skip if force_new is True)
        # if not force_new:
        #     try:
        #         print(f"Checking cache for key: '{cache_key[:50]}...'")
        #         cached_response = redis_client.get(cache_key)
        #         if cached_response:
        #             print(f"Cache HIT! Returning cached response from {cache_key[:50]}...")
        #             return jsonify({"reply": json.loads(cached_response), "cached": True})
        #         else:
        #             print(f"Cache MISS for key: '{cache_key[:50]}...'")
        #     except Exception as e:
        #         print(f"Error checking cache: {str(e)}")
                # Continue with API call if cache fails

        print(f"Making API call to OpenAI with prompt: '{user_context[:50]}...'")
        # Call OpenAI
        client = openai.OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages = [
    {
        "role": "system",
        "content": f"""{user_context}

You are a helpful fitness assistant.

Generate a complete 7-day personalized fitness plan for the user above. The plan should include:

1. **MEAL_PLAN**:
   - 3 meals + 1 snack per day
   - Each item should include portion size and calories
   - Total daily calories should be close to the user's target

2. **WORKOUT_PLAN**:
   - 4 exercises per day
   - Include sets and reps
   - Match intensity to the user’s goal and fitness level

The plan must follow dietary preferences, avoid allergens, and align with the user’s goal (e.g., weight loss, muscle gain, flexibility). Meals should reflect the user's cultural background if specified.

Output must include:
- A clear `MEAL_PLAN` section with daily breakdowns
MEAL_PLAN FORMAT:
MEAL_PLAN:
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
"""
    },
    {
        "role": "user",
        "content": "Please generate my 7-day meal and workout plan."
    }
]
        )

        reply = response.choices[0].message.content
        
        # Don't cache if force_new is True
        if not force_new:
            try:
                print(f"Storing response in cache with key: '{cache_key[:50]}...'")
                redis_client.setex(cache_key, 24 * 60 * 60, json.dumps(reply))  # cache for 24 hours
                print(f"Successfully stored in cache")
            except Exception as e:
                print(f"Error storing in cache: {str(e)}")
                # Continue even if caching fails

        return jsonify({"reply": reply, "cached": False})

    except Exception as e:
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

