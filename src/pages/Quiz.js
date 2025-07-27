import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, CheckCircle, XCircle, Trophy, BookOpen, Clock, Award, Target, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from "lucide-react";

const Quiz = ({ GEMINI_API_KEY, MODEL, resumeText, jdText }) => {
  const [quiz, setQuiz] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    let interval;
    if (quizStarted && !showResults) {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [quizStarted, showResults]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateQuizPrompt = (profileText) => {
    return `
  You are a technical interview preparation assistant.

  🎯 Based ONLY on the following technical profile, generate 10 unique multiple-choice questions (MCQs) to assess the student's understanding of:

  - Specific tools and technologies mentioned
  - Concepts involved in listed projects
  - Code logic, syntax, and real-world usage related to these technologies

  📌 The MCQs should:
  - Be varied and specific to the content of the profile
  - Avoid repetition or generic knowledge
  - Focus on skill-testing, not trivia

  ⚠️ Please Do NOT mention the candidate, resume, personal details, or job roles. Do NOT ask opinion-based questions.
    Please Do NOT mention the candidate, resume, personal details, or job roles. Do NOT ask opinion-based questions.

  👉 Format:
  Q1: [question text]
  a) [option A]
  b) [option B]
  c) [option C]
  d) [option D]
  Correct Answer: a)

  Here is the technical profile:
  --------------------------------
  ${profileText}
  --------------------------------
  `.trim();
  };

  const parseQuizText = (text) => {
    if (!text) return [];
    
    const cleanText = text.replace(/\*\*/g, '').trim();
    const questionBlocks = cleanText.split(/Q\d+[:.]?\s*/).filter(block => block.trim());
    
    return questionBlocks.map((block, index) => {
      const lines = block.trim().split('\n').filter(line => line.trim());
      const questionText = lines[0]?.trim() || `Question ${index + 1}`;
      
      const options = [];
      let correctAnswer = '';
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.match(/^[a-d]\)/)) {
          options.push({
            key: trimmedLine.charAt(0),
            text: trimmedLine.substring(2).trim()
          });
        } else if (trimmedLine.toLowerCase().includes('correct answer:')) {
          const match = trimmedLine.match(/correct answer:\s*([a-d])/i);
          correctAnswer = match ? match[1].toLowerCase() : '';
        }
      });
      
      return {
        id: index + 1,
        question: questionText,
        options: options.length > 0 ? options : [
          { key: 'a', text: 'Option A' },
          { key: 'b', text: 'Option B' },
          { key: 'c', text: 'Option C' },
          { key: 'd', text: 'Option D' }
        ],
        correctAnswer: correctAnswer || 'a'
      };
    }).filter(q => q.question && q.options.length > 0);
  };

  const generateQuiz = async (prompt) => {
    setLoading(true);
    setError("");
    setQuizStarted(false);
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 2000,
              temperature: 0.7,
            }
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error("No content received from API");
      }
      
      setQuiz(text);
      const questions = parseQuizText(text);
      setParsedQuestions(questions);
      
      if (questions.length === 0) {
        setError("Failed to parse quiz questions. Please try regenerating.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error generating quiz. Please check your API key and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resumeText || jdText) {
      const profile = resumeText || jdText;
      const prompt = generateQuizPrompt(profile);
      generateQuiz(prompt);
    }
  }, [resumeText, jdText, GEMINI_API_KEY, MODEL]);

  const handleAnswerSelect = (questionId, selectedOption) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: selectedOption
    }));
  };

  const handleNext = () => {
    if (currentQuestion < parsedQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    parsedQuestions.forEach(question => {
      if (selectedAnswers[question.id] === question.correctAnswer) {
        correctCount++;
      }
    });
    return correctCount;
  };

  const handleSubmitQuiz = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);
  };

  const handleStartQuiz = () => {
    setQuizStarted(true);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setTimeSpent(0);
  };

  const handleRestartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResults(false);
    setScore(0);
    setQuizStarted(false);
    setTimeSpent(0);
  };

  const getScoreColor = () => {
    const percentage = (score / parsedQuestions.length) * 100;
    if (percentage >= 80) return "text-success";
    if (percentage >= 60) return "text-warning";
    return "text-danger";
  };

  const getScoreMessage = () => {
    const percentage = (score / parsedQuestions.length) * 100;
    if (percentage >= 80) return "🎉 Excellent! You have strong technical knowledge.";
    if (percentage >= 60) return "👍 Good job! Keep practicing to improve further.";
    return "📚 Keep learning! Review the concepts and try again.";
  };

  const getScoreGradient = () => {
    const percentage = (score / parsedQuestions.length) * 100;
    if (percentage >= 80) return "linear-gradient(135deg, #10B981, #059669)";
    if (percentage >= 60) return "linear-gradient(135deg, #F59E0B, #D97706)";
    return "linear-gradient(135deg, #EF4444, #DC2626)";
  };

  // Animated background elements
  const BackgroundElements = () => (
    <div className="position-absolute w-100 h-100 overflow-hidden" style={{ zIndex: 0 }}>
      <div 
        className="position-absolute rounded-circle opacity-10"
        style={{
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.1)',
          top: '10%',
          right: '10%',
          animation: 'float 6s ease-in-out infinite'
        }}
      ></div>
      <div 
        className="position-absolute rounded-circle opacity-10"
        style={{
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.1)',
          bottom: '20%',
          left: '15%',
          animation: 'float 8s ease-in-out infinite reverse'
        }}
      ></div>
      <div 
        className="position-absolute rounded-circle opacity-5"
        style={{
          width: '150px',
          height: '150px',
          background: 'rgba(255,255,255,0.1)',
          top: '60%',
          right: '30%',
          animation: 'float 10s ease-in-out infinite'
        }}
      ></div>
    </div>
  );

  if (loading) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center position-relative"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        <BackgroundElements />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-md-6 text-center">
              <div 
                className="p-5 rounded-4 border"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  animation: 'fadeInScale 0.8s ease-out'
                }}
              >
                <Sparkles 
                  className="mx-auto mb-4 text-white" 
                  size={64} 
                  style={{animation: 'pulse 2s infinite'}} 
                />
                <h3 className="fw-bold text-white mb-3">Crafting Your Quiz ✨</h3>
                <p className="text-white text-opacity-75 mb-4">
                  Our AI is analyzing your profile and creating personalized questions...
                </p>
                <div 
                  className="mx-auto rounded-pill overflow-hidden"
                  style={{ width: '200px', height: '4px', background: 'rgba(255,255,255,0.2)' }}
                >
                  <div 
                    className="h-100 rounded-pill"
                    style={{
                      background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)',
                      width: '100%',
                      animation: 'loading 2s ease-in-out infinite'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center position-relative"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        <BackgroundElements />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div 
                className="p-5 rounded-4 text-center border"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 107, 107, 0.3)',
                  animation: 'fadeInScale 0.8s ease-out'
                }}
              >
                <XCircle className="text-danger mx-auto mb-4" size={64} />
                <h3 className="fw-bold text-white mb-3">Oops! Something went wrong</h3>
                <p className="text-white text-opacity-75 mb-4">{error}</p>
                <button
                  onClick={() => {
                    if (resumeText || jdText) {
                      const profile = resumeText || jdText;
                      const prompt = generateQuizPrompt(profile);
                      generateQuiz(prompt);
                    }
                  }}
                  className="btn btn-lg px-5 py-3 rounded-pill shadow-lg border-0"
                  style={{
                    background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                    color: 'white',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <RefreshCw size={20} className="me-2" />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (parsedQuestions.length === 0) {
    return (
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center position-relative"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        <BackgroundElements />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div 
                className="p-5 rounded-4 text-center border"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <BookOpen className="mx-auto mb-4 text-white" size={64} />
                <h3 className="fw-bold text-white mb-3">No Quiz Available</h3>
                <p className="text-white text-opacity-75">Please provide a resume or job description to generate a quiz.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults) {
    const percentage = (score / parsedQuestions.length) * 100;
    return (
      <div 
        className="min-vh-100 py-5 position-relative"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        <BackgroundElements />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div 
                className="rounded-4 shadow-lg border overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  animation: 'fadeInUp 0.8s ease-out'
                }}
              >
                <div 
                  className="text-white text-center py-5"
                  style={{
                    background: getScoreGradient()
                  }}
                >
                  <Trophy className="mx-auto mb-3 text-warning" size={64} />
                  <h2 className="fw-bold mb-0">Quiz Complete! 🎉</h2>
                </div>
                <div className="p-5">
                  <div className="text-center mb-5">
                    <div className={`display-1 fw-bold mb-3 ${getScoreColor()}`}>
                      {score}/{parsedQuestions.length}
                    </div>
                    <div 
                      className="badge fs-6 px-4 py-2 rounded-pill mb-3"
                      style={{
                        background: getScoreGradient(),
                        color: 'white'
                      }}
                    >
                      {percentage.toFixed(0)}% Score
                    </div>
                    <p className="fs-5 text-white mb-0">{getScoreMessage()}</p>
                  </div>
                  
                  <div className="row g-4 mb-5">
                    <div className="col-md-4">
                      <div 
                        className="text-white h-100 p-4 rounded-3 text-center"
                        style={{
                          background: 'linear-gradient(135deg, #10B981, #059669)'
                        }}
                      >
                        <CheckCircle size={40} className="mb-3" />
                        <h5 className="fw-bold">Correct</h5>
                        <div className="display-6 fw-bold">{score}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div 
                        className="text-white h-100 p-4 rounded-3 text-center"
                        style={{
                          background: 'linear-gradient(135deg, #EF4444, #DC2626)'
                        }}
                      >
                        <XCircle size={40} className="mb-3" />
                        <h5 className="fw-bold">Incorrect</h5>
                        <div className="display-6 fw-bold">{parsedQuestions.length - score}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div 
                        className="text-white h-100 p-4 rounded-3 text-center"
                        style={{
                          background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
                        }}
                      >
                        <Clock size={40} className="mb-3" />
                        <h5 className="fw-bold">Time</h5>
                        <div className="display-6 fw-bold">{formatTime(timeSpent)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-4">
                    <p className="text-white text-opacity-75">
                      Quiz based on: <strong className="text-white">
                        {resumeText && jdText ? "Resume + Job Description" : resumeText ? "Resume" : "Job Description"}
                      </strong>
                    </p>
                  </div>
                  
                  <div className="d-flex flex-wrap gap-3 justify-content-center">
                    <button
                      onClick={handleRestartQuiz}
                      className="btn btn-lg px-5 py-3 rounded-pill shadow-lg border-0"
                      style={{
                        background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                        color: 'white',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <RotateCcw size={20} className="me-2" />
                      Retake Quiz
                    </button>
                    <button
                      onClick={() => {
                        setQuizStarted(false);
                        setCurrentQuestion(0);
                        setSelectedAnswers({});
                        setShowResults(false);
                        setScore(0);
                        setTimeSpent(0);

                        const profile = resumeText || jdText;
                        const prompt = generateQuizPrompt(profile);
                        generateQuiz(prompt);
                      }}
                      className="btn btn-lg px-5 py-3 rounded-pill shadow-lg border-0"
                      style={{
                        background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                        color: 'white',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Target size={20} className="me-2" />
                      New Quiz
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div 
        className="min-vh-100 py-5 position-relative"
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
        }}
      >
        <BackgroundElements />
        <div className="container position-relative" style={{ zIndex: 1 }}>
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div 
                className="rounded-4 shadow-lg border overflow-hidden"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  animation: 'fadeInUp 0.8s ease-out'
                }}
              >
                <div 
                  className="text-white text-center py-5"
                  style={{
                    background: 'linear-gradient(135deg, #4ECDC4, #44A08D)'
                  }}
                >
                  <BookOpen className="mx-auto mb-3" size={64} />
                  <h2 className="fw-bold mb-0">Technical Quiz Ready! 🚀</h2>
                </div>
                <div className="p-5">
                  <div className="text-center mb-4">
                    <p className="fs-5 text-white text-opacity-90">
                      We've generated <strong className="text-white">{parsedQuestions.length} personalized questions</strong> based on your technical profile. 
                      Test your knowledge and see how well you know your skills!
                    </p>
                  </div>
                  
                  <div className="row g-4 mb-5">
                    <div className="col-md-6">
                      <div 
                        className="p-4 rounded-3 h-100"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <div className="text-center">
                          <Award className="text-white mb-3" size={40} />
                          <h6 className="fw-bold text-white mb-3">Quiz Features</h6>
                          <div className="text-white text-opacity-75 small">
                            <div className="d-flex align-items-center justify-content-center mb-2">
                              <CheckCircle size={16} className="me-2 text-success" />
                              {parsedQuestions.length} Multiple Choice Questions
                            </div>
                            <div className="d-flex align-items-center justify-content-center mb-2">
                              <Clock size={16} className="me-2 text-info" />
                              No time limit - take your time
                            </div>
                            <div className="d-flex align-items-center justify-content-center mb-2">
                              <Trophy size={16} className="me-2 text-warning" />
                              Instant results and feedback
                            </div>
                            <div className="d-flex align-items-center justify-content-center">
                              <RefreshCw size={16} className="me-2 text-primary" />
                              Retake anytime
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div 
                        className="p-4 rounded-3 h-100"
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      >
                        <div className="text-center">
                          <Target className="text-white mb-3" size={40} />
                          <h6 className="fw-bold text-white mb-3">Based On</h6>
                          <p className="text-white text-opacity-90 mb-3">
                            <strong>
                              {resumeText && jdText ? "Resume + Job Description" : resumeText ? "Resume Profile" : "Job Description"}
                            </strong>
                          </p>
                          <span 
                            className="badge px-3 py-2 rounded-pill"
                            style={{
                              background: 'linear-gradient(45deg, #10B981, #059669)',
                              color: 'white'
                            }}
                          >
                            Personalized Content
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button
                      onClick={handleStartQuiz}
                      className="btn btn-lg px-5 py-3 rounded-pill shadow-lg border-0"
                      style={{
                        background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                        color: 'white',
                        transition: 'all 0.3s ease'
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
                      <BookOpen size={24} className="me-2" />
                      Start Quiz Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = parsedQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / parsedQuestions.length) * 100;

  return (
    <div 
      className="min-vh-100 py-4 position-relative"
      style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <BackgroundElements />
      <div className="container position-relative" style={{ zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-lg-10">
            {/* Header with Progress */}
            <div 
              className="p-4 mb-4 rounded-4 border"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span 
                      className="badge fs-6 px-3 py-2 rounded-pill"
                      style={{
                        background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                        color: 'white'
                      }}
                    >
                      Question {currentQuestion + 1} of {parsedQuestions.length}
                    </span>
                    <span className="text-white d-flex align-items-center">
                      <Clock size={18} className="me-2" />
                      {formatTime(timeSpent)}
                    </span>
                  </div>
                  <div 
                    className="rounded-pill overflow-hidden"
                    style={{ height: '8px', background: 'rgba(255,255,255,0.2)' }}
                  >
                    <div 
                      className="h-100 rounded-pill transition-all"
                      style={{ 
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #FF6B6B, #4ECDC4)',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                </div>
                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                  <span className="text-white text-opacity-75 small">
                    {Object.keys(selectedAnswers).length} of {parsedQuestions.length} answered
                  </span>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <div 
              className="p-5 mb-4 rounded-4 border"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                animation: 'slideInUp 0.5s ease-out'
              }}
            >
              <h3 className="fw-bold text-white mb-4" style={{lineHeight: '1.5'}}>
                {currentQ.question}
              </h3>
              
              <div className="row g-3">
                {currentQ.options.map((option) => (
                  <div key={option.key} className="col-12">
                    <div
                      className={`rounded-3 border-2 transition-all ${
                        selectedAnswers[currentQ.id] === option.key
                          ? 'border-warning bg-warning bg-opacity-20'
                          : 'border-light border-opacity-30'
                      }`}
                      onClick={() => handleAnswerSelect(currentQ.id, option.key)}
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: selectedAnswers[currentQ.id] === option.key 
                          ? 'rgba(255, 193, 7, 0.2)' 
                          : 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: selectedAnswers[currentQ.id] === option.key 
                          ? '2px solid #FFC107' 
                          : '2px solid rgba(255, 255, 255, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAnswers[currentQ.id] !== option.key) {
                          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.target.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAnswers[currentQ.id] !== option.key) {
                          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.target.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <div className="p-4 d-flex align-items-center">
                        <div 
                          className={`rounded-circle me-3 d-flex align-items-center justify-content-center ${
                            selectedAnswers[currentQ.id] === option.key
                              ? 'bg-warning text-dark'
                              : 'bg-white bg-opacity-20 text-white'
                          }`} 
                          style={{
                            width: '40px', 
                            height: '40px', 
                            fontSize: '16px', 
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {option.key.toUpperCase()}
                        </div>
                        <span className="text-white fw-medium fs-6">{option.text}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div 
              className="p-4 rounded-4 border"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className={`btn btn-lg px-4 py-3 rounded-pill border-0 ${
                    currentQuestion === 0 ? 'opacity-50' : ''
                  }`}
                  style={{
                    background: currentQuestion === 0 
                      ? 'rgba(255, 255, 255, 0.1)' 
                      : 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ArrowLeft size={20} className="me-2" />
                  Previous
                </button>
                
                <div className="text-center">
                  <p className="text-white text-opacity-75 small mb-2">
                    Quiz based on: <strong className="text-white">
                      {resumeText && jdText ? "Resume + JD" : resumeText ? "Resume" : "Job Description"}
                    </strong>
                  </p>
                </div>
                
                {currentQuestion === parsedQuestions.length - 1 ? (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(selectedAnswers).length !== parsedQuestions.length}
                    className={`btn btn-lg px-4 py-3 rounded-pill border-0 ${
                      Object.keys(selectedAnswers).length !== parsedQuestions.length ? 'opacity-50' : ''
                    }`}
                    style={{
                      background: Object.keys(selectedAnswers).length === parsedQuestions.length
                        ? 'linear-gradient(45deg, #10B981, #059669)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <CheckCircle size={20} className="me-2" />
                    Submit Quiz
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="btn btn-lg px-4 py-3 rounded-pill border-0"
                    style={{
                      background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                    }}
                  >
                    Next
                    <ArrowRight size={20} className="ms-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
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
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        
        .transition-all {
          transition: all 0.3s ease;
        }
        
        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        }
        
        .btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};

export default Quiz;