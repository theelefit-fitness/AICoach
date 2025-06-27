# Firebase Setup Instructions

This application uses Firebase Realtime Database to store fitness goal submissions. Follow these steps to configure Firebase for this application:

## 1. Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the steps to create a new project
3. Give your project a name and follow the setup wizard

## 2. Set up Realtime Database

1. In your Firebase project, go to the "Realtime Database" section
2. Click "Create Database"
3. Start in test mode (you can adjust security rules later)
4. Choose a database location closest to your users

## 3. Get Your Firebase Configuration

1. Go to Project Settings (gear icon in the top left)
2. Scroll down to "Your apps" section
3. Click the web icon (</>) to add a web app if you haven't already
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 4. Configure Your Application

Create a `.env` file in the root of your project with the following variables:

```
REACT_APP_FIREBASE_API_KEY=YOUR_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID=YOUR_APP_ID
```

Replace the placeholder values with your actual Firebase configuration values.

## 5. Database Structure

This application stores fitness goal submissions in the following structure:

```
fitnessGoals/
  - uniqueId1/
    - prompt: "User's fitness goal input"
    - shopifyUserId: "Shopify customer ID or 'guest'"
    - shopifyUsername: "Customer name or 'guest'"
    - shopifyUserEmail: "Customer email or 'guest'"
    - requestTime: Timestamp (server)
    - clientTimestamp: ISO string
    - isLoggedIn: Boolean
    - formData: Object or null
    - userAgent: String
    - platform: String
  - uniqueId2/
    ...
```

## 6. Security Rules (Optional)

For production, consider updating your database security rules to restrict access appropriately.

Example security rules:

```json
{
  "rules": {
    "fitnessGoals": {
      ".read": "auth != null",
      ".write": true
    }
  }
}
```

This allows anyone to write to the fitnessGoals collection but only authenticated users to read the data. 