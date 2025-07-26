// pages/Quiz.js
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const Quiz = ({ resumeText, GEMINI_API_KEY, MODEL }) => {
  const [quiz, setQuiz] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

    const generateQuizPrompt = (profileText) => {
    return `
    Generate 15 multiple-choice questions (MCQs) to help a student practice technical concepts based on the following skill set, tools, technologies, and projects.

    📌 Focus ONLY on:
    - Programming languages (e.g., Python, JavaScript)
    - Frameworks and libraries (e.g., React, Node.js)
    - Databases or APIs (e.g., MongoDB, SQL, REST, Gemini API)
    - Concepts used in the listed projects (e.g., CRUD, authentication, AI integration)
    - Logic and syntax-based questions related to these technologies

    ❌ Do NOT mention anything about the candidate, resume, name, email, GitHub, or LinkedIn.

    💡 Treat this as a **student's technical profile** and generate MCQs only for skill testing.

    Each question should:
    - Be short and clear
    - Include 4 options (a, b, c, d)
    - Add the correct option at the end of the list like this: **Correct Answer: a)**

    Here is the technical profile:
    ${profileText}
    `.trim();
    };


  useEffect(() => {
    const generateQuiz = async () => {
      setLoading(true);
      setError("");
      try {
        const prompt = generateQuizPrompt(resumeText);
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        const result = await response.json();
        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        setQuiz(text || "No quiz generated.");
      } catch (err) {
        console.error(err);
        setError("Error generating quiz.");
      } finally {
        setLoading(false);
      }
    };

    if (resumeText) generateQuiz();
  }, [resumeText, GEMINI_API_KEY, MODEL]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-3xl w-full bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-center text-green-700">
          AI-Generated Quiz Based on Your Resume
        </h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-gray-600 py-12">
            <Loader2 className="animate-spin h-6 w-6" />
            <p>Generating quiz based on your skills and projects...</p>
          </div>
        ) : error ? (
          <div className="text-red-600 text-center py-6">{error}</div>
        ) : (
          <pre className="whitespace-pre-wrap text-gray-800 bg-gray-100 p-4 rounded-md overflow-auto">
            {quiz}
          </pre>
        )}
      </div>
    </div>
  );
};

export default Quiz;
