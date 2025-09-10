import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('🎯 main.tsx: Starting application...');

try {
  const rootElement = document.getElementById("root");
  console.log('📍 Root element:', rootElement);
  
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  const root = createRoot(rootElement);
  console.log('✅ Root created successfully');
  
  root.render(<App />);
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to start application:', error);
  
  // Fallback error display
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        min-height: 100vh; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        background: #ef4444; 
        color: white; 
        font-family: system-ui, sans-serif;
        padding: 2rem;
      ">
        <div>
          <h1>❌ Application Failed to Start</h1>
          <p>Error: ${error instanceof Error ? error.message : String(error)}</p>
          <p>Check console for more details.</p>
          <button onclick="window.location.reload()" style="
            background: white; 
            color: #ef4444; 
            border: none; 
            padding: 0.5rem 1rem; 
            border-radius: 4px; 
            cursor: pointer; 
            margin-top: 1rem;
          ">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }
}
