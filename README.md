# IronLog

> A clean, offline-first workout tracker built for consistent strength and hypertrophy training.

IronLog is a mobile-first fitness tracker designed to make logging workouts fast, simple, and useful.

It focuses on the things that actually matter during training:

**Plan → Train → Log → Recover → Review → Progress**

No accounts. No backend. No ads. No subscriptions. Your workout data stays on your device.

---

## ✨ Features

### 🏋️ Workout Tracking

* Structured Monday–Friday training program
* Exercise-by-exercise workout flow
* Log:

  * Weight
  * Reps
  * RIR (Reps In Reserve)
  * Exercise notes
* Add or remove sets during a workout
* Previous workout performance shown while logging
* Workout progress indicator
* Automatic session saving
* Resume an unfinished workout after closing or refreshing the app

### ⏱️ Rest Timer

* Exercise-specific rest periods
* Automatic timer after completing a set
* Preset rest durations
* Pause, resume, and reset
* Timestamp-based timer that survives page reloads and phone sleep
* Timer stops cleanly at `0:00`
* No sound, vibration, or phone notifications

### 📊 Progress & Analytics

* Real workout statistics calculated from completed sessions
* Weekly and monthly workout counts
* Training consistency
* Weekly workout overview
* Total completed sets
* Training volume
* Typical workout duration
* Personal records

### 📈 Exercise History

Every logged exercise gets its own history.

View:

* Previous sessions
* Sets performed
* Weight
* Reps
* RIR
* Exercise volume
* Best sets
* Progress over time
* Best reps at each weight
* Exercise-specific records

Progress charts adapt to the exercise:

* Weight progression
* Estimated 1RM where appropriate
* Volume progression
* Reps for bodyweight exercises
* Hold time for timed exercises such as planks

### 🏆 Personal Records

IronLog tracks appropriate records from completed workouts:

* Heaviest weight
* Most volume in a session
* Most reps at a given weight
* Longest hold
* Estimated 1RM where appropriate

Estimated values are clearly marked as estimates and aren't calculated for unsuitable exercises.

### 📝 Workout History

Review completed workouts with:

* Workout date
* Duration
* Exercises
* Sets
* Total volume
* Workout notes
* Exercise-level performance

Historical workouts preserve the exercise information that existed when the workout was recorded.

---

## 🎯 Training Philosophy

IronLog is designed around a simple hypertrophy-oriented progression model.

The current program uses:

* **2 working sets per exercise**
* **8–12 reps** for most compound movements
* **10–15 reps** for many isolation movements
* **RIR 2–4**
* Exercise-specific rest periods
* Progressive overload based on actual training performance

### What is RIR?

**RIR = Reps In Reserve**

It represents how many additional clean repetitions you believe you could have performed at the end of a set.

| RIR | Meaning                            |
| --: | ---------------------------------- |
|   0 | No reps left / failure             |
|   1 | Could probably perform 1 more rep  |
|   2 | Could probably perform 2 more reps |
|   3 | Could probably perform 3 more reps |
|   4 | Could probably perform 4 more reps |

RIR is an estimate and becomes more useful as you become familiar with your own performance.

---

## 🗓️ Current Training Split

The default program follows a five-day schedule:

| Day       | Workout        |
| --------- | -------------- |
| Monday    | Upper A        |
| Tuesday   | Lower A        |
| Wednesday | Push           |
| Thursday  | Pull           |
| Friday    | Lower B + Core |
| Saturday  | Rest           |
| Sunday    | Rest           |

The program is represented as structured data, making it possible to modify the training plan without rewriting the workout system.

---

## 🧱 Tech Stack

IronLog is intentionally lightweight.

### Frontend

* React
* TypeScript
* Vite

### Storage

* IndexedDB
* Local-first architecture
* No backend required

### Testing

* Vitest
* Browser-based workflow checks
* Responsive layout checks
* Timezone-aware tests

### Styling

* Custom CSS
* Design tokens
* Mobile-first responsive layout
* System fonts

### Dependencies

The application avoids unnecessary runtime dependencies and does not rely on paid APIs or services.

---

## 🏗️ Architecture

IronLog separates workout data, business logic, storage, and UI.

```text
src/
├── app/
│   ├── App.tsx
│   ├── router/
│   └── routes.ts
│
├── components/
│   ├── Button
│   ├── ConfirmDialog
│   ├── EmptyState
│   ├── ProgressRing
│   └── ...
│
├── data/
│   ├── db.ts
│   ├── sessionRepository.ts
│   ├── sessionSchema.ts
│   └── storage.ts
│
├── data/
│   └── defaultPlan.ts
│
├── features/
│   ├── home/
│   ├── workout/
│   ├── session/
│   ├── history/
│   ├── progress/
│   ├── exercise/
│   ├── plan/
│   └── settings/
│
├── services/
│   ├── exerciseHistory.ts
│   ├── personalRecords.ts
│   ├── progression.ts
│   ├── sessionStats.ts
│   ├── trainingStats.ts
│   ├── workoutActions.ts
│   └── ...
│
├── hooks/
├── styles/
├── types/
└── utils/
```

---

## 🔐 Privacy & Data

IronLog currently follows a local-first architecture.

Your workout data is stored locally in the browser using IndexedDB.

There is currently:

* ❌ No user account
* ❌ No authentication
* ❌ No backend
* ❌ No workout data uploaded to a server
* ❌ No analytics service
* ❌ No paid API
* ❌ No advertisements

This also means that **your local workout data is tied to the browser origin/device**.

Export/import functionality is planned to make moving between development and hosted versions safer.

---

## 🚀 Getting Started

### Requirements

* Node.js
* npm

Clone the repository:

```bash
git clone https://github.com/Abhay-Dev-Gautam/IronLog.git
cd IronLog
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

For access from another device on the same network:

```bash
npm run dev -- --host 0.0.0.0
```

Vite will provide a network URL that can be opened from an iPhone or another device on the same Wi-Fi network.

---

## 🧪 Testing

Run the complete test and validation suite:

```bash
npm run check
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The project includes unit tests, browser workflow tests, responsive layout checks, and timezone-related tests.

---

## 📱 Mobile First

IronLog is designed primarily for phone usage.

The interface is tested across narrow viewport sizes including:

* 320px
* 390px
* 402px
* 440px

The UI prioritizes:

* Large touch targets
* Minimal typing
* Clear workout hierarchy
* One-handed interaction where practical
* No horizontal scrolling
* Responsive layouts

The application is intended to eventually be installable as a Progressive Web App and used directly from an iPhone home screen.

---

## 🛣️ Roadmap

### Completed

* [x] Workout program
* [x] Workout logging
* [x] Set tracking
* [x] Weight / reps / RIR
* [x] Workout persistence
* [x] Resume unfinished workouts
* [x] Rest timer
* [x] Workout summaries
* [x] Workout history
* [x] Progress dashboard
* [x] Exercise history
* [x] Progress charts
* [x] Personal records
* [x] Training statistics
* [x] Responsive mobile UI
* [x] Automated regression testing

### Planned

* [ ] JSON export/import
* [ ] Data backup and restore
* [ ] Progressive Web App support
* [ ] Offline asset caching
* [ ] Free HTTPS deployment
* [ ] Home-screen installation
* [ ] Configurable rest-timer defaults
* [ ] Rest-timer auto-start setting
* [ ] Smarter progressive-overload suggestions
* [ ] Workout editing/deletion
* [ ] Further real-device polish

---

## 🧠 Design Principles

IronLog follows a few simple principles:

### 1. Logging should be fast

You shouldn't spend more time using the app than you do resting between sets.

### 2. Your data belongs to you

Workout history should remain accessible without requiring an account or subscription.

### 3. Numbers should be transparent

Volume, PRs, estimated 1RM, and progression metrics should be calculated from actual recorded workouts and clearly explained.

### 4. Don't overcomplicate training

IronLog should support training rather than distract from it.

### 5. Preserve historical accuracy

Changing today's workout plan shouldn't rewrite what you did three months ago.

### 6. Mobile first

The gym is not a desktop environment. Every important interaction should work comfortably on a phone.

---

## 🤝 Contributing

IronLog is currently a personal project.

If you want to experiment with the project:

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run the test suite.
5. Verify the production build.
6. Open a pull request.

Please avoid introducing unnecessary dependencies or changing existing workout behavior without a clear reason.

---

## 📄 License

License information will be added as the project matures.

---

## 👤 Author

**Abhay Dev Gautam**

Built as a personal project to make workout tracking simpler, faster, and more useful.

---

> **IronLog — Train. Log. Progress.**
