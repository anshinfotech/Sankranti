Here is a professional, developer-friendly README.md for your project. You can drop this directly into your repository.🪁 Sankranti Kite ChallengeA high-performance, responsive kite fighting game built to celebrate Makar Sankranti. This project uses a hybrid rendering engine—leveraging React for UI state management and the HTML5 Canvas API for a smooth 60FPS physics loop.(Replace with actual screenshot)🌟 FeaturesHybrid Engine: Uses useRef for physics calculations (zero re-renders) and useState for UI updates.Smooth Physics: Implements Linear Interpolation (Lerp) for realistic kite "drift" and weight.Cross-Platform:Desktop: Mouse tracking with Click-to-Boost.Mobile: Touch dragging with a dedicated Thumb Boost Button (⚡).Juicy Feedback: Screen shake, particle explosions, and floating text on collisions.Social Sharing: Integrated Native Web Share API for sharing scores on WhatsApp/Twitter.Zero Dependencies: Built with pure React and standard Web APIs. No external game libraries (like Phaser) required.🚀 Quick StartThis component is designed to be a "drop-in" single-file solution.1. Create a React AppIf you don't have one yet:Bashnpx create-react-app sankranti-game
cd sankranti-game
2. Add the Game ComponentCreate a file named SankrantiGame.js in your src folder and paste the provided code.3. Import & RunIn your App.js:JavaScriptimport SankrantiGame from './SankrantiGame';

function App() {
  return <SankrantiGame />;
}

export default App;
Run the server:npm run dev
🎮 How to PlayThe Goal: Cut 5 enemy kites to win the challenge.DeviceMovementAttack (Boost)DesktopMove MouseClick & Hold Left ButtonMobileDrag on Screen (Left Thumb)Press & Hold ⚡ Button (Right Thumb)Strategy: You can only cut enemies while Boosting (Red String). If you touch an enemy string while moving normally (White String), you will crash! Watch your Stamina bar!⚙️ ConfigurationYou can tweak the game feel by modifying the GAME_CONFIG object at the top of SankrantiGame.js:JavaScriptconst GAME_CONFIG = {
  KITE_DRIFT: 0.12,       // Lower (0.05) = Heavier/Slower, Higher (0.2) = Snappier
  BASE_SPEED: 3.5,        // Speed of falling enemies
  WIN_SCORE: 5,           // Kites needed to win
  MAX_ENERGY: 100,        // Max boost meter
  ENERGY_COST: 1.2        // How fast boost drains
};
📂 Project Structuresrc/
├── SankrantiGame.js    # Contains Logic, Physics, UI, and CSS-in-JS styles
└── App.js              # Entry point
Architecture 
Note
The game loop runs outside of the React Render Cycle to ensure performance on low-end mobile devices.Logic: requestAnimationFrame updates physics state in a mutable useRef object.Rendering: React only re-renders when the Game State changes (Menu -> Play -> Win).🤝
Credits
Powered by Ansh Infotech
