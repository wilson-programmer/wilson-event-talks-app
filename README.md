# BigQuery Release Notes Hub & Tweet Companion

A premium, modern Single Page Application (SPA) built with Python Flask and vanilla HTML, CSS, and JavaScript. This tool fetches the official Google BigQuery release notes Atom feed, parses and splits multi-part updates into individual release cards, and integrates a specialized Tweet Companion to help compose, validate, auto-shorten, and share updates on X (Twitter).

---

## ⚡ Key Features

* **Granular Release Note Splitting:** Automatically parses the feed XML and segments entries containing multiple sub-updates (e.g. Features, Announcements, Issues, Deprecations) into distinct, interactive cards.
* **X/Twitter Integration:** Automatically drafts tweets pre-filled with the update title, date, detail text, and reference links.
* **Smart Auto-Shortener:** Includes an algorithm to calculate remaining characters under the 280-character limit (accounting for links, hashtags, and headers) and truncates the update text cleanly with `...` in a single click.
* **Hashtag Shortcuts:** Quick-select buttons to insert popular tags (`#BigQuery`, `#GoogleCloud`, `#DataAnalytics`) at the cursor position.
* **Premium Tech Aesthetics:** Clean slate-dark layout with glowing color-coded borders matching the update type. Features animated skeleton loader shimmers and CSS `@starting-style` transitions for entry/filtering animations.
* **Fully Responsive:** Offers a side-by-side dashboard interface on desktop and an intuitive bottom-drawer sheet slide-up layout on mobile viewports.

---

## 🛠️ Tech Stack

* **Backend:** Python 3, Flask, BeautifulSoup4, urllib
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (custom theme, glassmorphism, responsive grids), Vanilla ES6 JavaScript (AJAX, State Management)
* **APIs & Sharing:** Google Cloud Feed (XML Atom), Twitter/X Web Intents API

---

## 🚀 Getting Started

### Prerequisites
* Python 3.12 or above

### Installation
1. Clone this repository:
   ```bash
   git clone https://github.com/wilson-programmer/wilson-event-talks-app.git
   cd wilson-event-talks-app
   ```
2. Install the required dependencies:
   ```bash
   python3 -m pip install flask requests beautifulsoup4 --user --break-system-packages
   ```

### Running the App
Start the Flask development server:
   ```bash
   python3 app.py
   ```
Open your browser and navigate to `http://127.0.0.1:5000`.

---

*Note: This repository was created as part of the Google Vibe coding course projects portfolio (`wilson-event-talks-app`).*
