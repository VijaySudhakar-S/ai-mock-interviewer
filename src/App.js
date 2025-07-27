import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from './pages/Home';
import Interview from './pages/Interview';
import Quiz from './pages/Quiz';
import { useState, useEffect } from "react";

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API;
const MODEL = 'gemini-1.5-flash';

const App = () => {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            <Home 
              setResumeText={setResumeText} 
              setJdText={setJdText}
              resumeText={resumeText}
              jdText={jdText}
            />
          } 
        />
        <Route 
          path="/interview" 
          element={
            <Interview 
              MODEL={MODEL} 
              GEMINI_API_KEY={GEMINI_API_KEY} 
              resumeText={resumeText}
              jdText={jdText}
            />
          } 
        />
        <Route 
          path="/quiz" 
          element={
            <Quiz 
              MODEL={MODEL} 
              GEMINI_API_KEY={GEMINI_API_KEY} 
              resumeText={resumeText} 
              jdText={jdText}
            />
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;