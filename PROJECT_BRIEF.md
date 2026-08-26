# Project Name: OptimalMotion (Clinical & Calisthenics App)
## 1. The Vision & Founder's Background
I am a 3rd-year Physiotherapy student, certified Yoga instructor, and Fitness trainer. 
The goal of this app is to bridge the gap between clinical rehabilitation and high-level bodyweight mastery (Calisthenics, Mobility, Rings, Kettlebells).
This is NOT a generic bodybuilding/gym app. It is a premium, holistic ecosystem focused on smart movement, progressive overload, and pain-free performance.

## 2. Target Audience
- **Clinical Patients:** People recovering from injuries needing precise rehab protocols.
- **Fitness Enthusiasts:** People looking to master their bodyweight, achieve advanced skills (Planche, Muscle-up, Handstand), and improve mobility.

## 3. Tech Stack & Architecture
- **Framework:** Next.js (App Router/Pages) configured as a PWA (Progressive Web App).
- **UI/Styling:** React, Tailwind CSS, Lucide-React icons, Recharts for analytics.
- **Database/Backend:** Supabase (PostgreSQL, Auth, Storage).
- **Language:** Strictly TypeScript (TSX).

## 4. Design Language & UX Philosophy (CRITICAL)
- **Premium Native Feel:** The web app MUST feel like an expensive, native iOS/Android app (like Freeletics, Thenx, or Apple Fitness).
- **Theme:** "Dark Mode Premium" (Stone-950, deep blacks) with elegant neon accents (Teal, Amber, Purple) for gamification.
- **Immersive UI:** Active workouts must use full-screen video backgrounds (`object-cover`) with sleek glassmorphism (`backdrop-blur`) UI layered on top. NO clunky solid boxes blocking the video.
- **Interactions:** Heavy use of swipe gestures, bottom navigation bars, and haptic feedback.
- **Minimalism:** Ask for inputs (like Actual Reps or RIR) ONLY during the rest screens, never obscuring the active workout video.

## 5. Core Features
- **Admin/Clinic Side:** Patient CRM, manual assigning, intelligent DIY builder, and tactical video review tools.
- **Patient Side:** Daily immersive workout player, DIY workout builder (filtered by muscle/equipment), premium program store, and a gamified profile dashboard.

## 6. AI Agent Instructions (Your Skills & Rules)
When assisting me with code, act as a Senior Next.js/Tailwind Architect.
- **Rule 1:** Always write clean, modular, component-based code. Do not encourage monolithic files.
- **Rule 2:** Strictly use Tailwind CSS for styling. Do not use external CSS files.
- **Rule 3:** Maintain Mobile-First design principles.
- **Rule 4:** If modifying the UI, always prioritize glassmorphism, rounded corners (`rounded-2xl`, `rounded-3xl`), and elegant animations (`animate-in`, transitions).
- **Rule 5:** Ensure TypeScript interfaces/types are respected, but keep the code simple and practical for an MVP.