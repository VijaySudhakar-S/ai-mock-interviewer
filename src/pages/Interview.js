import React, { useState } from "react";
import axios from "axios";

const Interview = ({ resumeText, MODEL, GEMINI_API_KEY }) => {
  const [question, setQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [recognitionInstance, setRecognitionInstance] = useState(null);

  const synth = window.speechSynthesis;

  const speak = (text) => {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synth.speaking) synth.cancel();
    setIsSpeaking(false);
  };

  const startConversation = async () => {
    const prompt = `You are a friendly and professional AI interviewer.

    Start the mock interview with a warm greeting and a general opening question like "Can you introduce yourself?".

    Then, based on the following resume:
    ${resumeText}

    Follow this question pattern:
    1. Introduction
    2. Skills & Tools
    3. Projects
    4. Internships/Experience
    5. HR/Behavioral

    Ask one question at a time. Do not base the next question on the user's answer.`;

    setLoading(true);
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { "Content-Type": "application/json" } }
      );
      const aiText = response.data.candidates[0].content.parts[0].text;
      setQuestion(aiText);
      speak(aiText);
      setConversationStarted(true);
      setQuestionCount(1);
    } catch (err) {
      console.error(err);
      alert("Error starting interview.");
    }
    setLoading(false);
  };

  const evaluateAnswer = async () => {
    const prompt = `Interview question: "${question}"
    Candidate's answer: "${userAnswer}"
    Give a short feedback (1-2 lines), then ask the next relevant interview question based on the resume.`;

    setLoading(true);
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        { contents: [{ parts: [{ text: prompt }] }] },
        { headers: { "Content-Type": "application/json" } }
      );
      const aiText = response.data.candidates[0].content.parts[0].text;
      setFeedback(aiText);
      setUserAnswer('');
      speak(aiText);
      setQuestion(aiText);
      setQuestionCount(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Error evaluating answer.");
    }
    setLoading(false);
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => {
      if (isRecording) recognition.start();
    };
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      setUserAnswer(prev => prev + ' ' + transcript);
    };

    recognition.start();
    setRecognitionInstance(recognition);
  };

  const stopRecording = () => {
    if (recognitionInstance) {
      recognitionInstance.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2 className="text-center">AI Mock Interview</h2>

      {!conversationStarted && (
        <div className="text-center mt-3">
          <button className="btn btn-primary" onClick={startConversation} disabled={loading}>
            {loading ? "Starting..." : "Start Interview"}
          </button>
        </div>
      )}

      {conversationStarted && question && (
        <div className="card p-3 mb-3">
          <h5>{questionCount === 1 ? '🗣️ Interview AI:' : '✅ AI Feedback & Next Question:'}</h5>
          <p>{feedback || question}</p>
        </div>
      )}

      {question && (
        <div className="mb-3">
          <label className="form-label">🎤 Your Answer</label>
          <textarea
            className="form-control"
            rows="3"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          <div className="mt-2">
            <button className="btn btn-outline-success me-2" onClick={startRecording} disabled={isRecording}>
              🎙️ Start Recording
            </button>
            <button className="btn btn-warning me-2" onClick={stopRecording} disabled={!isRecording}>
              🛑 Stop Recording
            </button>
            <button className="btn btn-danger me-2" onClick={stopSpeaking} disabled={!isSpeaking}>
              ⏹ Stop AI Speaking
            </button>
            <button className="btn btn-success" onClick={evaluateAnswer} disabled={loading}>
              {loading ? 'Thinking...' : 'Get Feedback & Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
