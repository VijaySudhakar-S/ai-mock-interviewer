import React, { useState, useEffect } from "react";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, CheckCircle, Clock, User, Bot, Play, Pause, ArrowLeft, Zap, Target, Brain } from "lucide-react";

const Interview = ({ MODEL, GEMINI_API_KEY, resumeText, jdText }) => {
  const [question, setQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [isRecognitionSupported, setIsRecognitionSupported] = useState(false);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [currentFeedback, setCurrentFeedback] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');

  const synth = window.speechSynthesis;
  
  useEffect(() => {
    setIsSpeechSupported('speechSynthesis' in window);
    setIsRecognitionSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
  }, []);

  // Enhanced API call with retry logic and rate limiting
  const makeAPICall = async (prompt, retries = 3, delay = 2000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
              }
            })
          }
        );
        
        if (!response.ok) {
          if (response.status === 429) {
            if (i < retries - 1) {
              console.log(`Rate limited. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2;
              continue;
            } else {
              throw new Error("Rate limit exceeded. Please wait a few minutes before trying again.");
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
      } catch (error) {
        console.error(`API call attempt ${i + 1} failed:`, error);
        if (i === retries - 1) throw error;
      }
    }
  };

  const speak = (text) => {
    if (!isSpeechSupported) {
      console.warn("Speech synthesis not supported");
      return;
    }
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    synth.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synth.speaking) synth.cancel();
    setIsSpeaking(false);
  };

  const startConversation = async () => {
    if (!GEMINI_API_KEY) {
      alert("API key is missing");
      return;
    }

    let sourceText = "";

    if (resumeText && jdText) {
      sourceText = `Resume:\n${resumeText}\n\nJob Description:\n${jdText}`;
    } else if (resumeText) {
      sourceText = `Resume:\n${resumeText}`;
    } else if (jdText) {
      sourceText = `Job Description:\n${jdText}`;
    } else {
      alert("Please provide a resume or job description to start the interview.");
      return;
    }

    const prompt = `You are an AI interviewer. Start with a warm greeting and ask: "Can you introduce yourself?"

    Based on this information:
    ${sourceText.substring(0, 2000)}

    Follow this pattern for subsequent questions:
    1. Introduction
    2. Skills & Tools  
    3. Projects/Experience
    4. JD-specific knowledge
    5. Behavioral questions

    Keep responses concise. Ask one question at a time and ask question very shortly.`;

    setLoading(true);
    try {
      const aiText = await makeAPICall(prompt);
      setQuestion(aiText);
      setCurrentQuestion(aiText);
      speak(aiText);
      setConversationStarted(true);
      setQuestionCount(1);
      setInterviewHistory([{
        type: 'question',
        content: aiText,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error) {
      console.error('Error starting interview:', error);
      alert(error.message || "Error starting interview. Please try again.");
    }
    setLoading(false);
  };

  const evaluateAnswer = async () => {
    if (!userAnswer.trim()) {
      alert("Please provide an answer before continuing.");
      return;
    }

    // Add user answer to history
    setInterviewHistory(prev => [...prev, {
      type: 'user',
      content: userAnswer,
      timestamp: new Date().toLocaleTimeString()
    }]);

    let contextText = "";

    if (resumeText && jdText) {
      contextText = `Resume:\n${resumeText}\n\nJob Description:\n${jdText}`;
    } else if (resumeText) {
      contextText = `Resume:\n${resumeText}`;
    } else if (jdText) {
      contextText = `Job Description:\n${jdText}`;
    }

    const prompt = `Context: ${contextText.substring(0, 1500)}

    Previous Question: "${question}"
    User Answer: "${userAnswer}"

    Please provide:
    1. Brief feedback on the answer (2-3 sentences)
    2. Then ask the next relevant interview question very shorlty

    Format your response as:
    FEEDBACK: [Your feedback here]
    NEXT QUESTION: [Your next question here]`;

    setLoading(true);
    try {
      const aiText = await makeAPICall(prompt);
      
      // Parse feedback and next question
      const feedbackMatch = aiText.match(/FEEDBACK:\s*(.*?)(?=NEXT QUESTION:|$)/s);
      const questionMatch = aiText.match(/NEXT QUESTION:\s*(.*)/s);
      
      const newFeedback = feedbackMatch ? feedbackMatch[1].trim() : aiText.split('\n')[0];
      const nextQuestion = questionMatch ? questionMatch[1].trim() : aiText.split('\n').slice(1).join('\n');
      
      setCurrentFeedback(newFeedback);
      setCurrentQuestion(nextQuestion);
      setFeedback(newFeedback);
      setQuestion(nextQuestion);
      setUserAnswer('');
      
      // Add feedback and next question to history
      setInterviewHistory(prev => [...prev, 
        {
          type: 'feedback',
          content: newFeedback,
          timestamp: new Date().toLocaleTimeString()
        },
        {
          type: 'question',
          content: nextQuestion,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      
      speak(`${newFeedback} ${nextQuestion}`);
      setQuestionCount(prev => prev + 1);
    } catch (error) {
      console.error('Error evaluating answer:', error);
      alert(error.message || "Error evaluating answer. Please try again.");
    }
    setLoading(false);
  };

  const startRecording = () => {
    if (!isRecognitionSupported) {
      alert("Speech recognition is not supported in your browser");
      return;
    }
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
    <div 
      className="min-vh-100" 
      style={{ 
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      {/* Animated background elements */}
      <div className="position-absolute w-100 h-100 overflow-hidden" style={{ zIndex: 0 }}>
        <div 
          className="position-absolute rounded-circle opacity-10"
          style={{
            width: '400px',
            height: '400px',
            background: 'rgba(255,255,255,0.1)',
            top: '-10%',
            right: '-10%',
            animation: 'float 8s ease-in-out infinite'
          }}
        ></div>
        <div 
          className="position-absolute rounded-circle opacity-10"
          style={{
            width: '300px',
            height: '300px',
            background: 'rgba(255,255,255,0.08)',
            bottom: '-5%',
            left: '-5%',
            animation: 'float 6s ease-in-out infinite reverse'
          }}
        ></div>
      </div>

      {/* Header */}
      <div 
        className="py-4 mb-4 position-relative" 
        style={{ 
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        <div className="container">
          <div className="text-center">
            <h1 className="fw-bold mb-3 text-white" style={{
              textShadow: '0 4px 6px rgba(0,0,0,0.3)',
              animation: 'fadeInDown 1s ease-out'
            }}>
              <MessageCircle className="me-3" size={40} />
              AI Mock Interview
            </h1>
            <div className="d-flex justify-content-center align-items-center flex-wrap gap-3">
              <span className="badge bg-light text-dark px-3 py-2 rounded-pill fs-6">
                {resumeText && jdText ? "📄 Resume + 📋 Job Description" : 
                 resumeText ? "📄 Resume Based" : "📋 Job Description Based"}
              </span>
              {conversationStarted && (
                <span className="badge bg-success bg-opacity-20 text-white px-3 py-2 rounded-pill fs-6">
                  <Clock size={16} className="me-1" />
                  Question {questionCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container pb-5 position-relative" style={{ zIndex: 1 }}>
        {!conversationStarted ? (
          /* Welcome Screen */
          <div className="row justify-content-center" style={{ animation: 'fadeInUp 1s ease-out' }}>
            <div className="col-lg-10">
              <div 
                className="card border-0 shadow-lg mb-4"
                style={{ 
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '24px'
                }}
              >
                <div className="card-body p-5 text-center">
                  <div 
                    className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                    style={{ width: '100px', height: '100px' }}
                  >
                    <Bot className="text-primary" size={50} />
                  </div>
                  
                  <h2 className="fw-bold text-dark mb-4">Ready to Ace Your Interview?</h2>
                  <p className="text-muted fs-5 mb-5 mx-auto" style={{ maxWidth: '600px' }}>
                    I'll conduct a comprehensive mock interview tailored to your profile. 
                    Get real-time feedback and improve your interview skills with AI-powered insights.
                  </p>
                  
                  <div className="row g-4 mb-5">
                    <div className="col-md-4">
                      <div 
                        className="card h-100 border-0 shadow-sm"
                        style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          transition: 'transform 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div className="card-body text-center p-4">
                          <Brain className="text-white mb-3" size={40} />
                          <h6 className="text-white fw-bold mb-2">AI-Powered Questions</h6>
                          <small className="text-white opacity-75">
                            Smart questions based on your profile and industry trends
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div 
                        className="card h-100 border-0 shadow-sm"
                        style={{ 
                          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                          transition: 'transform 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div className="card-body text-center p-4">
                          <Zap className="text-white mb-3" size={40} />
                          <h6 className="text-white fw-bold mb-2">Real-time Feedback</h6>
                          <small className="text-white opacity-75">
                            Instant analysis and suggestions for improvement
                          </small>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-md-4">
                      <div 
                        className="card h-100 border-0 shadow-sm"
                        style={{ 
                          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                          transition: 'transform 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div className="card-body text-center p-4">
                          <Target className="text-white mb-3" size={40} />
                          <h6 className="text-white fw-bold mb-2">Targeted Practice</h6>
                          <small className="text-white opacity-75">
                            Focus on skills and experiences relevant to your goals
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-lg px-5 py-3 shadow-lg"
                    onClick={startConversation} 
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                      border: 'none',
                      borderRadius: '50px',
                      color: 'white',
                      fontSize: '18px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255,107,107,0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-3" role="status"></div>
                        Starting Your Interview...
                      </>
                    ) : (
                      <>
                        <Play className="me-3" size={24} />
                        Begin Interview Session
                      </>
                    )}
                  </button>
                  
                  <p className="text-muted mt-4 small">
                    💡 Tip: Find a quiet space and speak clearly for the best experience
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Interview Interface */
          <div className="row g-4">
            {/* Left Column - Chat History */}
            <div className="col-lg-8">
              <div 
                className="card border-0 shadow-lg h-100"
                style={{ 
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px'
                }}
              >
                <div 
                  className="card-header border-0 text-white p-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '20px 20px 0 0'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-bold">
                      <MessageCircle className="me-2" size={24} />
                      Interview Conversation
                    </h5>
                    <span className="badge bg-white text-primary px-3 py-2 rounded-pill">
                      Question {questionCount}
                    </span>
                  </div>
                </div>
                
                <div className="card-body p-0" style={{height: '60vh', overflowY: 'auto'}}>
                  {interviewHistory.map((item, index) => (
                    <div key={index} className={`p-4 border-bottom ${
                      item.type === 'user' ? 'bg-primary bg-opacity-5' : 
                      item.type === 'feedback' ? 'bg-success bg-opacity-5' : 'bg-info bg-opacity-5'
                    }`}>
                      <div className="d-flex align-items-start">
                        <div className="me-3">
                          {item.type === 'user' ? (
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }}
                            >
                              <User size={20} className="text-white" />
                            </div>
                          ) : item.type === 'feedback' ? (
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                              }}
                            >
                              <CheckCircle size={20} className="text-white" />
                            </div>
                          ) : (
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{
                                width: '40px',
                                height: '40px',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
                              }}
                            >
                              <Bot size={20} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0 fw-bold text-dark">
                              {item.type === 'user' ? 'Your Answer' : 
                               item.type === 'feedback' ? 'AI Feedback' : 'Interview Question'}
                            </h6>
                            <small className="text-muted">{item.timestamp}</small>
                          </div>
                          <p className="mb-0 text-dark" style={{ lineHeight: '1.6' }}>{item.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="p-5 text-center">
                      <div className="spinner-border text-primary mb-3" role="status"></div>
                      <p className="text-muted">AI is analyzing your response...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Answer Input */}
            <div className="col-lg-4">
              <div 
                className="card border-0 shadow-lg"
                style={{ 
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '20px'
                }}
              >
                <div 
                  className="card-header border-0 text-white p-4"
                  style={{ 
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    borderRadius: '20px 20px 0 0'
                  }}
                >
                  <h5 className="mb-0 fw-bold">
                    <Mic className="me-2" size={20} />
                    Your Response
                  </h5>
                </div>
                
                <div className="card-body p-4">
                  <div className="mb-4">
                    <label className="form-label text-dark fw-semibold mb-3">Share your thoughts:</label>
                    <textarea
                      className="form-control border-2 rounded-3"
                      rows="6"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Type your answer here or use voice recording..."
                      style={{
                        resize: 'none',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        border: '2px solid #e9ecef'
                      }}
                    />
                  </div>

                  {/* Voice Controls */}
                  <div className="row g-2 mb-4">
                    {isRecognitionSupported && (
                      <div className="col-6">
                        <button 
                          className={`btn w-100 rounded-pill ${isRecording ? 'btn-danger' : 'btn-outline-success'}`}
                          onClick={isRecording ? stopRecording : startRecording}
                          disabled={!isRecognitionSupported}
                          style={{ 
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isRecording ? (
                            <>
                              <MicOff size={16} className="me-2" />
                              Recording...
                            </>
                          ) : (
                            <>
                              <Mic size={16} className="me-2" />
                              Record
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    {isSpeechSupported && (
                      <div className="col-6">
                        <button 
                          className={`btn w-100 rounded-pill ${isSpeaking ? 'btn-warning' : 'btn-outline-info'}`}
                          onClick={isSpeaking ? stopSpeaking : () => speak(currentQuestion)}
                          style={{ 
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {isSpeaking ? (
                            <>
                              <VolumeX size={16} className="me-2" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Volume2 size={16} className="me-2" />
                              Replay
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button 
                    className="btn w-100 py-3 mb-3 rounded-pill shadow-sm"
                    onClick={evaluateAnswer} 
                    disabled={loading || !userAnswer.trim()}
                    style={{
                      background: userAnswer.trim() ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : '#e9ecef',
                      border: 'none',
                      color: userAnswer.trim() ? 'white' : '#6c757d',
                      fontSize: '16px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                        Processing Answer...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={20} className="me-2" />
                        Submit Answer
                      </>
                    )}
                  </button>

                  {/* Character Count */}
                  <div className="text-center mb-4">
                    <small className="text-muted">
                      {userAnswer.length} characters
                    </small>
                  </div>

                  {/* Quick Tips */}
                  <div 
                    className="p-3 rounded-3"
                    style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1))' }}
                  >
                    <h6 className="text-dark mb-2 fw-bold">
                      💡 Interview Tips
                    </h6>
                    <ul className="list-unstyled text-muted small mb-0" style={{ lineHeight: '1.8' }}>
                      <li>🎯 Be specific with examples</li>
                      <li>⏱️ Take your time to think</li>
                      <li>❓ Ask for clarification if needed</li>
                      <li>⭐ Use the STAR method for behavioral questions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .form-control:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.2rem rgba(102, 126, 234, 0.25) !important;
        }
        
        .bg-primary.bg-opacity-5 {
          background-color: rgba(102, 126, 234, 0.05) !important;
        }
        .bg-success.bg-opacity-5 {
          background-color: rgba(79, 172, 254, 0.05) !important;
        }
        .bg-info.bg-opacity-5 {
          background-color: rgba(240, 147, 251, 0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default Interview;