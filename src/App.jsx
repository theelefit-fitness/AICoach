import "./App.css";
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ref, push, serverTimestamp } from 'firebase/database';
import { database } from './firebase';

const AIFitnessCoach = () => {
  // State management
  const [fitnessGoal, setFitnessGoal] = useState('');
  const [showPlans, setShowPlans] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastProcessedGoal, setLastProcessedGoal] = useState('');
  const [openMealAccordion, setOpenMealAccordion] = useState('');
  const [openMealSubAccordion, setOpenMealSubAccordion] = useState('');
  const [openWorkoutAccordion, setOpenWorkoutAccordion] = useState('');
  const [currentPopupGoal, setCurrentPopupGoal] = useState(null);
  const [timeline, setTimeline] = useState(3); // Default 3 months
  const [weeklySchedule, setWeeklySchedule] = useState(7); // Default 7 days
  const [expectedResults, setExpectedResults] = useState('');
  const [inputError, setInputError] = useState(false); // Added for error state
  const [inputLocked, setInputLocked] = useState(true); // Default to locked
  const [isCustomerLoggedIn, setIsCustomerLoggedIn] = useState(false); // Shopify customer state
  const [customerData, setCustomerData] = useState(null); // Shopify customer data
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

  // Data
  const suggestions = [
    { text: "Lose Weight", icon: "fa-fire" },
    { text: "Build Muscle", icon: "fa-dumbbell" },
    { text: "Get Fit", icon: "fa-running" },
    { text: "Get Stronger", icon: "fa-mountain" },
    { text: "Stay Flexible", icon: "fa-stopwatch" },
    { text: "Be Athletic", icon: "fa-chart-line" }
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
    "Get Fit": {
      icon: "fa-running",
      color: "#2ecc71",
      description: "Enhance your cardiovascular fitness through consistent aerobic exercises."
    },
    "Get Stronger": {
      icon: "fa-mountain",
      color: "#f1c40f",
      description: "Focus on progressive overload and compound movements for overall strength."
    },
    "Stay Flexible": {
      icon: "fa-stopwatch",
      color: "#9b59b6",
      description: "Incorporate stretching and mobility exercises for better range of motion."
    },
    "Be Athletic": {
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

  // API endpoint for production or development
  const getApiUrl = () => {
    // Use env variable if available, otherwise fallback to these options
    if (process.env.NODE_ENV === 'development') {
      return 'http://127.0.0.1:5000/chat'; // Local development
    } else {
      // In production, use the EleFit API endpoint 
      return 'https://yantraprise.com/chat';
      // If you're hosting the backend on the same domain, use a relative URL:
      // return '/apps/coach-api/chat';
    }
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
    // Only remove special characters while preserving numbers, dots, and parentheses
    let cleaned = text
      .replace(/[│├─└┌┐•●◆◇▪▫■□★☆\[\]{}*]/g, '') // Remove special characters
      .replace(/\s{3,}/g, '\n\n') // Normalize multiple spaces to double newlines
      .trim();
    
    // Pre-processing for better day detection - add newlines before days
    cleaned = cleaned.replace(/(Day\s*\d+\s*[-:])/gi, '\n$1');
    
    // Ensure consistent formatting for meal plans
    cleaned = cleaned.replace(/MEAL_PLAN(?:\s+for\s+[\w\s]+)?:/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/WORKOUT_PLAN(?:\s+for\s+[\w\s]+)?:/gi, 'WORKOUT_PLAN:');
    
    // Handle variations in header formats
    cleaned = cleaned.replace(/\*\*MEAL PLAN\*\*/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/###\s*MEAL PLAN\s*/gi, 'MEAL_PLAN:');
    cleaned = cleaned.replace(/\*\*WORKOUT PLAN\*\*/gi, 'WORKOUT_PLAN:');
    cleaned = cleaned.replace(/###\s*WORKOUT PLAN\s*/gi, 'WORKOUT_PLAN:');
    
    // Cleanup markdown formatting
    cleaned = cleaned.replace(/\*\*Day\s*(\d+):\*\*\s*/gi, 'Day $1:');
    cleaned = cleaned.replace(/\*\*Total Daily Calories:\*\*\s*(\d+)/gi, 'Total Daily Calories: $1');
    cleaned = cleaned.replace(/\*\*Timeline:\*\*\s*(\d+)\s*months?/gi, 'Timeline: $1 months');
    cleaned = cleaned.replace(/\*\*Weekly Schedule:\*\*\s*(\d+)\s*days?/gi, 'Weekly Schedule: $1 days');
    cleaned = cleaned.replace(/\*\*Expected Results:\*\*\s*/gi, 'Expected Results: ');
    cleaned = cleaned.replace(/\*\*Day\s*(\d+)\s*-\s*([^:]+):\*\*/gi, 'Day $1 - $2:');
    cleaned = cleaned.replace(/\*\*/g, '');
    cleaned = cleaned.replace(/\*/g, '');
    cleaned = cleaned.replace(/---/g, '');
    
    // Ensure there's a clear separator between meal plan and workout plan if both exist
    if (cleaned.includes('MEAL_PLAN:') && cleaned.includes('WORKOUT_PLAN:')) {
      // Make sure WORKOUT_PLAN: is on a new line with proper spacing
      cleaned = cleaned.replace(/WORKOUT_PLAN:/g, '\n\nWORKOUT_PLAN:');
    }
    
    return cleaned;
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

  // Helper functions for icons and types
  const getMealIcon = (mealType) => {
    const iconMap = {
      'Breakfast': 'fa-sun',
      'Lunch': 'fa-utensils',
      'Snack': 'fa-apple-alt',
      'Dinner': 'fa-moon'
    };
    return iconMap[mealType] || 'fa-utensils';
  };

  const getWorkoutIcon = (focusArea) => {
    if (focusArea.toLowerCase().includes('cardio')) return 'fa-heartbeat';
    if (focusArea.toLowerCase().includes('lower')) return 'fa-running';
    if (focusArea.toLowerCase().includes('upper')) return 'fa-dumbbell';
    if (focusArea.toLowerCase().includes('hiit')) return 'fa-bolt';
    if (focusArea.toLowerCase().includes('active')) return 'fa-walking';
    return 'fa-dumbbell';
  };

  const getWorkoutType = (focusArea) => {
    if (focusArea.toLowerCase().includes('cardio')) return 'Cardio & Endurance';
    if (focusArea.toLowerCase().includes('lower')) return 'Lower Body';
    if (focusArea.toLowerCase().includes('upper')) return 'Upper Body';
    if (focusArea.toLowerCase().includes('hiit')) return 'High Intensity';
    if (focusArea.toLowerCase().includes('active')) return 'Active Recovery';
    if (focusArea.toLowerCase().includes('total')) return 'Total Body';
    return 'Mixed Training';
  };

  // Function to store data in Firebase
  const storeSubmissionInFirebase = (prompt) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Try to get customer data from Liquid-injected script first
      let shopifyCustomerId = 'guest';
      let shopifyCustomerName = 'guest';
      let shopifyCustomerEmail = 'guest';
      
      try {
        const customerDataScript = document.getElementById('shopify-customer-data');
        if (customerDataScript) {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.id) {
            shopifyCustomerId = shopifyCustomerData.id;
            shopifyCustomerName = `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim() || 'guest';
            shopifyCustomerEmail = shopifyCustomerData.email || 'guest';
          }
        }
      } catch (e) {
        console.log('Error parsing Shopify customer data script:', e);
      }

      // Fallback to window.customer_data if available
      if (shopifyCustomerId === 'guest' && window.customer_data?.id) {
        shopifyCustomerId = window.customer_data.id;
        shopifyCustomerName = `${window.customer_data.first_name || ''} ${window.customer_data.last_name || ''}`.trim() || 'guest';
        shopifyCustomerEmail = window.customer_data.email || 'guest';
      }

      // Final fallback to other sources
      if (shopifyCustomerId === 'guest' && window.Shopify?.customer?.id) {
        shopifyCustomerId = window.Shopify.customer.id;
        shopifyCustomerName = `${window.Shopify.customer.first_name || ''} ${window.Shopify.customer.last_name || ''}`.trim() || 'guest';
        shopifyCustomerEmail = window.Shopify.customer.email || 'guest';
      }

      const submissionData = {
        prompt: prompt,
        shopifyUserId: shopifyCustomerId,
        shopifyUsername: shopifyCustomerName,
        shopifyUserEmail: shopifyCustomerEmail,
        requestTime: serverTimestamp(),
        clientTimestamp: timestamp,
        isLoggedIn: isCustomerLoggedIn,
        formData: currentPopupGoal ? { ...formData } : null,
        userAgent: navigator.userAgent,
        platform: navigator.platform
      };
      
      console.log('Storing submission in Firebase:', submissionData);
      
      const fitnessGoalsRef = ref(database, 'fitnessGoals');
      push(fitnessGoalsRef, submissionData)
        .then(() => {
          console.log('Successfully stored submission in Firebase');
        })
        .catch((error) => {
          console.error('Firebase push error:', error);
        });
    } catch (error) {
      console.error('Error storing submission in Firebase:', error);
    }
  };

  // Event handlers
  const handleRecommendation = async () => {
    if (!fitnessGoal.trim()) {
      setInputError(true);
      setTimeout(() => setInputError(false), 3000); // Clear error after 3 seconds
      return;
    }
    
    if (isLoading) return;
    
    setInputError(false);
    setIsLoading(true);
    setShowPlans(false);
    setLastProcessedGoal(fitnessGoal);
    
    // Close any open goal form when recommendation button is clicked
    setCurrentPopupGoal(null);

    // Store the submission in Firebase
    storeSubmissionInFirebase(fitnessGoal);

    try {
      // Extract requested days from the prompt if specified
      // Improved regex to catch all formats mentioning days
      let requestedDays = 7; // Default to 7 days
      
      // Try multiple patterns to catch different ways of specifying days
      const dayPatterns = [
        /(\d+)[ -]day/i,                    // "4-day" or "4 day"
        /(\d+)[ -]days/i,                  // "4-days" or "4 days"
        /for[ -](\d+)[ -]days/i,           // "for 4 days"
        /(\d+)[ -]days[ -](?:a[ -])?week/i, // "4 days a week" or "4 days week"
        /(\d+)[ -]times[ -](?:a[ -])?week/i // "4 times a week"
      ];
      
      for (const pattern of dayPatterns) {
        const match = fitnessGoal.match(pattern);
        if (match) {
          requestedDays = parseInt(match[1]);
          console.log(`User requested ${requestedDays} days - matched pattern: ${pattern}`);
          break;
        }
      }

      // Always ensure reasonable bounds
      requestedDays = Math.min(Math.max(requestedDays, 1), 14);
      console.log(`Final requested days count: ${requestedDays}`);
      
      // Check if this is a workout-focused request
      const isWorkoutFocused = /workout|exercise|training|routine|gym/i.test(fitnessGoal);
      console.log(`Is workout-focused request: ${isWorkoutFocused}`);
      
      // Look for cultural/dietary preferences in the input
      const culturalTerms = [
        'indian', 'chinese', 'mexican', 'italian', 'mediterranean', 
        'japanese', 'thai', 'korean', 'french', 'american', 'greek',
        'vegan', 'vegetarian', 'keto', 'halal', 'kosher', 'gluten-free', 
        'pescatarian', 'paleo'
      ];
      
      let detectedCulturalPreferences = [];
      culturalTerms.forEach(term => {
        if (fitnessGoal.toLowerCase().includes(term)) {
          detectedCulturalPreferences.push(term);
        }
      });
      
      if (detectedCulturalPreferences.length > 0) {
        console.log(`Detected cultural/dietary preferences: ${detectedCulturalPreferences.join(', ')}`);
      }
      
      // Look for physical attributes in input (age, weight, height)
      const ageMatch = fitnessGoal.match(/(\d+)\s*(?:years|yrs|yr|y)(?:\s*old)?/i);
      const weightMatch = fitnessGoal.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|pounds|lbs)/i);
      const heightMatch = fitnessGoal.match(/(\d+(?:\.\d+)?)\s*(?:cm|centimeters|meters|m|feet|ft|foot|inches|inch|in)/i);
      
      let physicalAttributes = {};
      if (ageMatch) physicalAttributes.age = ageMatch[1];
      if (weightMatch) physicalAttributes.weight = weightMatch[1];
      if (heightMatch) physicalAttributes.height = heightMatch[1];
      
      if (Object.keys(physicalAttributes).length > 0) {
        console.log(`Detected physical attributes:`, physicalAttributes);
      }

      // Enhanced user prompt with the appropriate number of days and detected preferences
      // Make the day count extremely explicit with redundant phrasing
      let enhancedUserPrompt;
      
      if (isWorkoutFocused) {
        // For workout-focused requests, emphasize the workout plan and day count even more
        enhancedUserPrompt = `${fitnessGoal} IMPORTANT: Please provide EXACTLY ${requestedDays} days of workout plan - no more, no less. Also include a corresponding ${requestedDays}-day meal plan to support these workouts. Each day must include Breakfast, Lunch, Snack, and Dinner with exactly 3 items per meal type, and 4 exercises per workout day.`;
      } else {
        // Standard format for other requests
        enhancedUserPrompt = `${fitnessGoal} Please provide EXACTLY ${requestedDays} days of meal plan and EXACTLY ${requestedDays} days of workout plan. I need ${requestedDays} days total, not more. Each day must include Breakfast, Lunch, Snack, and Dinner with exactly 3 items per meal type, and 4 exercises per workout day.`;
      }
      
      const systemPrompt = `You are a fitness assistant. ALWAYS respond in English regardless of the input language.

IMPORTANT FORMATTING RULES:
1. All responses MUST be in English, even if the user's prompt is in another language.
2. Default time period is 3 months unless specified otherwise.
3. Default workout days is 7 days per week unless specified otherwise.
4. NEVER exceed the number of days requested by the user.
5. EXACTLY 3 items per meal type (no more, no less).
6. EXACTLY 4 exercises per workout day (no more, no less).

MEAL_PLAN FORMAT:
For each day (Day 1 to 7):
Day X:
- Breakfast (XXX calories):
  1. [Meal item 1]
  2. [Meal item 2]
  3. [Meal item 3]
- Lunch (XXX calories):
  1. [Meal item 1]
  2. [Meal item 2]
  3. [Meal item 3]
- Snack (XXX calories):
  1. [Snack item 1]
  2. [Snack item 2]
  3. [Snack item 3]
- Dinner (XXX calories):
  1. [Meal item 1]
  2. [Meal item 2]
  3. [Meal item 3]

Total Daily Calories: XXXX

WORKOUT_PLAN FORMAT:
Timeline: X months
Weekly Schedule: 7 days per week
Expected Results: [Describe expected results after following this plan for the specified months]

For each day (Day 1 to 7):
Day X - [Focus Area]:
1. [Exercise 1 with sets/reps]
2. [Exercise 2 with sets/reps]
3. [Exercise 3 with sets/reps]
4. [Exercise 4 with sets/reps]

Notes:
- Each meal MUST include calorie count
- Each meal type MUST have EXACTLY 3 items
- Each day MUST have a total calorie count
- Each workout day MUST have EXACTLY 4 exercises
- Workouts MUST be appropriate for the specified fitness level
- Include expected results after following the plan for specified months
- Adjust intensity based on experience level
- Consider any health conditions in recommendations

Remember: ALWAYS respond in English regardless of the input language.`;

      // First, check if this query is in the cache
      try {
        const cacheCheckResponse = await fetch(getApiUrl().replace('/chat', '/check-cache'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: enhancedUserPrompt
          })
        });
        
        if (cacheCheckResponse.ok) {
          const cacheData = await cacheCheckResponse.json();
          console.log('Cache check response:', cacheData);
          
          // If we have a cached response, use it
          if (cacheData.cached && cacheData.reply) {
            console.log('Using cached response');
            parseResponse(cacheData.reply);
            setShowPlans(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Cache check failed:', error);
        // Continue with normal request if cache check fails
      }

      // If no cache hit, proceed with normal request
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedUserPrompt,
          forceNew: false
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw response:', data.reply);

      // Format the response to ensure it has the required structure
      let formattedResponse = data.reply;
      
      // Convert markdown headers to our format
      formattedResponse = formattedResponse
        .replace(/###\s*Meal Plan\s*/g, 'MEAL_PLAN:\n')
        .replace(/###\s*Workout Plan\s*/g, '\nWORKOUT_PLAN:\n')
        .replace(/\*\*Day\s*(\d+):\*\*\s*/g, 'Day $1:\n')
        .replace(/\*\*Total Daily Calories:\*\*\s*(\d+)/g, 'Total Daily Calories: $1')
        .replace(/\*\*Timeline:\*\*\s*(\d+)\s*months?/g, 'Timeline: $1 months')
        .replace(/\*\*Weekly Schedule:\*\*\s*(\d+)\s*days?/g, 'Weekly Schedule: $1 days')
        .replace(/\*\*Expected Results:\*\*\s*/g, 'Expected Results: ')
        .replace(/\*\*Day\s*(\d+)\s*-\s*([^:]+):\*\*/g, 'Day $1 - $2:')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/---/g, '');

      // Ensure we have the required markers
      if (!formattedResponse.includes('MEAL_PLAN:')) {
        formattedResponse = 'MEAL_PLAN:\n' + formattedResponse;
      }
      
      if (!formattedResponse.includes('WORKOUT_PLAN:')) {
        const lastDayMatch = formattedResponse.match(/Day\s*7:.*?(?=WORKOUT_PLAN:|$)/s);
        if (lastDayMatch) {
          const insertIndex = lastDayMatch.index + lastDayMatch[0].length;
          formattedResponse = formattedResponse.slice(0, insertIndex) + '\n\nWORKOUT_PLAN:\n' + formattedResponse.slice(insertIndex);
        }
      }

      console.log('Formatted response:', formattedResponse);
      parseResponse(formattedResponse);
      setShowPlans(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const parseResponse = (response) => {
    // Clean up the response first
    let cleanedResponse = formatResponse(response);
    
    console.log('Cleaned response for parsing:', cleanedResponse);

    // Split into meal plan and workout plan sections
    // Use a more robust regex that accounts for various formats
    const mealPlanMatch = cleanedResponse.match(/MEAL_PLAN:([\s\S]*?)(?=WORKOUT_PLAN:|$)/i);
    
    // Try multiple patterns to extract workout plan
    let workoutPlanMatch = cleanedResponse.match(/WORKOUT_PLAN:([\s\S]*?)$/i);
    if (!workoutPlanMatch) {
      console.log('Trying alternate workout plan pattern');
      // Alternative pattern for cases where 'WORKOUT_PLAN:' might be formatted differently
      workoutPlanMatch = cleanedResponse.match(/(?:WORKOUT|EXERCISE)[\s_]*PLAN:?([\s\S]*?)$/i);
    }
    
    // Last resort - if we have markdown sections, try to find workout section after meal plan
    if (!workoutPlanMatch && cleanedResponse.includes('###')) {
      console.log('Trying to find workout section using markdown headers');
      const sections = cleanedResponse.split(/###\s+/);
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].toLowerCase().includes('workout') || 
            sections[i].toLowerCase().includes('exercise')) {
          workoutPlanMatch = {1: sections[i]};
          break;
        }
      }
    }
    
    if (!mealPlanMatch) {
      console.error('Response missing required meal plan section');
      return;
    }

    const mealPlanRaw = mealPlanMatch[1].trim();
    const workoutPlanRaw = workoutPlanMatch ? workoutPlanMatch[1].trim() : '';
    
    console.log('Extracted meal plan:', mealPlanRaw);
    console.log('Extracted workout plan:', workoutPlanRaw);
    
    if (!workoutPlanRaw) {
      console.warn('No workout plan section found - attempting to extract workout info from full response');
      // Search for workout-like content in the entire response as a fallback
      const fullResponseLines = cleanedResponse.split('\n');
      const workoutLines = [];
      let foundWorkoutSection = false;
      
      // Look for workout-related keywords in lines
      for (let i = 0; i < fullResponseLines.length; i++) {
        const line = fullResponseLines[i];
        if (!foundWorkoutSection) {
          // Check if this line indicates the start of workout content
          if (line.match(/work\s*out|exercise|training|fitness/i) && 
              !line.match(/meal|breakfast|lunch|dinner|snack/i)) {
            foundWorkoutSection = true;
            workoutLines.push(line);
          }
        } else {
          // Once we've found the workout section, add lines that don't look like meal content
          if (!line.match(/meal|breakfast|lunch|dinner|snack/i) ||
              line.match(/day\s*\d+|exercise|workout|training/i)) {
            workoutLines.push(line);
          }
        }
      }
      
      if (workoutLines.length > 0) {
        console.log('Found potential workout content:', workoutLines.join('\n'));
        // Use this as our workout plan raw text
        const extractedWorkoutContent = workoutLines.join('\n');
        // Only use this if it looks like workout content
        if (extractedWorkoutContent.match(/day\s*\d+|exercise|workout|training/i)) {
          console.log('Using extracted workout content');
          workoutPlanRaw = extractedWorkoutContent;
        }
      }
    }

    // First, detect how many days are in the response
    const dayMatches = mealPlanRaw.match(/Day\s*\d+:/gi) || [];
    let numDays = dayMatches.length;
    
    // Fallback to default if no days detected
    if (numDays === 0) {
      // Look for a requested day count in the input
      const daysMatch = fitnessGoal.match(/(\d+)[ -]day/i);
      if (daysMatch) {
        numDays = parseInt(daysMatch[1]);
        console.log(`No days detected in response, using requested days from input: ${numDays}`);
      } else {
        numDays = 7;
        console.warn('No days detected in meal plan and none in input, defaulting to 7 days');
      }
    } else {
      // Try to extract the actual day numbers
      let highestDay = 0;
      dayMatches.forEach(match => {
        const dayNum = parseInt(match.match(/\d+/)[0]);
        if (dayNum > highestDay) highestDay = dayNum;
      });
      
      // Use the highest day number found
      if (highestDay > 0 && highestDay !== numDays) {
        console.log(`Found highest day ${highestDay} which differs from day count ${numDays}, using highest day`);
        numDays = highestDay;
      }
    }
    
    console.log(`Detected ${numDays} days in the meal plan response`);

    // Process meal plans by day
    const mealPlansByDay = [];
    let currentDay = null;
    let currentMealType = null;
    let currentMealItems = [];

    // Initialize array with detected number of days
    for (let i = 1; i <= numDays; i++) {
      mealPlansByDay.push({
        dayNumber: i,
        meals: [
          {
            type: 'Breakfast',
            calories: 0,
            items: []
          },
          {
            type: 'Lunch',
            calories: 0,
            items: []
          },
          {
            type: 'Snack',
            calories: 0,
            items: []
          },
          {
            type: 'Dinner',
            calories: 0,
            items: []
          }
        ]
      });
    }

    // Split meal plan into lines and process
    const mealPlanLines = mealPlanRaw.split('\n').map(line => line.trim()).filter(Boolean);
    
    mealPlanLines.forEach(line => {
      // Check for new day
      const dayMatch = line.match(/Day\s*(\d+):/i);
      if (dayMatch) {
        currentDay = parseInt(dayMatch[1]);
        currentMealType = null;
        currentMealItems = [];
        return;
      }

      // Check for meal type with calories - handle multiple formats
      const mealTypeMatch = line.match(/(Breakfast|Lunch|Snack|Dinner)\s*\(?(\d+)?\s*calories?\)?:/i);
      if (mealTypeMatch) {
        currentMealType = mealTypeMatch[1];
        const calories = mealTypeMatch[2] ? parseInt(mealTypeMatch[2]) : 0;
        
        console.log(`Found meal type: ${currentMealType}, calories: ${calories}`);
        
        // Update calories for current meal type
        if (currentDay) {
          const dayIndex = currentDay - 1;
          if (dayIndex >= 0 && dayIndex < mealPlansByDay.length) {
            const mealIndex = mealPlansByDay[dayIndex].meals.findIndex(m => m.type === currentMealType);
            if (mealIndex !== -1) {
              mealPlansByDay[dayIndex].meals[mealIndex].calories = calories;
            }
          }
        }
        return;
      }

      // If line starts with a number or bullet, it's a meal item
      if (/^(\d+\.|[\-•●])/.test(line)) {
        const item = line.replace(/^(\d+\.|[\-•●])\s*/, '').trim();
        if (currentDay && currentMealType) {
          const dayIndex = currentDay - 1;
          if (dayIndex >= 0 && dayIndex < mealPlansByDay.length) {
            const mealIndex = mealPlansByDay[dayIndex].meals.findIndex(m => m.type === currentMealType);
            if (mealIndex !== -1) {
              mealPlansByDay[dayIndex].meals[mealIndex].items.push(item);
            }
          }
        }
      }
    });

    // Process workout plan
    const workoutSections = [];
    let currentWorkoutDay = null;
    let currentWorkoutType = null;
    let currentExercises = [];

    // Make sure we use the same number of days for workouts as detected in meal plan
    // unless workout plan explicitly has a different number of days
    let workoutDayCount = numDays;
    if (workoutPlanRaw) {
      const workoutDayMatches = workoutPlanRaw.match(/Day\s*\d+/gi) || [];
      if (workoutDayMatches.length > 0) {
        // Try to extract the actual day numbers
        let highestWorkoutDay = 0;
        workoutDayMatches.forEach(match => {
          const dayNum = parseInt(match.match(/\d+/)[0]);
          if (dayNum > highestWorkoutDay) highestWorkoutDay = dayNum;
        });
        
        if (highestWorkoutDay > 0) {
          console.log(`Detected ${highestWorkoutDay} days in workout plan`);
          // Use the meal plan day count by default
          workoutDayCount = numDays;
        }
      }
    } else {
      console.error("No workout plan found in response!");
    }

    console.log(`Using ${workoutDayCount} days for workout plan`);

    // Initialize array with appropriate number of days
    for (let i = 1; i <= workoutDayCount; i++) {
      workoutSections.push({
        dayNumber: i,
        workoutType: 'Workout',
        exercises: []
      });
    }

    if (workoutPlanRaw) {
    const workoutPlanLines = workoutPlanRaw.split('\n').map(line => line.trim()).filter(Boolean);
    let isProcessingWorkout = false;
      let timelineFound = false;
      let expectedResultsFound = false;

      console.log("Processing workout plan with lines:", workoutPlanLines.length);

      workoutPlanLines.forEach((line, index) => {
        console.log(`Processing workout line ${index}: ${line}`);
        
        // Capture Timeline and Expected Results but don't process as workout days
        if (line.includes('Timeline:')) {
          timelineFound = true;
          const timelineMatch = line.match(/Timeline:\s*(\d+)\s*months?/i);
          if (timelineMatch) {
            setTimeline(parseInt(timelineMatch[1]));
          }
        return;
      }

        if (line.includes('Weekly Schedule:')) {
          const scheduleMatch = line.match(/Weekly Schedule:\s*(\d+)\s*days?/i);
          if (scheduleMatch) {
            setWeeklySchedule(parseInt(scheduleMatch[1]));
          }
          return;
        }
        
        if (line.includes('Expected Results:')) {
          expectedResultsFound = true;
          const resultsText = line.replace(/Expected Results:\s*/i, '').trim();
          setExpectedResults(resultsText);
          return;
        }

        // Check for workout day header - use a more lenient regex pattern
        // Try multiple patterns to catch different formats
        let dayMatch = line.match(/Day\s*(\d+)(?:\s*-\s*|\s*:\s*)([^:]+)(?::|$)/i);
        if (!dayMatch) {
          // Try alternate format
          dayMatch = line.match(/Day\s*(\d+)\s*[-:]?\s*(.*)/i);
        }
        
      if (dayMatch) {
        currentWorkoutDay = parseInt(dayMatch[1]);
          currentWorkoutType = dayMatch[2] ? dayMatch[2].trim() : 'Workout';
          
          // Clean up the workout type if it contains colons
          if (currentWorkoutType.includes(':')) {
            currentWorkoutType = currentWorkoutType.replace(/:/g, '').trim();
          }
          
        currentExercises = [];
        isProcessingWorkout = true;
          
          console.log(`Found workout day: ${currentWorkoutDay}, type: ${currentWorkoutType}`);
        
        // Update workout type for this day
        const dayIndex = currentWorkoutDay - 1;
        if (dayIndex >= 0 && dayIndex < workoutSections.length) {
          workoutSections[dayIndex].workoutType = currentWorkoutType;
          } else {
            console.warn(`Workout day ${currentWorkoutDay} is out of range (max: ${workoutSections.length})`);
        }
        return;
      }

        // If we're processing a workout and line starts with a number or bullet, it's an exercise
        // Use a more flexible pattern to detect exercise items
        if (isProcessingWorkout && (/^(\d+\.|[\-•●])/.test(line) || /^\d+\s*[.)]/.test(line))) {
          const exercise = line.replace(/^(\d+\s*[.)]|[\-•●])\s*/, '').trim();
        if (currentWorkoutDay) {
          const dayIndex = currentWorkoutDay - 1;
          if (dayIndex >= 0 && dayIndex < workoutSections.length) {
              console.log(`Adding exercise to day ${currentWorkoutDay}: ${exercise}`);
            workoutSections[dayIndex].exercises.push({
              number: workoutSections[dayIndex].exercises.length + 1,
              description: exercise
            });
            } else {
              console.warn(`Cannot add exercise - day ${currentWorkoutDay} out of range (max: ${workoutSections.length})`);
          }
          } else {
            console.warn(`Cannot add exercise - no current workout day set`);
          }
        }
      });

      // If no day sections were found but there are exercise-like entries
      // Try to extract exercises directly without day headers
      if (workoutSections.every(section => section.exercises.length === 0)) {
        console.log("No workout days were detected with exercises, trying fallback parsing");
        
        // Look for lines that could be exercises (numbered items)
        let exerciseLines = workoutPlanLines.filter(line => 
          /^(\d+\s*[.)]|[\-•●])/.test(line) && 
          !line.includes('Timeline:') && 
          !line.includes('Weekly Schedule:') && 
          !line.includes('Expected Results:')
        );
        
        console.log(`Found ${exerciseLines.length} potential exercise lines without day headers`);
        
        // If we have exercises but no days, distribute them evenly
        if (exerciseLines.length > 0) {
          const exercisesPerDay = Math.max(Math.min(4, Math.ceil(exerciseLines.length / workoutDayCount)), 1);
          
          for (let dayIndex = 0; dayIndex < workoutDayCount; dayIndex++) {
            const dayExercises = exerciseLines.splice(0, exercisesPerDay);
            if (dayExercises.length === 0) break;
            
            // Add these exercises to the current day
            dayExercises.forEach(line => {
              const exercise = line.replace(/^(\d+\s*[.)]|[\-•●])\s*/, '').trim();
              workoutSections[dayIndex].exercises.push({
                number: workoutSections[dayIndex].exercises.length + 1,
                description: exercise
              });
            });
            
            // Set a workout type if none exists
            if (workoutSections[dayIndex].workoutType === 'Workout') {
              workoutSections[dayIndex].workoutType = 'General Fitness';
            }
          }
        }
      }
    } else {
      console.error("No workout plan content to process");
    }

    // Log the processed data for debugging
    console.log('Processed meal plans:', mealPlansByDay);
    console.log('Processed workouts:', workoutSections);

    // Log each day of workout data to see what might be missing
    workoutSections.forEach((day, index) => {
      console.log(`Workout Day ${day.dayNumber} - ${day.workoutType}: ${day.exercises.length} exercises`);
    });

    // Update state with appropriate day counts
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
    
    // Clear previous meal and workout plans when a new goal is selected
    setShowPlans(false);
    setMealPlansByDay([]);
    setWorkoutSections([]);
    
    // Instead of showing popup, set the current goal for highlighting and displaying details
    setCurrentPopupGoal(suggestion);
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
    setCurrentPopupGoal(null);
    
    // Set the input value to show what's being processed
    setFitnessGoal(currentPopupGoal);
    
    // Store the submission in Firebase with form data
    storeSubmissionInFirebase(currentPopupGoal + ' (from form)');
    
    // Get the requested days from form data
    const requestedDays = parseInt(formData.workoutDays) || 5; // Default to 5 days if parsing fails
    console.log(`Form submission requesting ${requestedDays} days per week`);
    
    // Calculate BMI for personalization
    const heightInMeters = parseFloat(formData.height) / 100;
    const bmi = parseFloat(formData.currentWeight) / (heightInMeters * heightInMeters);
    const bmiRounded = Math.round(bmi * 10) / 10;
    
    // Calculate weight difference
    const weightDifference = parseFloat(formData.targetWeight) - parseFloat(formData.currentWeight);
    const weightGoalType = weightDifference < 0 ? "lose" : (weightDifference > 0 ? "gain" : "maintain");
    const absWeightDifference = Math.abs(weightDifference);
    
    // Build the prompt dynamically based on filled fields
    let enhancedUserPrompt = `Goal: ${currentPopupGoal} (Please respond in English with both MEAL_PLAN and WORKOUT_PLAN). `;
    
    // Add detailed user profile information
    enhancedUserPrompt += `I am a ${formData.age} year old ${formData.gender} with a height of ${formData.height}cm and a BMI of ${bmiRounded}. `;
    enhancedUserPrompt += `My current weight is ${formData.currentWeight}kg and I want to ${weightGoalType} ${absWeightDifference}kg to reach ${formData.targetWeight}kg. `;
    enhancedUserPrompt += `I am ${formData.activityLevel} and have ${formData.experienceLevel} experience level. `;
    
    // Add explicit day count with redundant wording to ensure the correct number of days
    enhancedUserPrompt += `I prefer to workout ${formData.workoutDays} days per week. Please provide EXACTLY ${requestedDays} days of meal plan and EXACTLY ${requestedDays} days of workout plan. I need ${requestedDays} days total, not more. `;
    
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
      
      // First, check if this query is in the cache
      try {
        const cacheCheckResponse = await fetch(getApiUrl().replace('/chat', '/check-cache'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: enhancedUserPrompt
          })
        });
        
        if (cacheCheckResponse.ok) {
          const cacheData = await cacheCheckResponse.json();
          console.log('Cache check response:', cacheData);
          
          // If we have a cached response, use it
          if (cacheData.cached && cacheData.reply) {
            console.log('Using cached response');
            parseResponse(cacheData.reply);
            setShowPlans(true);
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn('Cache check failed:', error);
        // Continue with normal request if cache check fails
      }

      console.log('Sending API request to backend with user profile data...');
      console.log('User profile:', {
        age: formData.age,
        gender: formData.gender,
        height: formData.height,
        currentWeight: formData.currentWeight,
        targetWeight: formData.targetWeight,
        bmi: bmiRounded,
        weightGoal: weightGoalType,
        activityLevel: formData.activityLevel,
        experienceLevel: formData.experienceLevel,
        workoutDays: formData.workoutDays,
        healthConditions: formData.healthConditions
      });
      
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: enhancedUserPrompt,
          forceNew: false
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

  // Effect to manage popup behavior - remove it since we no longer use popups
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && currentPopupGoal) {
        setCurrentPopupGoal(null);
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [currentPopupGoal]);

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
    if (!items || items.length === 0) return 0;
    let totalCals = 0;
    
    items.forEach(item => {
      const itemCals = estimateCalories(item);
      console.log(`   - Item: "${item.substring(0, 30)}...", Est. calories: ${itemCals}`);
      totalCals += itemCals;
    });
    
    return totalCals;
  };

  // Calculate total daily calories
  const calculateDailyCalories = (meals) => {
    if (!meals || meals.length === 0) return 0;
    
    let totalCalories = 0;
    
    meals.forEach(meal => {
      // Use the meal's calories value if it exists, otherwise calculate from items
      const mealCalories = meal.calories > 0 ? meal.calories : calculateMealCalories(meal.items);
      totalCalories += mealCalories;
      
      // Add console log to debug each meal's calories
      console.log(`Meal: ${meal.type}, Calories: ${mealCalories}, Items: ${meal.items.length}`);
    });
    
    return totalCalories;
  };

  // Function to get actual customer name from Shopify
  const getCustomerName = () => {
    try {
      // Check for Liquid-injected customer data first (most reliable)
      const customerDataScript = document.getElementById('shopify-customer-data');
      if (customerDataScript) {
        try {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.first_name || shopifyCustomerData.last_name) {
            return `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim();
          }
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }
      }

      // Try window.customer_data which might be set by Liquid
      if (window.customer_data) {
        const { first_name, last_name } = window.customer_data;
        if (first_name || last_name) {
          return `${first_name || ''} ${last_name || ''}`.trim();
        }
      }

      // Try other sources
      if (window.Shopify?.customer) {
        const firstName = window.Shopify.customer.first_name || '';
        const lastName = window.Shopify.customer.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) return fullName;
      }

      return null;
    } catch (error) {
      console.error('Error getting customer name:', error);
      return null;
    }
  };

  // Function to check if customer is actually logged in
  const isActuallyLoggedIn = () => {
    try {
      // Check Liquid-injected customer data first
      const customerDataScript = document.getElementById('shopify-customer-data');
      if (customerDataScript) {
        try {
          const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
          if (shopifyCustomerData.id) return true;
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }
      }

      // Check window.customer_data from Liquid
      if (window.customer_data?.id) return true;

      // Check other sources
      if (window.Shopify?.customer?.id) return true;
      if (window.meta?.page?.customerId) return true;
      
      return false;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  };

  // Check for Shopify customer session
  useEffect(() => {
    // Function to check if we're running in Shopify context
    const isInShopifyContext = () => {
      return window.Shopify !== undefined || 
             window.ShopifyAnalytics !== undefined || 
             window.meta?.page?.customerId !== undefined ||
             window.customer !== undefined ||
             document.querySelector('body.template-page') !== null;
    };

    // Function to check customer login status in Shopify
    const checkShopifyCustomer = () => {
      if (!isInShopifyContext() && process.env.NODE_ENV === 'development') {
        const urlParams = new URLSearchParams(window.location.search);
        const loggedIn = urlParams.get('loggedIn') === 'true';
        
        if (loggedIn) {
          console.log('Development mode: Simulating logged-in customer');
          setIsCustomerLoggedIn(true);
          setInputLocked(false);
          setCustomerData({
            id: '12345',
            name: 'Test Customer',
            email: 'test@example.com'
          });
        } else {
          console.log('Development mode: Simulating logged-out customer');
          setIsCustomerLoggedIn(false);
          setInputLocked(true);
        }
        return;
      }

      // Production mode - check actual login status
      const actuallyLoggedIn = isActuallyLoggedIn();
      setIsCustomerLoggedIn(actuallyLoggedIn);
      setInputLocked(!actuallyLoggedIn);

      if (actuallyLoggedIn) {
        // Try to get customer data from Liquid-injected script first
        let customerInfo = null;
        
        try {
          const customerDataScript = document.getElementById('shopify-customer-data');
          if (customerDataScript) {
            const shopifyCustomerData = JSON.parse(customerDataScript.textContent);
            customerInfo = {
              id: shopifyCustomerData.id,
              name: `${shopifyCustomerData.first_name || ''} ${shopifyCustomerData.last_name || ''}`.trim(),
              email: shopifyCustomerData.email
            };
          }
        } catch (e) {
          console.log('Error parsing Shopify customer data script:', e);
        }

        // Fallback to window.customer_data if available
        if (!customerInfo && window.customer_data) {
          customerInfo = {
            id: window.customer_data.id,
            name: `${window.customer_data.first_name || ''} ${window.customer_data.last_name || ''}`.trim(),
            email: window.customer_data.email
          };
        }

        // Final fallback to other sources
        if (!customerInfo) {
          const customerName = getCustomerName();
          if (customerName) {
            customerInfo = {
              id: window.Shopify?.customer?.id || 
                  window.meta?.page?.customerId || 
                  'unknown',
              name: customerName,
              email: window.Shopify?.customer?.email || 
                    window.meta?.page?.customer?.email || 
                    'unknown'
            };
          }
        }

        setCustomerData(customerInfo);
      } else {
        setCustomerData(null);
      }
    };

    // Check for customer data immediately and set up an interval to check periodically
    checkShopifyCustomer();
    const interval = setInterval(checkShopifyCustomer, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, []);

  // Toggle lock handler - redirect to login or unlock based on context
  const toggleInputLock = () => {
    if (isCustomerLoggedIn) {
      // If already logged in, just unlock the input
      setInputLocked(false);
    } else {
      // If not logged in, redirect to Shopify login with correct return URL
      const returnPath = window.reactAiCoachUrl || "/pages/react-ai-coach";
      window.location.href = `https://theelefit.com/account/login?return_to=${returnPath}`;
    }
  };

  return (
    <div className="ai-coach-container">
        
      <h1 className="ai-coach-title">
        Ask our EleFit AI Coach
      </h1>

      <div className="input-section">
      <>
  {isActuallyLoggedIn() && (
    <div className="welcome-message">
      {(() => {
        const customerName = getCustomerName();
        return customerName ? `Welcome back, ${customerName}!` : null;
      })()}
    </div>
  )}

  <div className="input-container">
    <textarea
      id="fitnessGoal"
      className={`goal-input ${inputError ? 'input-error' : ''}`}
      placeholder="Enter your fitness goal..."
      value={fitnessGoal}
      onChange={(e) => {
        setFitnessGoal(e.target.value);
        setShowPlans(false);
        e.target.style.height = '42px';
        const scrollHeight = e.target.scrollHeight;
        e.target.style.height = `${Math.max(scrollHeight, 42)}px`;
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
</>

        {/* {inputLocked ? (
          <>
            <div className="custom-goal-label">Want something specific?</div>
            <div className="locked-input-container" onClick={toggleInputLock}>
              <div className="locked-input">
                <i className="fas fa-lock lock-icon"></i>
                <span className="locked-text">Enter your custom goal...</span>
              </div>
            </div>
          </>
        ) : (
          <>
            {isCustomerLoggedIn && customerData && (
              <div className="welcome-message">Welcome back, {customerData.name || 'EleFit Member'}!</div>
            )}
            <div className="input-container">
              <textarea
                id="fitnessGoal"
                className={`goal-input ${inputError ? 'input-error' : ''}`}
                placeholder="Enter your fitness goal..."
                value={fitnessGoal}
                onChange={(e) => {
                  setFitnessGoal(e.target.value);
                  // Clear previous plans when input changes
                  setShowPlans(false);
                  
                  // Auto-adjust height based on content, with a minimum height
                  // First reset to default height to properly collapse when text is deleted
                  e.target.style.height = '42px';
                  const scrollHeight = e.target.scrollHeight;
                  
                  // Apply the new height with a small buffer to prevent flickering
                  if (e.target.value === '') {
                    e.target.style.height = '42px'; // Reset to default when empty
                  } else {
                    e.target.style.height = `${Math.max(scrollHeight, 42)}px`;
                  }
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
          </>
        )} */}
        {inputError && (
          <div className="input-error-message">
            <i className="fas fa-exclamation-circle"></i> Please enter your fitness goal first
          </div>
        )}

        <div className="suggestions-container">
          <div className="suggestions-title">Popular Goals:</div>
          <div className="suggestion-chips">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className={`suggestion-chip ${currentPopupGoal === suggestion.text ? 'selected-goal' : ''}`}
                data-goal={suggestion.text}
                style={{ animation: `fadeInUp 0.5s ease forwards ${index * 0.1}s` }}
                onClick={() => handleSuggestionClick(suggestion.text)}
              >
                <i className={`fas ${suggestion.icon}`}></i>
                {suggestion.text}
              </div>
            ))}
      </div>

          {/* Display goal details below instead of in popup */}
        {currentPopupGoal && goalData[currentPopupGoal] && (
            <div className="goal-details-container" style={{ borderTopColor: goalData[currentPopupGoal].color }}>
              <div className="goal-details-content">
            <i
              key={`icon-${currentPopupGoal}`}
              className={`fas ${goalData[currentPopupGoal].icon} goal-details-icon`}
              style={{ color: goalData[currentPopupGoal].color }}
              data-goal={currentPopupGoal}
            ></i>
                <h2 className="goal-details-title">{currentPopupGoal}</h2>
                <p className="goal-details-description">{goalData[currentPopupGoal].description}</p>
                
                <form className="goal-details-form" id="goalForm" onSubmit={handleFormSubmit}>
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

                  <div className="goal-details-buttons">
            <button
              type="button"
                      className="goal-details-button cancel"
                      onClick={() => setCurrentPopupGoal(null)}
            >
              Cancel
            </button>
                    <button type="submit" className="goal-details-button submit">
              Continue
            </button>
          </div>
        </form>
      </div>
            </div>
          )}
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
        <div className="plans-container" id="plansContainer" ref={plansContainerRef}>
          <div className="plans-grid">
            <div className="plan-section meal-section">
            <div className="plan-header">
              <i className="fas fa-utensils plan-icon"></i>
              <h2>Meal Plan</h2>
            </div>
            <div className="accordion" id="mealAccordion" ref={mealAccordionRef}>
                {mealPlansByDay.map((dayPlan) => (
                <div
                    key={`day-${dayPlan.dayNumber}`}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-meal={`day${dayPlan.dayNumber}`}
                    onClick={() => toggleAccordion('meal', `day${dayPlan.dayNumber}`)}
                  >
                    <div className="day-header-content">
                      <i className="fas fa-calendar-day accordion-icon"></i>
                      <span style={{fontSize: '18px', fontWeight: '600' }}>Day {dayPlan.dayNumber}</span>
                    </div>
                    <div className="day-header-right">
                      <div className="total-calories">
                        <i className="fas fa-fire-alt"></i>
                        {Math.floor(calculateDailyCalories(dayPlan.meals))} cal/day
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
                        {dayPlan.meals.map((meal) => (
                          <div key={`${dayPlan.dayNumber}-${meal.type}`} className="nested-accordion-item">
                          <div 
                            className="nested-accordion-header"
                              data-meal-type={meal.type.toLowerCase()}
                              onClick={() => toggleAccordion('meal-sub', `${dayPlan.dayNumber}-${meal.type}`)}
                          >
                            <div className="meal-header-content">
                                <i className={`fas ${getMealIcon(meal.type)} nested-accordion-icon`}></i>
                                <span style={{ fontSize: '16px', fontWeight: '500' }}>{meal.type}</span>
                            </div>
                            <div className="meal-header-right">
                              <span className="calories-info">
                                  {meal.calories > 0 ? meal.calories : Math.floor(calculateMealCalories(meal.items))} cal
                              </span>
                              <i
                                className="fas fa-chevron-right nested-accordion-arrow"
                                style={{
                                    transform: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}
                              ></i>
                            </div>
                          </div>
                          <div
                            className="nested-accordion-content"
                            style={{
                                display: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'block' : 'none',
                                animation: openMealSubAccordion === `${dayPlan.dayNumber}-${meal.type}` ? 'slideDown 0.3s ease forwards' : 'none'
                              }}
                            >
                              <ol className="numbered-list" start="1">
                                {meal.items.map((item, index) => (
                                  <li className="ai-coach-numbered-item" key={`${dayPlan.dayNumber}-${meal.type}-item-${index}`}>{item}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

            <div className="plan-section workout-section">
            <div className="plan-header">
              <i className="fas fa-dumbbell plan-icon"></i>
              <h2>Workout Plan</h2>
            </div>
            <div className="accordion" id="workoutAccordion" ref={workoutAccordionRef}>
                {workoutSections.map((section) => (
                <div
                    key={`workout-day-${section.dayNumber}`}
                  className="accordion-item"
                >
                  <div
                    className="accordion-header"
                    data-day={`day${section.dayNumber}`}
                    onClick={() => toggleAccordion('workout', `day${section.dayNumber}`)}
                  >
                    <div className="day-header-content">
                        <i className={`fas ${getWorkoutIcon(section.workoutType)} accordion-icon`}></i>
                          <span style={{ fontSize: '18px', fontWeight: '600' }}>Day {section.dayNumber}: {section.workoutType}</span>
                      </div>
                    <div className="day-header-right">
                    <i
                      className="fas fa-chevron-right accordion-arrow"
                      style={{
                        transform: openWorkoutAccordion === `day${section.dayNumber}` ? 'rotate(90deg)' : 'rotate(0deg)'
                      }}
                    ></i>
                    </div>
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
                    <ol className="numbered-list" start="1">
                        {section.exercises.map((exercise, index) => (
                          <li className="ai-coach-numbered-item" key={`day${section.dayNumber}-exercise-${index}`}>{exercise.description}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <>
     <div className="main-container">
      <AIFitnessCoach />
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-panel">
          <h3>Development Testing Panel</h3>
          <div className="dev-controls">
            <a href="?loggedIn=true" className="dev-button login">Simulate Logged In</a>
            <a href="?loggedIn=false" className="dev-button logout">Simulate Logged Out</a>
          </div>
          <div className="dev-note">
            Note: This panel only appears during local development
          </div>
        </div>
      )}
     </div>
    </>
  );
}

export default App;