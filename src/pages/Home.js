import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Upload, FileText, Briefcase, Play, MessageSquare, Check, AlertCircle } from "lucide-react";

const Home = ({ setResumeText, setJdText, resumeText, jdText }) => {
  const [showJDpopup, setShowJDpopup] = useState(false);
  const [tempJD, setTempJD] = useState("");
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const [showToast, setShowToast] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Derive the upload status from the actual data
  const resumeUploaded = Boolean(resumeText);
  const jdAdded = Boolean(jdText);

  const handleFileChange = (file) => {
    if (!file) return;
    
    if (file.size > 1024 * 1024) { // 1MB limit
      setShowToast("File size should be less than 1MB");
      return;
    }


    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      setResumeText(event.target.result);
      setShowToast("Resume uploaded successfully!");
      setTimeout(() => setShowToast(""), 3000);
    };
    fileReader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleStart = (type) => {
    if (!resumeUploaded && !jdAdded) {
      setShowToast("Please upload a resume or add a job description to get started.");
      setTimeout(() => setShowToast(""), 4000);
    } else {
      navigate(type === "interview" ? "/interview" : "/quiz");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showJDpopup && popupRef.current && !popupRef.current.contains(e.target)) {
        setShowJDpopup(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        setShowJDpopup(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showJDpopup]);

  return (
    <div className="min-vh-100" style={{ 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Animated background elements */}
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
      </div>

      <div className="container py-5 position-relative" style={{ zIndex: 1 }}>
        <div className="text-center mb-5">
          <h1 className="display-4 fw-bold text-white mb-3" style={{
            textShadow: '0 4px 6px rgba(0,0,0,0.1)',
            animation: 'fadeInDown 1s ease-out'
          }}>
            🤖 AI Interview Assistant
          </h1>
          <p className="lead text-white-50 mb-4" style={{ animation: 'fadeInUp 1s ease-out 0.2s both' }}>
            Upload your resume or job description to get personalized interview practice
          </p>
        </div>

        {/* Upload Section */}
        <div className="row justify-content-center mb-5">
          <div className="col-lg-10">
            <div
              className="card border-0 shadow-lg p-4"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                animation: 'fadeInUp 1s ease-out 0.3s both'
              }}
            >
              <div className="row gy-4">
                {/* Resume Upload */}
                <div className="col-md-6">
                  <div
                    className={`border border p-4 rounded-4 text-center shadow-sm transition-all ${
                      isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-light'
                    } ${resumeUploaded ? 'border-success bg-success bg-opacity-10' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '2px soild rgba(255,255,255,0.3)'
                    }}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileChange(e.target.files[0])}
                      className="d-none"
                    />
                    {resumeUploaded ? (
                      <>
                        <Check size={48} className="text-success mb-2 m-auto" />
                        <h5 className="text-success mb-1">Resume Uploaded!</h5>
                        <small className="text-muted">Click to replace resume</small>
                      </>
                    ) : (
                      <>
                        <Upload size={48} className="text-primary mb-2 m-auto" />
                        <h5 className="mb-2">Upload Resume</h5>
                        <small className="text-muted">Drag & drop or click to browse</small>
                      </>
                    )}
                  </div>
                </div>

                {/* Job Description */}
                <div className="col-md-6">
                  <div
                    className={`p-4 rounded-4 text-center shadow-sm transition-all border ${
                      jdAdded ? 'border-success bg-success bg-opacity-10' : 'border-light'
                    }`}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}
                    onClick={() => {
                      setTempJD(jdText);
                      setShowJDpopup(true);
                    }}
                  >
                    <Briefcase size={48} className={`mb-2 m-auto ${jdAdded ? 'text-success' : 'text-primary'}`} />
                    <h5 className="mb-2">
                      {jdAdded ? 'Edit Job Description' : 'Add Job Description'}
                    </h5>
                    <small className="text-muted">
                      {jdAdded ? 'Click to update JD' : 'Click to add job details'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center mb-4" style={{ animation: 'fadeInUp 1s ease-out 0.6s both' }}>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <button
              className="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-lg"
              onClick={() => handleStart("quiz")}
              style={{
                background: 'linear-gradient(45deg, #FF6B6B, #FF8E53)',
                border: 'none',
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
              <Play size={20} className="me-2" />
              Start Quiz
            </button>
            
            <button
              className="btn btn-success btn-lg rounded-pill px-5 py-3 shadow-lg"
              onClick={() => handleStart("interview")}
              style={{
                background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                border: 'none',
                transition: 'all 0.3s ease',
                transform: 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(78,205,196,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <MessageSquare size={20} className="me-2" />
              Start Interview
            </button>
          </div>
          
          <p className="text-white-50 mt-3 small">
            Get AI-powered interview practice tailored to your profile
          </p>
        </div>

        {/* Features */}
        <div className="row justify-content-center mt-5" style={{ animation: 'fadeInUp 1s ease-out 0.8s both' }}>
          <div className="col-lg-10">
            <div className="row text-center text-white">
              <div className="col-md-4 mb-3">
                <div className="p-3">
                  <FileText size={40} className="mb-3 opacity-75" />
                  <h6>Smart Analysis</h6>
                  <small className="opacity-75">AI analyzes your resume and job requirements</small>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="p-3">
                  <MessageSquare size={40} className="mb-3 opacity-75" />
                  <h6>Realistic Practice</h6>
                  <small className="opacity-75">Practice with real interview scenarios</small>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="p-3">
                  <Play size={40} className="mb-3 opacity-75" />
                  <h6>Instant Feedback</h6>
                  <small className="opacity-75">Get immediate insights on your performance</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div 
          className="position-fixed top-0 start-50 translate-middle-x mt-4"
          style={{ zIndex: 9999, animation: 'slideInDown 0.5s ease-out' }}
        >
          <div className={`alert ${showToast.includes('success') ? 'alert-success' : 'alert-danger'} border-0 shadow-lg rounded-pill px-4 py-3 d-flex align-items-center`}>
            {showToast.includes('success') ? (
              <Check size={20} className="me-2" />
            ) : (
              <AlertCircle size={20} className="me-2" />
            )}
            <span>{showToast}</span>
            <button
              type="button"
              className="btn-close ms-3"
              onClick={() => setShowToast("")}
            ></button>
          </div>
        </div>
      )}

      {/* Job Description Popup */}
      {showJDpopup && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ 
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 1050,
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div
            className="position-absolute top-50 start-50 translate-middle bg-white rounded-4 shadow-lg overflow-hidden"
            ref={popupRef}
            style={{ 
              width: "90%", 
              maxWidth: "700px", 
              maxHeight: "85vh",
              animation: 'scaleIn 0.3s ease-out'
            }}
          >
            <div className="bg-primary text-white p-4 d-flex justify-content-between align-items-center">
              <div>
                <h4 className="mb-1">
                  <Briefcase size={24} className="me-2" />
                  Job Description
                </h4>
                <small className="opacity-75">Paste or edit your job description below</small>
              </div>
              <button
                onClick={() => {
                  setShowJDpopup(false);
                  setTempJD("");
                }}
                className="btn btn-link text-white p-0"
                style={{ fontSize: '1.5rem' }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              <textarea
                rows="12"
                placeholder="Paste the job description here..."
                value={tempJD}
                onChange={(e) => setTempJD(e.target.value)}
                className="form-control border-2 rounded-3"
                style={{ 
                  resize: 'none',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
              />

              <div className="d-flex justify-content-between mt-4">
                <button
                  className="btn btn-primary rounded-pill px-4 py-2"
                  onClick={() => {
                    setJdText(tempJD);
                    setShowJDpopup(false);
                    setTempJD("");
                    setShowToast("Job description saved successfully!");
                    setTimeout(() => setShowToast(""), 3000);
                  }}
                  disabled={!tempJD.trim()}
                >
                  <Check size={16} className="me-2" />
                  Save Description
                </button>
                <button 
                  onClick={() => {
                    setShowJDpopup(false);
                    setTempJD("");
                  }} 
                  className="btn btn-outline-secondary rounded-pill px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
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
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        
        @keyframes slideInDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Home;