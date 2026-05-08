<div align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Magnifying%20Glass%20Tilted%20Right.png" alt="TruthScan AI" width="100" />
  
  <h1 align="center">🔍 TruthScan AI</h1>
  <p align="center">
    <strong>An Enterprise-Grade, Full-Stack Misinformation Detection Engine</strong>
  </p>
  
  <p align="center">
    <a href="https://reactjs.org/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" /></a>
    <a href="https://www.nvidia.com/"><img src="https://img.shields.io/badge/NVIDIA-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="NVIDIA AI" /></a>
  </p>
  
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=18&pause=1000&color=D2E823&center=true&vCenter=true&width=435&lines=Detecting+Fake+News+Instantly...;AI-Powered+Fact+Checking...;Interactive+and+Animated+UI..." alt="Typing SVG" />
</div>

<br/>

## ✨ Stunning, Animated UI Experience
Built with an obsessive focus on user experience, TruthScan AI features a **buttery-smooth, highly interactive frontend**. 
- 🎨 **Glassmorphism & Brutalism**: A unique, premium aesthetic combining stark contrast borders with smooth state transitions.
- ⚡ **Micro-Animations**: Real-time pulsing indicators, hover scaling, and seamless DOM updates when analyzing articles.
- 📱 **Fully Responsive**: Adapts flawlessly from mobile screens to ultrawide desktop monitors, providing an app-like feel on all devices.

## 🧠 Powerful Full-Stack Architecture
Under the hood, TruthScan AI is driven by a robust integration pipeline:
- **Data Ingestion**: Hooks into the Event Registry API for real-time global news aggregation.
- **AI Processing Engine**: Seamlessly communicates with the NVIDIA API infrastructure, leveraging the **Meta LLaMA-3.1-70B-Instruct** model to perform deep semantic analysis.
- **State Management**: Complex asynchronous UI state handled efficiently within React to provide instant visual feedback without blocking the main thread.

---

## 🚀 Tech Stack

| Frontend 🖥️ | Backend / APIs ⚙️ | Deployment & Tooling 🛠️ |
| :--- | :--- | :--- |
| **React 18** | **NVIDIA AI API** | **Vite** (HMR & Build) |
| **Tailwind CSS** | **Event Registry API** | **ESLint** |
| **Iconify Icons** | **LLaMA 3.1 70B** | **Node.js Environment** |

---

## 💻 Getting Started

Follow these instructions to get a local copy up and running.

### 1. Clone & Install
```bash
# Navigate to the frontend workspace
cd newsdetection

# Install all required dependencies
npm install
```

### 2. Environment Variables
To ensure security, API keys are loaded strictly through Vite's environment parser. Create a `.env` file in the `newsdetection` folder:

```env
# Required for AI Analysis
VITE_NVIDIA_API_KEY=your_nvidia_api_key_here

# Optional/Fallback API
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Ignite the Dev Server
```bash
npm run dev
```
> 🔥 _Navigate to `http://localhost:5173` to see the animations and UI in action!_

<br/>

<div align="center">
  <sub>Built with ❤️ for a more truthful internet.</sub>
</div>
