import "./App.css";
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';


const AIFitnessCoach = () => {
  // State management
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastProcessedGoal, setLastProcessedGoal] = useState('');
  const [openMealAccordion, setOpenMealAccordion] = useState('');
  const [openMealSubAccordion, setOpenMealSubAccordion] = useState('');
  const [openWorkoutAccordion, setOpenWorkoutAccordion] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [currentPopupGoal, setCurrentPopupGoal] = useState(null);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    height: '',
    currentWeight: '',
    targetWeight: '',
    activityLevel: '',
    experienceLevel: '',
    workoutDays: '',
    timeframe: '3',
    healthConditions: []
  });

  // Refs
  const loadingAnimationRef = useRef(null);
  const plansContainerRef = useRef(null);
  const mealAccordionRef = useRef(null);
  const workoutAccordionRef = useRef(null);
  const popupRef = useRef(null);
  const overlayRef = useRef(null);

  // Data
  const suggestions = [
    { text: "Lose Weight", icon: "fa-fire" },
    { text: "Build Muscle", icon: "fa-dumbbell" },
    { text: "Improve Endurance", icon: "fa-running" },
    { text: "Get Stronger", icon: "fa-mountain" },
    { text: "Increase Flexibility", icon: "fa-stopwatch" },
    { text: "Athletic Performance", icon: "fa-chart-line" }
  ];

  const goalData = {
    "Lose Weight": {
      icon: "fa-fire",
      color: "#e74c3c",
      description: "Focus on calorie deficit and cardio exercises to achieve sustainable weight loss."
    },
    "Build Muscle": {
      icon: "fa-dumbbell",
      color: "#3498db",
      description: "Combine strength training with proper nutrition to increase muscle mass."
    },
    "Improve Endurance": {
      icon: "fa-running",
      color: "#2ecc71",
      description: "Enhance your cardiovascular fitness through consistent aerobic exercises."
    },
    "Get Stronger": {
      icon: "fa-mountain",
      color: "#f1c40f",
      description: "Focus on progressive overload and compound movements for overall strength."
    },
    "Increase Flexibility": {
      icon: "fa-stopwatch",
      color: "#9b59b6",
      description: "Incorporate stretching and mobility exercises for better range of motion."
    },
    "Athletic Performance": {
      icon: "fa-chart-line",
      color: "#1abc9c",
      description: "Enhance your overall athletic abilities through targeted training programs."
    }
  };

  // Add this object for meal calorie ranges
  const mealCalories = {
    breakfast: {
      min: 300,
      max: 400
    },
    lunch: {
      min: 500,
      max: 600
    },
    snack: {
      min: 150,
      max: 200
    },
    dinner: {
      min: 500,
      max: 700
    }
  };

  // Utility functions
  const cleanText = (text) => {
    return text
      .replace(/[^\w\s.,()-:]/g, '') // Allow only alphanumeric, spaces, dots, commas, parentheses, hyphens, and colons
      .replace(/\s+/g, ' ')
      .trim();
  };

  const cleanItemText = (text) => {
    // More thorough cleaning for list items
    return text
      .replace(/[^\w\s.,()-:]/g, '') // Remove special characters
      .replace(/^[-–—•●◆◇▪▫■□★☆*]+\s*/, '') // Remove bullet points at start
      .replace(/^\d+[\.\)]\s*/, '') // Remove numbered list markers
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };

  const formatResponse = (text) => {
    text = text.replace(/[│├─└┌┐•●◆◇▪▫■□★☆\[\]{}*]/g, ''); // Remove more special characters
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.replace(/\s{2,}/g, ' ');
    text = text.replace(/(\d+\)|\d+\.|•|-)\s*/g, '');
    return text.trim();
  };

  // Animation functions
  const animateLoadingIcons = () => {
    console.log('Starting animation sequence');
    const icons = document.querySelectorAll('.loader-icon');
    console.log('Found icons:', icons.length);
    
    gsap.set(icons, { opacity: 1, y: 0, scale: 1, rotation: 0 });
    
    const masterTimeline = gsap.timeline({ repeat: -1 });
    
    icons.forEach((icon, index) => {
      const duration = 2;
      const delay = index * 0.2;
      
      masterTimeline.to(icon, {
        keyframes: [
          { 
            y: -15,
            scale: 1.1,
            rotation: 360,
            duration: duration/2,
            ease: "power1.inOut"
          },
          { 
            y: 0,
            scale: 1,
            rotation: 360,
            duration: duration/2,
            ease: "power1.inOut"
          }
        ],
      }, delay);
    });

    gsap.to('.loading-text', {
      scale: 1.05,
      duration: 1,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut"
    });

    gsap.to('.loading-text', {
      backgroundPosition: '100% 50%',
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "none"
    });
    
    console.log('Animation sequence started');
  };

  // Event handlers
  const handleRecommendation = async () => {
    const userPrompt = fitnessGoal.trim();
    if (!userPrompt || isLoading) return;
    
    // Always show loading and get a fresh response when the button is clicked
    console.log('Setting loading state to true for direct recommendation');
    setIsLoading(true);
    setShowPlans(false);
    setLastProcessedGoal(userPrompt);
    
    try {
      console.clear();
      console.log('Sending request for prompt:', userPrompt);
      
      // Make sure to explicitly request both meal and workout plans for any health-related query
      const enhancedUserPrompt = `${userPrompt} Please create both a MEAL_PLAN and WORKOUT_PLAN for this goal.`;
      
      const systemPrompt = `You are a fitness assistant. ALWAYS respond in English regardless of the input language.

IMPORTANT: All responses MUST be in English, even if the user's prompt is in another language.

MEAL_PLAN:
Provide a detailed meal plan for each section (Breakfast, Snack, Lunch, Dinner) with multiple items listed and clear varieties. Use numbers (1., 2., 3.) instead of dashes. The meal type (e.g., Breakfast, Snack) and all meal descriptions must be in English.

WORKOUT_PLAN:
- If the user specifies a number of days (e.g., "3 days", "5 days"), provide a workout plan for exactly that many days.
- If no specific days are mentioned, provide a standard 7-day plan.
- Each day should be clearly marked as "Day 1:", "Day 2:", etc.
- List multiple exercises per day, each numbered for better readability.
- All sections and exercise descriptions MUST be in English.
- For muscle gain focus on progressive overload and proper exercise splits.

IMPORTANT: ALWAYS include both a MEAL_PLAN section and a WORKOUT_PLAN section in your response, regardless of what the user asks for.

Ensure each section follows this format exactly to maintain readability and parsing integrity.
Remember: ALWAYS respond in English regardless of the input language.`;

      const daysMatch = userPrompt.match(/(\d+)\s*days?/i);
      const requestedDays = daysMatch ? parseInt(daysMatch[1]) : 7;

      const enhancedPrompt = daysMatch 
        ? `${enhancedUserPrompt} (Please provide exactly ${requestedDays} days of workouts in English)`
        : `${enhancedUserPrompt} (Please provide response in English with both MEAL_PLAN and WORKOUT_PLAN)`;

      const combinedPrompt = `${systemPrompt}\n\nUser Query: ${enhancedPrompt}`;

      // Add a timestamp to force a fresh response 
      const timestamp = new Date().getTime();
      const forceNewPrompt = `${combinedPrompt}\n\nTimestamp: ${timestamp}`;

      console.log('Sending API request to backend...');
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: forceNewPrompt,
          forceNew: true  // Add flag to bypass cache on the server
        })
      });

      if (!response.ok) {
        console.error('Server response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch data from server: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw response from server:', data);
      
      if (!data.reply) {
        console.error('No reply in response data:', data);
        throw new Error('Server response missing reply field');
      }
      
      const cleanedResponse = formatResponse(data.reply);
      
      console.log('=== Fitness Plan Generated ===');
      console.log('Goal:', cleanText(userPrompt));
      console.log('Requested Days:', requestedDays);
      console.log('\nChatGPT Response:');
      console.log(cleanedResponse);
      console.log('==================');
      
      // Check if response contains the expected sections
      if (!cleanedResponse.includes('MEAL_PLAN:') || !cleanedResponse.includes('WORKOUT_PLAN:')) {
        console.error('Response missing required sections:', cleanedResponse);
        
        // Force format the response if needed
        const forcedResponse = `MEAL_PLAN:\nBreakfast: ${data.reply.includes('Breakfast') ? data.reply.split('Breakfast')[1].split('\n')[0] : 'Healthy breakfast options'}\n\nLunch: ${data.reply.includes('Lunch') ? data.reply.split('Lunch')[1].split('\n')[0] : 'Nutritious lunch options'}\n\nDinner: ${data.reply.includes('Dinner') ? data.reply.split('Dinner')[1].split('\n')[0] : 'Balanced dinner options'}\n\nWORKOUT_PLAN:\nDay 1: ${data.reply.includes('Day 1') ? data.reply.split('Day 1')[1].split('\n')[0] : 'Full body workout'}\n`;
        
        console.log('Reformatted response:', forcedResponse);
        parseResponse(forcedResponse, requestedDays);
      } else {
        parseResponse(cleanedResponse, requestedDays);
      }
      
      setIsLoading(false);
      setShowPlans(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      alert(`Failed to fetch recommendations: ${error.message}. Please try again.`);
    }
  };

  const parseResponse = (response, requestedDays) => {
    console.log('Parsing response...');
    const sections = response.split(/(?=MEAL_PLAN:|WORKOUT_PLAN:)/i);
    console.log('Split into sections:', sections.length);
    
    const mealSections = [];
    const workoutSections = [];
    
    // If we don't have any clear sections, try to extract meal and workout info
    if (sections.length <= 1) {
      console.log('No clear sections found, attempting to extract meal and workout info');
      
      // Try to extract meal sections
      const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
      mealTypes.forEach((mealType, index) => {
        if (response.includes(mealType)) {
          const mealTypeRegex = new RegExp(`${mealType}[:\\s](.+?)(?=(?:${mealTypes.join('|')})|WORKOUT_PLAN|$)`, 'is');
          const match = response.match(mealTypeRegex);
          
          if (match && match[1]) {
            const items = match[1].split('\n')
              .map(line => line.trim())
              .filter(line => line && line.length > 2 && !line.includes(mealType))
              .map(item => cleanItemText(item));
            
            if (items.length > 0) {
              // Limit to exactly 3 items
              const limitedItems = items.slice(0, 3);
              // If less than 3 items, add generic ones to reach 3
              while (limitedItems.length < 3) {
                if (mealType.toLowerCase().includes('breakfast')) {
                  limitedItems.push('Healthy breakfast option with protein and fiber');
                } else if (mealType.toLowerCase().includes('lunch')) {
                  limitedItems.push('Balanced lunch with vegetables and lean protein');
                } else if (mealType.toLowerCase().includes('dinner')) {
                  limitedItems.push('Nutritious dinner with complex carbs and protein');
                } else {
                  limitedItems.push('Healthy snack option under 200 calories');
                }
              }
              
              mealSections.push({
                id: `meal-${index}`,
                title: mealType,
                mealType: mealType.toLowerCase(),
                items: limitedItems,
                icon: mealType.toLowerCase().includes('breakfast') ? 'fa-sun' : 
                      mealType.toLowerCase().includes('lunch') ? 'fa-utensils' : 
                      mealType.toLowerCase().includes('dinner') ? 'fa-moon' : 'fa-apple-alt'
              });
            }
          }
        }
      });
      
      // Try to extract workout days
      for (let day = 1; day <= requestedDays; day++) {
        const dayRegex = new RegExp(`Day ${day}[:\\s](.+?)(?=Day ${day+1}|$)`, 'is');
        const match = response.match(dayRegex);
        
        if (match && match[1]) {
          const exercises = match[1].split('\n')
            .map(line => line.trim())
            .filter(line => line && line.length > 2 && !line.includes(`Day ${day}`))
            .map(exercise => cleanItemText(exercise));
          
          if (exercises.length > 0) {
            // Limit to exactly 3 exercises
            const limitedExercises = exercises.slice(0, 3);
            // If less than 3 exercises, add generic ones to reach 3
            while (limitedExercises.length < 3) {
              limitedExercises.push(`Exercise ${limitedExercises.length + 1} for Day ${day}`);
            }
            
            workoutSections.push({
              id: `workout-${day-1}`,
              dayNumber: day,
              mainTitle: 'Full Body',
              workoutType: 'Mixed Training',
              exercises: limitedExercises,
              icon: 'fa-dumbbell'
            });
          }
        }
      }
    } else {
      // Process each section as before
      sections.forEach(section => {
        const sectionText = section.trim();
        
        if (sectionText.startsWith('MEAL_PLAN:')) {
          const mealPlanText = sectionText.replace('MEAL_PLAN:', '').trim();
          if (!mealPlanText) return;
          
          const meals = mealPlanText.split(/(?=Breakfast:|Lunch:|Dinner:|Snack:)/i)
            .filter(section => section.trim());
          
          meals.forEach((mealSection, index) => {
            const lines = mealSection.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.toLowerCase().includes('meal_plan'));
            
            if (lines.length < 2) return;
            
            const title = cleanText(lines[0].trim());
            if (!title.toLowerCase().match(/breakfast|lunch|dinner|snack/)) return;
            
            const items = lines.slice(1)
              .map(item => cleanItemText(item.replace(/^\d+[\.\)]\s*/, '')))
              .filter(item => item && item.length > 2);
            
            if (items.length === 0) return;
            
            // Limit to exactly 3 items
            const limitedItems = items.slice(0, 3);
            // If less than 3 items, add generic ones to reach 3
            const mealType = title.toLowerCase().replace(':', '');
            while (limitedItems.length < 3) {
              if (mealType.toLowerCase().includes('breakfast')) {
                limitedItems.push('Healthy breakfast option with protein and fiber');
              } else if (mealType.toLowerCase().includes('lunch')) {
                limitedItems.push('Balanced lunch with vegetables and lean protein');
              } else if (mealType.toLowerCase().includes('dinner')) {
                limitedItems.push('Nutritious dinner with complex carbs and protein');
              } else {
                limitedItems.push('Healthy snack option under 200 calories');
              }
            }
            
            mealSections.push({
              id: `meal-${index}`,
              title,
              mealType,
              items: limitedItems,
              icon: mealType.includes('breakfast') ? 'fa-sun' : 
                    mealType.includes('lunch') ? 'fa-utensils' : 
                    mealType.includes('dinner') ? 'fa-moon' : 'fa-apple-alt'
            });
          });
        } else if (sectionText.startsWith('WORKOUT_PLAN:')) {
          const workoutPlanText = sectionText.replace('WORKOUT_PLAN:', '').trim();
          if (!workoutPlanText) return;
          
          const workouts = workoutPlanText.split(/(?=Day \d+:|Day \d+ -)/i)
            .filter(day => {
              const dayText = day.trim();
              if (!dayText || !dayText.toLowerCase().includes('day')) return false;
              
              const dayMatch = dayText.match(/Day (\d+)/i);
              if (!dayMatch) return false;
              
              const dayNum = parseInt(dayMatch[1]);
              return dayNum <= requestedDays;
            });
          
          workouts.forEach((day, index) => {
            const lines = day.split('\n')
              .map(line => line.trim())
              .filter(line => line && !line.toLowerCase().includes('workout_plan'));
            
            if (lines.length < 2) return;
            
            const titleLine = cleanText(lines[0]);
            const dayMatch = titleLine.match(/Day (\d+)/i);
            if (!dayMatch) return;
            
            const dayNumber = parseInt(dayMatch[1]);
            const title = titleLine.replace(/^Day \d+[:\-]\s*/, '').trim();
            
            const exercises = lines.slice(1)
              .map(exercise => cleanItemText(exercise.replace(/^\d+[\.\)]\s*/, '')))
              .filter(exercise => exercise && exercise.length > 2);
            
            if (exercises.length === 0) return;
            
            // Limit to exactly 3 exercises
            const limitedExercises = exercises.slice(0, 3);
            // If less than 3 exercises, add generic ones to reach 3
            while (limitedExercises.length < 3) {
              limitedExercises.push(`Exercise ${limitedExercises.length + 1} for Day ${dayNumber}`);
            }
            
            const exerciseText = limitedExercises.join(' ').toLowerCase();
            let workoutType = '';
            let mainTitle = '';
            
            if (exerciseText.includes('leg') || exerciseText.includes('squat')) {
              mainTitle = 'Lower Body';
              workoutType = 'Leg Day';
            } else if (exerciseText.includes('chest') || exerciseText.includes('push')) {
              mainTitle = 'Upper Body';
              workoutType = 'Chest & Triceps';
            } else if (exerciseText.includes('back') || exerciseText.includes('pull')) {
              mainTitle = 'Upper Body';
              workoutType = 'Back & Biceps';
            } else if (exerciseText.includes('shoulder')) {
              mainTitle = 'Upper Body';
              workoutType = 'Shoulders & Arms';
            } else if (exerciseText.includes('cardio')) {
              mainTitle = 'Cardio';
              workoutType = 'Cardio & Endurance';
            } else {
              mainTitle = 'Full Body';
              workoutType = 'Mixed Training';
            }
            
            workoutSections.push({
              id: `workout-${index}`,
              dayNumber,
              mainTitle,
              workoutType,
              exercises: limitedExercises,
              icon: workoutType.includes('Leg') ? 'fa-running' :
                    workoutType.includes('Cardio') ? 'fa-heartbeat' : 'fa-dumbbell'
            });
          });
        }
      });
    }

    console.log('Parsed meal sections:', mealSections.length);
    console.log('Parsed workout sections:', workoutSections.length);

    // If we still have no sections, create some defaults
    if (mealSections.length === 0) {
      // Create structured meal sections instead of a single general one
      const defaultMealSections = [
        {
          id: 'meal-breakfast',
          title: 'Breakfast',
          mealType: 'breakfast',
          items: [
            'Oatmeal with berries and nuts',
            'Greek yogurt with honey',
            'Veggie omelette with whole grain toast'
          ].map(item => cleanItemText(item)),
          icon: 'fa-sun'
        },
        {
          id: 'meal-lunch',
          title: 'Lunch',
          mealType: 'lunch',
          items: [
            'Grilled chicken salad with olive oil dressing',
            'Quinoa bowl with vegetables and lean protein',
            'Turkey wrap with whole grain tortilla'
          ].map(item => cleanItemText(item)),
          icon: 'fa-utensils'
        },
        {
          id: 'meal-snack',
          title: 'Snack',
          mealType: 'snack',
          items: [
            'Apple slices with almond butter',
            'Carrot sticks with hummus',
            'Handful of mixed nuts'
          ].map(item => cleanItemText(item)),
          icon: 'fa-apple-alt'
        },
        {
          id: 'meal-dinner',
          title: 'Dinner',
          mealType: 'dinner',
          items: [
            'Baked salmon with roasted vegetables',
            'Grilled lean steak with steamed broccoli',
            'Stir fry with tofu and mixed vegetables'
          ].map(item => cleanItemText(item)),
          icon: 'fa-moon'
        }
      ];
      
      // Add all default meal sections
      mealSections.push(...defaultMealSections);
    }

    // Reorganize meal plans by days to match workout days
    const mealPlansByDay = [];
    const numDays = requestedDays;
    
    // Get all available meal types
    const mealTypes = ['breakfast', 'lunch', 'snack', 'dinner'];
    
    // Create a meal plan for each day with unique meals
    for (let day = 1; day <= numDays; day++) {
      const dayMeals = {
        id: `meal-day-${day}`,
        dayNumber: day,
        meals: []
      };
      
      // Define unique meals for each day and type
      const daySpecificMeals = {
        'breakfast': [
          // Day 1
          [
            'Oatmeal with berries and nuts',
            'Greek yogurt with honey and granola',
            'Vegetable omelette with whole grain toast'
          ],
          // Day 2
          [
            'Whole grain pancakes with maple syrup and fresh fruit',
            'Avocado toast with poached eggs',
            'Protein smoothie with banana and spinach'
          ],
          // Day 3 
          [
            'Breakfast burrito with eggs, beans, and vegetables',
            'Cottage cheese with pineapple and walnuts',
            'Whole grain cereal with almond milk and sliced banana'
          ],
          // Day 4
          [
            'Scrambled eggs with smoked salmon and whole grain bread',
            'Chia seed pudding with berries and honey',
            'Whole grain toast with peanut butter and banana'
          ],
          // Day 5
          [
            'Quinoa breakfast bowl with fruits and nuts',
            'Protein pancakes with Greek yogurt topping',
            'Vegetable frittata with a side of fruit'
          ],
          // Day 6
          [
            'Breakfast quesadilla with eggs and vegetables',
            'Overnight oats with apple and cinnamon',
            'Protein waffles with fresh berries'
          ],
          // Day 7
          [
            'Egg white scramble with vegetables and feta cheese',
            'Smoothie bowl with granola and mixed seeds',
            'Whole grain toast with hummus and sliced tomatoes'
          ]
        ],
        'lunch': [
          // Day 1
          [
            'Grilled chicken salad with olive oil dressing',
            'Quinoa bowl with vegetables and lean protein',
            'Turkey wrap with whole grain tortilla'
          ],
          // Day 2
          [
            'Tuna salad sandwich on whole grain bread',
            'Lentil soup with a side of mixed greens',
            'Chicken and vegetable stir-fry with brown rice'
          ],
          // Day 3
          [
            'Mediterranean chickpea salad with feta cheese',
            'Sweet potato and black bean bowl',
            'Grilled salmon with roasted vegetables'
          ],
          // Day 4
          [
            'Turkey and avocado wrap with mixed vegetables',
            'Cauliflower rice bowl with grilled shrimp',
            'Quinoa salad with roasted vegetables and lemon dressing'
          ],
          // Day 5
          [
            'Chicken and vegetable soup with whole grain crackers',
            'Beef and broccoli with brown rice',
            'Greek salad with grilled chicken and olive oil dressing'
          ],
          // Day 6
          [
            'Spinach salad with grilled tofu and pumpkin seeds',
            'Turkey burger with sweet potato fries',
            'Stuffed bell peppers with ground turkey and quinoa'
          ],
          // Day 7
          [
            'Sushi bowl with brown rice, avocado and salmon',
            'Vegetable and lentil curry with brown rice',
            'Chicken Caesar salad with homemade dressing'
          ]
        ],
        'snack': [
          // Day 1
          [
            'Apple slices with almond butter',
            'Carrot sticks with hummus',
            'Handful of mixed nuts'
          ],
          // Day 2
          [
            'Greek yogurt with berries',
            'Celery sticks with peanut butter',
            'Hard-boiled egg with salt and pepper'
          ],
          // Day 3
          [
            'Protein bar (homemade or low-sugar option)',
            'Cucumber slices with tzatziki dip',
            'Air-popped popcorn with nutritional yeast'
          ],
          // Day 4
          [
            'Cherry tomatoes with mozzarella cheese',
            'Rice cakes with avocado',
            'Trail mix with dried fruits and seeds'
          ],
          // Day 5
          [
            'Roasted chickpeas with spices',
            'Pear slices with ricotta cheese',
            'Edamame beans with sea salt'
          ],
          // Day 6
          [
            'Protein smoothie with berries and spinach',
            'Turkey jerky with no added sugars',
            'Cottage cheese with pineapple chunks'
          ],
          // Day 7
          [
            'Kale chips with olive oil and sea salt',
            'Tuna on whole grain crackers',
            'Orange slices with a handful of almonds'
          ]
        ],
        'dinner': [
          // Day 1
          [
            'Baked salmon with roasted vegetables',
            'Grilled lean steak with steamed broccoli',
            'Stir fry with tofu and mixed vegetables'
          ],
          // Day 2
          [
            'Grilled chicken breast with quinoa and asparagus',
            'Baked cod with sweet potato and green beans',
            'Turkey meatballs with zucchini noodles'
          ],
          // Day 3
          [
            'Lentil and vegetable curry with brown rice',
            'Grilled shrimp skewers with mixed vegetables',
            'Stuffed bell peppers with lean ground beef and quinoa'
          ],
          // Day 4
          [
            'Baked chicken thighs with roasted root vegetables',
            'Salmon burger with avocado and mixed greens',
            'Vegetable lasagna with whole grain noodles'
          ],
          // Day 5
          [
            'Turkey chili with beans and vegetables',
            'Baked tilapia with steamed bok choy and quinoa',
            'Grilled pork tenderloin with roasted Brussels sprouts'
          ],
          // Day 6
          [
            'Shrimp and vegetable paella with brown rice',
            'Baked chicken with lemon and herbs, side of green beans',
            'Beef stir-fry with mixed vegetables and brown rice'
          ],
          // Day 7
          [
            'Grilled fish tacos with avocado and salsa',
            'Roasted turkey breast with sweet potatoes and green beans',
            'Eggplant parmesan with side salad'
          ]
        ]
      };
        
      // For each meal type, get the appropriate day's meals
      mealTypes.forEach(mealType => {
        const dayIndex = (day - 1) % 7; // Cycle through 7 days of meals
        
        // Get day-specific meals for this meal type
        const dayMealsForType = daySpecificMeals[mealType][dayIndex].map(item => cleanItemText(item));
        
        const iconMap = {
          'breakfast': 'fa-sun',
          'lunch': 'fa-utensils',
          'snack': 'fa-apple-alt',
          'dinner': 'fa-moon'
        };
        
        dayMeals.meals.push({
          id: `meal-day-${day}-${mealType}`,
          title: mealType.charAt(0).toUpperCase() + mealType.slice(1),
          mealType: mealType,
          items: dayMealsForType,
          icon: iconMap[mealType]
        });
      });
      
      mealPlansByDay.push(dayMeals);
    }

    if (workoutSections.length === 0) {
      // Create a default 7-day workout plan instead of just one day
      const defaultWorkouts = [
        {
          id: 'workout-0',
          dayNumber: 1,
          mainTitle: 'Cardio',
          workoutType: 'Cardiovascular Training',
          exercises: [
            '30 minutes of walking or light jogging',
            '10-15 minutes of stretching',
            'Basic bodyweight exercises like jumping jacks and high knees'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-heartbeat'
        },
        {
          id: 'workout-1',
          dayNumber: 2,
          mainTitle: 'Upper Body',
          workoutType: 'Strength Training',
          exercises: [
            'Push-ups (3 sets of 10-15 reps)',
            'Dumbbell rows or resistance band pulls',
            'Shoulder presses or lateral raises'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-dumbbell'
        },
        {
          id: 'workout-2',
          dayNumber: 3,
          mainTitle: 'Active Recovery',
          workoutType: 'Flexibility & Mobility',
          exercises: [
            '20-30 minutes of yoga or gentle stretching',
            'Foam rolling for major muscle groups',
            'Light walking or swimming'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-spa'
        },
        {
          id: 'workout-3',
          dayNumber: 4,
          mainTitle: 'Lower Body',
          workoutType: 'Strength Training',
          exercises: [
            'Bodyweight squats (3 sets of 15-20 reps)',
            'Lunges (forward and side)',
            'Calf raises and glute bridges'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-running'
        },
        {
          id: 'workout-4',
          dayNumber: 5,
          mainTitle: 'Cardio & Core',
          workoutType: 'Endurance Training',
          exercises: [
            '25 minutes of interval training (alternate between 1 min high and 2 min low intensity)',
            'Plank variations (30 seconds each)',
            'Bicycle crunches and leg raises'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-heartbeat'
        },
        {
          id: 'workout-5',
          dayNumber: 6,
          mainTitle: 'Full Body',
          workoutType: 'Circuit Training',
          exercises: [
            'Full body circuit (30 seconds each exercise, minimal rest)',
            'Combination of upper and lower body movements',
            'Core exercises like mountain climbers and Russian twists'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-dumbbell'
        },
        {
          id: 'workout-6',
          dayNumber: 7,
          mainTitle: 'Rest Day',
          workoutType: 'Active Recovery',
          exercises: [
            'Light walking or gentle movement',
            'Full body stretching session',
            'Self-massage or foam rolling'
          ].map(exercise => cleanItemText(exercise)),
          icon: 'fa-bed'
        }
      ];
      
      // Add all default workout days
      workoutSections.push(...defaultWorkouts);
    }

    // Update state with parsed sections
    setMealSections(mealSections);
    setMealPlansByDay(mealPlansByDay);
    setWorkoutSections(workoutSections);
  };

  const [mealSections, setMealSections] = useState([]);
  const [mealPlansByDay, setMealPlansByDay] = useState([]);
  const [workoutSections, setWorkoutSections] = useState([]);

  const toggleAccordion = (type, section) => {
    if (type === 'meal') {
      setOpenMealAccordion(openMealAccordion === section ? '' : section);
      // Reset sub-accordion when main accordion changes
      setOpenMealSubAccordion('');
    } else if (type === 'meal-sub') {
      setOpenMealSubAccordion(openMealSubAccordion === section ? '' : section);
    } else {
      setOpenWorkoutAccordion(openWorkoutAccordion === section ? '' : section);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // Set the goal immediately (even if it's the same as before)
    setFitnessGoal(suggestion);
    
    // Always show the popup with the goal details when a suggestion is clicked
    if (suggestion && goalData[suggestion]) {
      showGoalPopup(suggestion);
    }
  };

  const showGoalPopup = (goal) => {
    // Reset popup state completely before showing with new goal
    if (popupRef.current) {
      // Force popup to reset
      popupRef.current.scrollTop = 0;
    }
    
    // Set the current goal that was clicked
    setCurrentPopupGoal(goal);
    
    // Reset form state to empty values, but keep timeframe at default value
    setFormData({
      age: '',
      gender: '',
      height: '',
      currentWeight: '',
      targetWeight: '',
      activityLevel: '',
      experienceLevel: '',
      workoutDays: '',
      timeframe: '3',
      healthConditions: []
    });
    
    // Small timeout to ensure DOM updates before showing the popup
    setTimeout(() => {
      setShowPopup(true);
    }, 10);
  };

  const closeGoalPopup = () => {
    // Animate out first
    if (popupRef.current) {
      popupRef.current.classList.remove('active');
      
      // Small delay to allow animation to complete
      setTimeout(() => {
        setShowPopup(false);
        // Only clear the current popup goal after animation finishes
        // This ensures the popup content doesn't flicker during close animation
        setTimeout(() => {
          setCurrentPopupGoal(null);
          
          // Restore scroll position if needed
          const scrollY = document.body.style.top;
          if (scrollY) {
            window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
          }
        }, 100);
      }, 200);
    } else {
      setShowPopup(false);
      setCurrentPopupGoal(null);
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'select-multiple') {
      const options = e.target.options;
      const selectedOptions = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedOptions.push(options[i].value);
        }
      }
      setFormData({
        ...formData,
        [name]: selectedOptions
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPopupGoal) return;
    
    // Validate required fields
    if (!formData.age || !formData.gender || !formData.height || 
        !formData.currentWeight || !formData.targetWeight || 
        !formData.activityLevel || !formData.experienceLevel || 
        !formData.workoutDays) {
      alert('Please fill in all required fields.');
      return;
    }
    
    // Close popup before proceeding
    closeGoalPopup();
    
    // Set the input value to show what's being processed
    setFitnessGoal(currentPopupGoal);
    
    // Format the user prompt with form data
    const requestedDays = parseInt(formData.workoutDays) || 5; // Default to 5 days if parsing fails
    
    // Build the prompt dynamically based on filled fields
    let enhancedUserPrompt = `Goal: ${currentPopupGoal} (Please respond in English with both MEAL_PLAN and WORKOUT_PLAN). `;
    
    // Add required fields
    enhancedUserPrompt += `I am a ${formData.age} year old ${formData.gender} with a height of ${formData.height}cm. `;
    enhancedUserPrompt += `My current weight is ${formData.currentWeight}kg and I want to reach ${formData.targetWeight}kg. `;
    enhancedUserPrompt += `I am ${formData.activityLevel} and have ${formData.experienceLevel} experience level. `;
    enhancedUserPrompt += `I prefer to workout ${formData.workoutDays} days per week. `;
    
    // Add optional fields if provided
    if (formData.timeframe) {
      enhancedUserPrompt += `I want to achieve my goal in ${formData.timeframe} months. `;
    }
    
    // Add health conditions if any are selected (and not "none")
    if (formData.healthConditions.length > 0 && !formData.healthConditions.includes('none')) {
      enhancedUserPrompt += `I have the following health conditions: ${formData.healthConditions.join(', ')}. `;
      
      // Give more tailored instructions if health conditions exist
      enhancedUserPrompt += `Please provide specific modifications for my meals and workouts that accommodate these health conditions. `;
    }
    
    // Always show loading and get a fresh response for form submissions
    console.log('Setting loading state to true for form submission');
    setIsLoading(true);
    setShowPlans(false);
  
    try {
      console.clear();
      
      // System prompt to enforce English responses
      const systemPrompt = `You are a fitness assistant. ALWAYS respond in English regardless of the input language.

IMPORTANT: All responses MUST be in English, even if the user's prompt is in another language.

MEAL_PLAN:
Provide a detailed meal plan for each section (Breakfast, Snack, Lunch, Dinner) with multiple items listed and clear varieties. Use numbers (1., 2., 3.) instead of dashes. The meal type (e.g., Breakfast, Snack) and all meal descriptions must be in English.

WORKOUT_PLAN:
- If the user specifies a number of days (e.g., "3 days", "5 days"), provide a workout plan for exactly that many days.
- If no specific days are mentioned, provide a standard 7-day plan.
- Each day should be clearly marked as "Day 1:", "Day 2:", etc.
- List multiple exercises per day, each numbered for better readability.
- All sections and exercise descriptions MUST be in English.
- For muscle gain focus on progressive overload and proper exercise splits.

IMPORTANT: ALWAYS include both a MEAL_PLAN section and a WORKOUT_PLAN section in your response, regardless of what the user asks for.

Ensure each section follows this format exactly to maintain readability and parsing integrity.
Remember: ALWAYS respond in English regardless of the input language.`;

      // Combine system prompt with user prompt
      const combinedPrompt = `${systemPrompt}\n\nUser Query: ${enhancedUserPrompt} (Please provide exactly ${requestedDays} days of workouts)`;

      // Add timestamp to force a fresh response each time
      const timestamp = new Date().getTime();
      const forceNewPrompt = `${combinedPrompt}\n\nTimestamp: ${timestamp}`;

      console.log('Sending API request to backend...');
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: forceNewPrompt,
          forceNew: true  // Add flag to bypass cache on the server
        })
      });

      if (!response.ok) {
        console.error('Server response not OK:', response.status, response.statusText);
        throw new Error(`Failed to fetch data from server: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw response from server:', data);
      
      if (!data.reply) {
        console.error('No reply in response data:', data);
        throw new Error('Server response missing reply field');
      }
      
      const cleanedResponse = formatResponse(data.reply);
      
      console.log('=== Fitness Plan Generated ===');
      console.log('Goal:', currentPopupGoal);
      console.log('Form Data:', formData);
      console.log('Requested Days:', requestedDays);
      console.log('\nChatGPT Response:');
      console.log(cleanedResponse);
      console.log('==================');

      // Check if response contains the expected sections
      if (!cleanedResponse.includes('MEAL_PLAN:') || !cleanedResponse.includes('WORKOUT_PLAN:')) {
        console.error('Response missing required sections:', cleanedResponse);
        
        // Force format the response if needed
        const forcedResponse = `MEAL_PLAN:\nBreakfast: ${data.reply.includes('Breakfast') ? data.reply.split('Breakfast')[1].split('\n')[0] : 'Healthy breakfast options'}\n\nLunch: ${data.reply.includes('Lunch') ? data.reply.split('Lunch')[1].split('\n')[0] : 'Nutritious lunch options'}\n\nDinner: ${data.reply.includes('Dinner') ? data.reply.split('Dinner')[1].split('\n')[0] : 'Balanced dinner options'}\n\nWORKOUT_PLAN:\nDay 1: ${data.reply.includes('Day 1') ? data.reply.split('Day 1')[1].split('\n')[0] : 'Full body workout'}\n`;
        
        console.log('Reformatted response:', forcedResponse);
        parseResponse(forcedResponse, requestedDays);
      } else {
        parseResponse(cleanedResponse, requestedDays);
      }
      
      setLastProcessedGoal(currentPopupGoal);
      setIsLoading(false);
      setShowPlans(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
      alert(`Failed to fetch recommendations: ${error.message}. Please try again.`);
    }
  };

  // Effect for loading animation
  useEffect(() => {
    if (isLoading) {
      console.log('Loading state changed to true, triggering animation');
      animateLoadingIcons();
    } else {
      console.log('Loading state changed to false');
      // No need to clean up CSS animations, they'll stop automatically
    }
  }, [isLoading]);

  // Effect to manage modal behavior
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showPopup) {
        closeGoalPopup();
      }
    };
    
    // Handle window resize to ensure popup stays centered horizontally
    const handleResize = () => {
      if (showPopup && popupRef.current) {
        // Force reflow of the popup to ensure it's centered after resize
        const popup = popupRef.current;
        popup.style.display = 'none';
        // Force reflow
        void popup.offsetHeight;
        popup.style.display = 'block';
      }
    };
    
    // Reset popup on each open to ensure fresh rendering
    if (showPopup && popupRef.current && currentPopupGoal) {
      const iconElement = popupRef.current.querySelector('.goal-popup-icon');
      if (iconElement && goalData[currentPopupGoal]) {
        iconElement.style.color = goalData[currentPopupGoal].color;
      }
      
      // Make sure we're at top of popup content
      popupRef.current.scrollTop = 0;
      
      // Ensure popup is visible even if page is scrolled
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    
    // Lock body scroll when popup is open
    if (showPopup) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    
    document.addEventListener('keydown', handleEsc);
    window.addEventListener('resize', handleResize);
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
      window.removeEventListener('resize', handleResize);
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      document.body.style.overflow = '';
    };
  }, [showPopup, currentPopupGoal]);

  // Helper function to estimate calories for a meal item
  const estimateCalories = (mealItem) => {
    // Common keywords and their estimated calorie contributions
    const calorieEstimates = {
      'oatmeal': 150,
      'yogurt': 120,
      'greek yogurt': 130,
      'berries': 50,
      'banana': 105,
      'apple': 95,
      'orange': 62,
      'nuts': 160,
      'almond': 165,
      'peanut butter': 190,
      'eggs': 140,
      'egg': 70,
      'toast': 75,
      'bread': 80,
      'whole grain': 90,
      'chicken': 165,
      'salmon': 208,
      'fish': 180,
      'tuna': 120,
      'salad': 100,
      'rice': 130,
      'quinoa': 120,
      'avocado': 234,
      'protein': 120,
      'smoothie': 150,
      'vegetables': 50,
      'veggies': 50,
      'broccoli': 55,
      'sweet potato': 103,
      'potato': 160,
      'hummus': 166,
      'olive oil': 120,
      'cheese': 113,
      'milk': 103,
      'protein bar': 200,
      'granola': 120,
      'honey': 64,
      'fruit': 60,
      'steak': 250,
      'beef': 213,
      'turkey': 165,
      'tofu': 144,
      'lentils': 230,
      'beans': 132,
      'soup': 170,
      'wrap': 245,
      'sandwich': 260,
      'pasta': 200,
      'noodles': 190,
      'snack': 100,
    };

    // Convert meal item to lowercase for matching
    const itemLower = mealItem.toLowerCase();
    
    // Calculate total calories based on matching keywords
    let totalCalories = 0;
    let matched = false;

    // Check for each keyword in the meal item
    Object.entries(calorieEstimates).forEach(([keyword, calories]) => {
      if (itemLower.includes(keyword)) {
        totalCalories += calories;
        matched = true;
      }
    });

    // If no specific ingredients matched, estimate based on meal type indicators
    if (!matched) {
      if (itemLower.includes('breakfast')) totalCalories = 300;
      else if (itemLower.includes('lunch')) totalCalories = 400;
      else if (itemLower.includes('dinner')) totalCalories = 500;
      else if (itemLower.includes('snack')) totalCalories = 150;
      else totalCalories = 200; // Default calories if no matches
    }

    return totalCalories;
  };

  // Calculate calories for a meal (sum of all items)
  const calculateMealCalories = (items) => {
    return items.reduce((total, item) => total + estimateCalories(item), 0);
  };

  // Calculate total daily calories
  const calculateDailyCalories = (meals) => {
    return meals.reduce((total, meal) => {
      const mealCalories = calculateMealCalories(meal.items);
      return total + mealCalories;
    }, 0);
  };

  return (
    <div className="ai-coach-container">
      <h1>
        <i className="fas fa-heartbeat title-icon"></i>
        Ask Your AI Coach
      </h1>

      <div className="input-section">
        <div className="input-container">
          <textarea
            id="fitnessGoal"
            className="goal-input"
            placeholder="Enter your fitness goal..."
            value={fitnessGoal}
            onChange={(e) => {
              setFitnessGoal(e.target.value);
              // Auto-adjust height based on content, with a minimum height
              e.target.style.height = '42px';
              e.target.style.height = `${Math.max(e.target.scrollHeight, 42)}px`;
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleRecommendation();
              }
            }}
            rows="1"
          />
          <button
            className="recommend-button"
            onClick={(e) => {
              e.preventDefault();
              handleRecommendation();
            }}
          >
            Get Recommendations
          </button>
        </div>

        <div className="suggestions-container">
          <div className="suggestions-title">Popular Goals:</div>
          <div className="suggestion-chips">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-chip"
                data-goal={suggestion.text}
                style={{ animation: `fadeInUp 0.5s ease forwards ${index * 0.1}s` }}
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                <i className={`fas ${suggestion.icon}`}></i>
                {suggestion.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading-animation" id="loadingAnimation">
          <div className="loader-container">
            <i className="fas fa-dumbbell loader-icon"></i>
            <i className="fas fa-running loader-icon"></i>
            <i className="fas fa-heart loader-icon"></i>
            <i className="fas fa-fire loader-icon"></i>
            <i className="fas fa-mountain loader-icon"></i>
          </div>
          <p className="loading-text">Crafting your personalized plan...</p>
        </div>
      )}

      {showPlans && (
        <div
          className="plans-container"
          id="plansContainer"
          ref={plansContainerRef}
        >
          <div className="plan-section">
            <div className="plan-header">
              <i className="fas fa-utensils plan-icon"></i>
              <h2>Meal Plan</h2>
            </div>
            <div className="accordion" id="mealAccordion" ref={mealAccordionRef}>
              {mealPlansByDay.map((dayPlan, index) => (
                <div
                  key={dayPlan.id}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-meal={`day${dayPlan.dayNumber}`}
                    onClick={() => toggleAccordion('meal', `day${dayPlan.dayNumber}`)}
                  >
                    <div className="day-header-content">
                      <i className="fas fa-calendar-day accordion-icon"></i>
                      <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Day {dayPlan.dayNumber}</span>
                    </div>
                    <div className="day-header-right">
                      <div className="total-calories">
                        <i className="fas fa-fire-alt"></i>
                        {Math.round(calculateDailyCalories(dayPlan.meals))} cal/day
                      </div>
                      <i
                        className="fas fa-chevron-right accordion-arrow"
                        style={{
                          transform: openMealAccordion === `day${dayPlan.dayNumber}` ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}
                      ></i>
                    </div>
                  </div>
                  <div
                    className="accordion-content"
                    style={{
                      display: openMealAccordion === `day${dayPlan.dayNumber}` ? 'block' : 'none',
                      animation: openMealAccordion === `day${dayPlan.dayNumber}` ? 'slideDown 0.3s ease forwards' : 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div className="nested-accordion">
                      {dayPlan.meals.map((meal, mealIndex) => (
                        <div key={meal.id} className="nested-accordion-item">
                          <div 
                            className="nested-accordion-header"
                            data-meal-type={meal.mealType}
                            onClick={() => toggleAccordion('meal-sub', `${dayPlan.dayNumber}-${meal.mealType}`)}
                          >
                            <div className="meal-header-content">
                              <i className={`fas ${meal.icon} nested-accordion-icon`}></i>
                              <span style={{ fontSize: '1rem', fontWeight: '500' }}>{meal.title}</span>
                            </div>
                            <div className="meal-header-right">
                              <span className="calories-info">
                                {calculateMealCalories(meal.items)} cal
                              </span>
                              <i
                                className="fas fa-chevron-right nested-accordion-arrow"
                                style={{
                                  transform: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.mealType}` ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}
                              ></i>
                            </div>
                          </div>
                          <div
                            className="nested-accordion-content"
                            style={{
                              display: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.mealType}` ? 'block' : 'none',

                              animation: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.mealType}` ? 'slideDown 0.3s ease forwards' : 'none'
                            }}
                          >
                            <ul className="numbered-list" >
                              {meal.items.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="plan-section">
            <div className="plan-header">
              <i className="fas fa-dumbbell plan-icon"></i>
              <h2>Workout Plan</h2>
            </div>
            <div className="accordion" id="workoutAccordion" ref={workoutAccordionRef}>
              {workoutSections.map((section, index) => (
                <div
                  key={section.id}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-day={`day${section.dayNumber}`}
                    onClick={() => toggleAccordion('workout', `day${section.dayNumber}`)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <i className={`fas ${section.icon} accordion-icon`}></i>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Day {section.dayNumber}: {section.mainTitle}</span>
                        <span style={{ fontSize: '0.9rem', color: '#7f8c8d', marginTop: '4px' }}>
                          {section.workoutType}
                        </span>
                      </div>
                    </div>
                    <i
                      className="fas fa-chevron-right accordion-arrow"
                      style={{
                        transform: openWorkoutAccordion === `day${section.dayNumber}` ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}
                    ></i>
                  </div>
                  <div
                    className="accordion-content"
                    style={{
                      display: openWorkoutAccordion === `day${section.dayNumber}` ? 'block' : 'none',
                      animation: openWorkoutAccordion === `day${section.dayNumber}` ? 'slideDown 0.3s ease forwards' : 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <ul className="numbered-list">
                      {section.exercises.map((exercise, i) => (
                        <li key={i}>{exercise}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Popup Overlay */}
      <div
        className={`popup-overlay ${showPopup ? 'active' : ''}`}
        id="popupOverlay"
        ref={overlayRef}
        onClick={closeGoalPopup}
      ></div>

      {/* Goal Popup */}
      <div
        className={`goal-popup ${showPopup ? 'active' : ''}`}
        id="goalPopup"
        ref={popupRef}
        style={{ display: showPopup ? 'block' : 'none' }}
      >
        <i className="fas fa-times goal-popup-close" id="closePopup" onClick={closeGoalPopup}></i>
        {currentPopupGoal && goalData[currentPopupGoal] && (
          <>
            <i
              key={`icon-${currentPopupGoal}`}
              className={`fas ${goalData[currentPopupGoal].icon} goal-popup-icon`}
              style={{ color: goalData[currentPopupGoal].color }}
            ></i>
            <h2 className="goal-popup-title">{currentPopupGoal}</h2>
            <p className="goal-popup-description">{goalData[currentPopupGoal].description}</p>
          </>
        )}
        <form className="goal-popup-form" id="goalForm" onSubmit={handleFormSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="age"
                name="age"
                min="16"
                max="100"
                required
                value={formData.age}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender <span className="required-asterisk">*</span></label>
              <select
                id="gender"
                name="gender"
                required
                value={formData.gender}
                onChange={handleFormChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="height">Height (cm) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="height"
                name="height"
                min="120"
                max="250"
                required
                value={formData.height}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="currentWeight">Current Weight (kg) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="currentWeight"
                name="currentWeight"
                min="30"
                max="200"
                step="0.1"
                required
                value={formData.currentWeight}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="targetWeight">Target Weight (kg) <span className="required-asterisk">*</span></label>
              <input
                type="number"
                id="targetWeight"
                name="targetWeight"
                min="30"
                max="200"
                step="0.1"
                required
                value={formData.targetWeight}
                onChange={handleFormChange}
              />
            </div>
            <div className="form-group">
              <label htmlFor="activityLevel">Activity Level <span className="required-asterisk">*</span></label>
              <select
                id="activityLevel"
                name="activityLevel"
                required
                value={formData.activityLevel}
                onChange={handleFormChange}
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary (little or no exercise)</option>
                <option value="light">Lightly active (light exercise 1-3 days/week)</option>
                <option value="moderate">Moderately active (moderate exercise 3-5 days/week)</option>
                <option value="very">Very active (hard exercise 6-7 days/week)</option>
                <option value="extra">Extra active (very hard exercise & physical job)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="experienceLevel">Experience Level <span className="required-asterisk">*</span></label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                required
                value={formData.experienceLevel}
                onChange={handleFormChange}
              >
                <option value="">Select experience level</option>
                <option value="beginner">Beginner (0-1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="workoutDays">Preferred Workout Days <span className="required-asterisk">*</span></label>
              <select
                id="workoutDays"
                name="workoutDays"
                required
                value={formData.workoutDays}
                onChange={handleFormChange}
              >
                <option value="">Select workout days</option>
                <option value="3">3 days per week</option>
                <option value="4">4 days per week</option>
                <option value="5">5 days per week</option>
                <option value="6">6 days per week</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="timeframe">Target Timeframe (months) <span className="optional-label">(Optional)</span></label>
            <input
              type="range"
              id="timeframe"
              name="timeframe"
              min="1"
              max="12"
              value={formData.timeframe}
              onChange={handleFormChange}
            />
            <div className="range-value" id="timeframeValue">
              {formData.timeframe} months
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="healthConditions">Health Conditions (Optional)</label>
            <select
              id="healthConditions"
              name="healthConditions"
              multiple
              value={formData.healthConditions}
              onChange={handleFormChange}
            >
              <option value="none">None</option>
              <option value="backPain">Back Pain</option>
              <option value="jointIssues">Joint Issues</option>
              <option value="heartCondition">Heart Condition</option>
              <option value="diabetes">Diabetes</option>
              <option value="asthma">Asthma</option>
              <option value="hypertension">Hypertension</option>
            </select>
          </div>

          <div className="popup-buttons">
            <button
              type="button"
              className="popup-button cancel"
              id="cancelForm"
              onClick={closeGoalPopup}
            >
              Cancel
            </button>
            <button type="submit" className="popup-button submit">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <>
     <div>
      <AIFitnessCoach />
     </div>
    </>
  );
}

export default App;