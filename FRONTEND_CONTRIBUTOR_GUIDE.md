# 🎨 Frontend Contributor & Collaboration Guide

Welcome to the **Antigravity Dossier Engine** team! 👋 

This guide is for frontend developers collaborating on this project. It contains everything you need to start developing, experimenting, and improving the user interface in under 3 minutes.

---

## ⚡ The Best Part: Zero Cloud Setup Required!

The entire cloud backend (Azure Functions, Cosmos DB, AI Document Intelligence) is **already live and hosted on Azure** at:
https://func-fanin-3718.azurewebsites.net

**You do NOT need to:**
- ❌ Install Python or virtual environments
- ❌ Install Azure CLI or Azure Functions Core Tools
- ❌ Have an Azure account or spend any cloud credits
- ❌ Worry about backend APIs breaking

The frontend in rontend/src/services/azureApi.ts is pre-configured to automatically connect to the live cloud backend. You can build, test, and improve the UI locally with hot reload right away!

---

## 🚀 Quickstart (3 Minutes)

### 1. Clone the repository
\\\ash
git clone https://github.com/ketanshelke97/fan-in-fan-out.git
cd fan-in-fan-out/frontend
\\\

### 2. Install dependencies
\\\ash
npm install
\\\

### 3. Start local development server
\\\ash
npm run dev
\\\
Now open [http://localhost:3000](http://localhost:3000) in your browser. Whenever you edit any React file in src/, the browser will instantly reload with your changes!

---

## 📂 Frontend Codebase Structure

All frontend code lives strictly inside rontend/:

\\\
frontend/
├── index.html                 # Main HTML entrypoint with Inter font
├── package.json               # NPM packages & build scripts
├── vite.config.ts             # Vite bundler config
├── src/
│   ├── main.tsx               # React root mount
│   ├── App.tsx                # Main container layout, timers, and orchestration state
│   ├── styles/
│   │   └── index.css          # Dark glassmorphism design system & animation tokens
│   ├── services/
│   │   └── azureApi.ts        # TypeScript data models (Dossier, WorkerResult) & API callers
│   └── components/
│       ├── Dropzone.tsx       # PDF drag & drop, file list, and 'Load 25 Benchmark PDFs'
│       ├── ConcurrencyMap.tsx # Real-time visual matrix of 25 parallel worker status badges
│       ├── BenchmarkCard.tsx  # Amdahl's Law mathematical speedup comparison card
│       └── DossierViewer.tsx  # Interactive aggregated entity chips, tables, and JSON export
└── public/
    └── staticwebapp.config.json # Azure Static Web Apps routing & headers
\\\

---

## 💡 Top High-Impact Feature Ideas to Build

Here are great features you can add to impress examiners and elevate the user experience:

### 1. 🔍 Search & Filter in Dossier Viewer (components/DossierViewer.tsx)
- Add a live search bar that instantly filters entities (e.g., search for "Department of Justice" or "Currency").
- Add clickable category filter pills (e.g. *All*, *Organization*, *Date*, *Currency*, *Field*).

### 2. 📊 Interactive Visual Charts (components/BenchmarkCard.tsx)
- Add an interactive visual bar chart comparing:
  - **Sequential Laptop Execution**: ~205s (CPU pinned at 100%)
  - **Azure Serverless Fan-Out**: 2.1s (0% local CPU load)
- You can use libraries like echarts or clean SVG bar elements.

### 3. 📄 Document Inspection & CSV Export (components/DossierViewer.tsx)
- Add an **"Export to CSV"** button next to each extracted table.
- Add an **"Export Executive Summary (PDF/Markdown)"** button that formats all extracted entities and tables into a clean downloadable summary report.

### 4. 🎭 Polish & Animations (styles/index.css)
- Add a smooth progress bar or animated radar during the "Fan-In Aggregating" phase.
- Add micro-animations when workers change from *Pending* to *Running* to *Extracted*.
- Add a light/dark theme toggle switch in the navbar.

---

## 🤝 Git Collaboration Workflow (How to Work as a Team)

To ensure we never overwrite each other's work or create merge conflicts, follow this simple branch-based workflow:

### Step 1: Always update your main branch first
Before starting any new work:
\\\ash
git checkout main
git pull origin main
\\\

### Step 2: Create a feature branch
Name the branch after what you are building:
\\\ash
git checkout -b feature/dossier-search-filter
\\\

### Step 3: Make your edits and verify the build
While developing, test your changes:
\\\ash
npm run dev
\\\
Before committing, make sure there are zero TypeScript compilation errors:
\\\ash
npm run build
\\\

### Step 4: Commit and push your branch
\\\ash
git add .
git commit -m "feat(ui): add real-time search filter and category pills to DossierViewer"
git push origin feature/dossier-search-filter
\\\

### Step 5: Merge into main
- Go to [GitHub Repository](https://github.com/ketanshelke97/fan-in-fan-out) and click **"Compare & pull request"**.
- After reviewing, merge it into main!

---

## 🚀 How Changes Get Deployed to the Live Production Web App

Once your changes are merged into main, the live Azure Static Web App ([https://ambitious-grass-0064c9f00.5.azurestaticapps.net](https://ambitious-grass-0064c9f00.5.azurestaticapps.net)) can be updated in 1 command using the deployment token:

\\\ash
# From the frontend directory:
npm run build
npx -y @azure/static-web-apps-cli deploy ./dist --deployment-token <DEPLOYMENT_TOKEN> --env production
\\\
*(Ketan has the deployment token or can run the deploy command whenever a new feature is ready!)*

---

## 🛡️ Team Golden Rules

1. **Only touch rontend/**: Unless you and Ketan specifically plan a backend change, all your work should stay in rontend/.
2. **Always run 
pm run build before pushing**: If 
pm run build passes with 0 errors, you know your code won't break the build pipeline.
3. **Have fun with the design**: The goal is to make the dashboard look like a high-tech distributed computing mission control center. Clean glassmorphism, responsive grid layouts, and vibrant accents are always welcome!
