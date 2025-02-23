'use client';

import { useEffect, useRef, useState } from 'react';
import useSessionStore from '../store/sessionStore';

export default function Chat() {
  const {
    isActive,
    startSession,
    endSession,
    timeRemaining,
    messages,
    addMessage,
    updateTimeRemaining,
    incrementWarning,
    updateLastInteractionTime,
    understandingScore,
    updateUnderstandingScore
  } = useSessionStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);



  // Initialize session with greeting
  useEffect(() => {
    if (isActive && messages.length === 0) {
      console.log('Initializing session...');
      const initializeSession = async () => {
        try {
          console.log('Sending initial request...');
          const tutorResponse = await fetch('/api/tutor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'START_SESSION',
              messages: []
            })
          });

          const tutorData = await tutorResponse.json();
          console.log('Received tutor response:', tutorData);

          if (!tutorResponse.ok) {
            throw new Error(tutorData.error || `HTTP error! status: ${tutorResponse.status}`);
          }
          
          if (!tutorData.reply) {
            throw new Error('No reply in tutor response');
          }

          addMessage({ role: 'assistant', content: tutorData.reply });
        } catch (error) {
          console.error('Error initializing session:', error);
          addMessage({
            role: 'system',
            content: 'Failed to start session. Please try again.'
          });
        }
      };

      initializeSession();
    }
  }, [isActive, messages.length, addMessage]);

  useEffect(() => {
    if (isActive) {
      const timer = setInterval(() => {
        updateTimeRemaining(Math.max(0, timeRemaining - 1));
        if (timeRemaining <= 0) {
          endSession();
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isActive, timeRemaining, updateTimeRemaining, endSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value.trim();
    if (!input) return;

    // Reset input and update interaction time
    inputRef.current.value = '';
    updateLastInteractionTime();

    console.log('User input:', input);
    
    // Add user message
    addMessage({ role: 'user', content: input });
    console.log('Added user message to chat');

    try {
      // Check guardrails
      const guardrailResponse = await fetch('/api/guardrail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          timeElapsed: Date.now() - useSessionStore.getState().lastInteractionTime,
          warningCount: useSessionStore.getState().warningCount
        })
      });

      const guardrailData = await guardrailResponse.json();
      console.log('Guardrail response:', guardrailData);
      
      if (!guardrailData.safe) {
        addMessage({ role: 'system', content: guardrailData.warning });
        incrementWarning();
        if (guardrailData.severity >= 3) {
          setShowViolationWarning(true);
          endSession();
        }
        return; // Don't get tutor response if there's a warning
      }

      // Get tutor response
      const tutorResponse = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          messages: messages.slice(-5) // Send last 5 messages for context
        })
      });

      const tutorData = await tutorResponse.json();
      console.log('Tutor response:', tutorData);
      addMessage({ role: 'assistant', content: tutorData.reply });
      console.log('Added tutor reply to chat');

      // Get evaluator feedback
      console.log('Calling evaluator...');
      const evaluatorResponse = await fetch('/api/evaluator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          messages: messages.slice(-5)
        })
      });

      const evaluatorData = await evaluatorResponse.json();
      console.log('Evaluator response:', evaluatorData);
      
      if (evaluatorData.score !== undefined) {
        updateUnderstandingScore(evaluatorData.score);
        console.log('Updated understanding score');
        
        // Add subtle feedback if score is not neutral
        if (evaluatorData.score !== 0) {
          addMessage({
            role: 'system',
            content: evaluatorData.feedback || (evaluatorData.score > 0 ? '👍 Good thinking!' : '🤔 Let\'s clarify this.')
          });
        }
      }

    } catch (error) {
      console.error('Error:', error);
      addMessage({
        role: 'system',
        content: 'Sorry, there was an error processing your request.'
      });
    }
  };

  const [showViolationWarning, setShowViolationWarning] = useState(false);

  if (!isActive) {
    if (showViolationWarning) {
      return (
        <div className="w-full max-w-4xl mx-auto p-6 text-center">
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-8 mb-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Session Terminated
            </h2>
            <p className="text-red-700 mb-4">
              Your session has been terminated due to multiple policy violations. 
              This incident will be reported and reviewed.
            </p>
            <p className="text-gray-600 text-sm">
              We expect all users to maintain appropriate and respectful communication.
            </p>
          </div>
          <button
            onClick={() => {
              setShowViolationWarning(false);
              startSession();
            }}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-lg font-semibold"
          >
            Start New Session
          </button>
        </div>
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto text-center">
        <button
          onClick={() => startSession()}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 text-lg font-semibold"
        >
          Start 30-Minute Tutoring Session
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col h-[800px]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Math Tutor Session</h2>
            <div className="text-sm text-gray-600">
              Understanding Score: {understandingScore.toFixed(1)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatTime(timeRemaining)}</div>
            <div className="text-gray-600">Time Remaining</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-grow space-y-4 mb-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-100 ml-auto max-w-[80%]'
                  : message.role === 'system'
                  ? 'bg-yellow-100 mx-auto max-w-[90%] text-center'
                  : 'bg-gray-100 mr-auto max-w-[80%]'
              }`}
            >
              {message.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mt-auto">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
