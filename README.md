# 24-Hour Time Tracker

A beautiful, responsive web application for tracking your daily activities hour by hour. Built with Node.js, Express, EJS, SQLite, and Tailwind CSS.

## Features

- **24-Hour Grid**: Visual grid showing all hours of the day (00:00 to 23:00)
- **Activity Tracking**: Select from 8 activity types with color-coded blocks
  - Sleep (Blue)
  - Work (Emerald)
  - Eat (Amber)
  - Exercise (Red)
  - Leisure (Indigo)
  - Learning (Cyan)
  - Social (Pink)
  - Chores (Gray)
- **Notes**: Add optional text notes to any hour block
- **Date Navigation**: Previous/Next day buttons with "Today" shortcut
- **Dashboard**: Statistics showing total hours per activity type
- **Productivity Score**: Weighted scoring system based on activity types
- **Data Persistence**: SQLite database for local storage
- **Responsive Design**: Mobile-friendly with touch swipe support
- **Smooth Animations**: Fade and slide animations on updates
- **Keyboard Shortcuts**: Ctrl/Cmd + Arrow keys for date navigation

## Tech Stack

- **Backend**: Node.js, Express.js
- **Templating**: EJS
- **Database**: SQLite3
- **Styling**: Tailwind CSS
- **Frontend**: Vanilla JavaScript

## Installation

```bash
# Install dependencies
npm install

# Build Tailwind CSS
npx tailwindcss -i ./public/css/input.css -o ./public/css/output.css

# Start the server
npm start
```

## Usage

1. Open your browser to `http://localhost:3000`
2. Select an activity from the dropdown for any hour
3. Add optional notes to describe what you did
4. Use the navigation buttons to switch between days
5. View your productivity score and statistics in the dashboard

## API Endpoints

- `GET /tracker?date=YYYY-MM-DD` - Main tracker page
- `POST /api/entry` - Save/update an hour entry
- `GET /api/stats/:date` - Get statistics for a date

## Productivity Scoring

Activities are weighted for productivity scoring:
- Work: 10 points/hour
- Learning: 8 points/hour
- Exercise: 7 points/hour
- Eat: 5 points/hour
- Social: 4 points/hour
- Chores: 3 points/hour
- Leisure: 2 points/hour
- Sleep: 1 point/hour

Maximum possible score is 240 points (24 hours of work).

## Development

```bash
# Run with auto-reload
npm run dev

# Watch Tailwind CSS changes
npm run build:css
```

## License

MIT
