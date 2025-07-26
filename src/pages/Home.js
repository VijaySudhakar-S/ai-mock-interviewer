import React from "react";
import { useNavigate } from "react-router-dom";

const Home = ({ setResumeText }) => {
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      setResumeText(event.target.result);
    };
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0]);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "2rem" }}>
      <h1>Welcome to the AI Interviewer</h1>
      <input type="file" onChange={handleFileChange} />
      <br /><br />
      <button onClick={() => navigate("/interview")}>
        Start Interview
      </button>
      <button onClick={() => navigate("/quiz")} style={{ marginLeft: "1rem" }}>
        Start Quiz
      </button>
    </div>
  );
};

export default Home;
