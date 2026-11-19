BHAROVA V4 — Social Features Starter

This package builds on BHAROVA V3. It expects the SAME Firebase project and signed-in account.

SETUP
1. Complete Firebase setup from V3 first.
2. Copy the exact Firebase web config into app.js in this V4 folder.
3. In Firebase Console, enable Authentication > Email/Password.
4. Create Firestore and Firebase Storage.
5. Apply the rules in FIREBASE_RULES.txt and STORAGE_RULES.txt, then test them.
6. Host over HTTPS or use a local development server. Do not open as file://.
7. Create an account using V3, then sign in here using the same Firebase project.

FEATURES IN THIS STARTER
- Profile display name and bio editing
- Text posts saved in Firestore
- Image upload to Firebase Storage (5 MB limit)
- Live feed of latest 40 posts
- Like/unlike records and counts
- Basic follow record creation
- Basic comments

LIMITATIONS / SECURITY
- This is a development starter, not production-ready.
- Follow currently records a follow relationship but does not yet implement unfollow or robust counters.
- Add email verification, App Check, rate limits, content moderation, report/block tools,
  account deletion, privacy settings, accessibility and age-appropriate safeguards before public launch.
- Firestore and Storage rules must be tested in Firebase Emulator/Rules Playground.
- Never make the database or storage publicly writable.
- Do not store passwords yourself; Firebase Authentication handles them.
- Add pagination, abuse controls, server-side count validation and moderation before scaling.
