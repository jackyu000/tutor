import { create } from 'zustand';



interface SessionState {
  isActive: boolean;
  startTime: number | null;
  timeRemaining: number;
  warningCount: number;
  lastInteractionTime: number;
  understandingScore: number;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  // Actions
  startSession: () => void;
  endSession: () => void;
  updateTimeRemaining: (time: number) => void;
  addMessage: (message: { role: 'user' | 'assistant' | 'system'; content: string }) => void;
  incrementWarning: () => void;
  updateUnderstandingScore: (score: number) => void;
  updateLastInteractionTime: () => void;
}

const useSessionStore = create<SessionState>((set) => ({
  isActive: false,
  startTime: null,
  timeRemaining: 30 * 60, // 30 minutes in seconds
  warningCount: 0,
  lastInteractionTime: Date.now(),
  understandingScore: 0,
  messages: [],

  startSession: () => set({ 
    isActive: true, 
    startTime: Date.now(),
    messages: [] 
  }),

  endSession: () => set({ 
    isActive: false, 
    startTime: null,
    timeRemaining: 30 * 60,
    understandingScore: 0,
    warningCount: 0
  }),
  
  updateTimeRemaining: (time) => set({ timeRemaining: time }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    lastInteractionTime: Date.now()
  })),
  
  incrementWarning: () => set((state) => ({
    warningCount: state.warningCount + 1
  })),
  
  updateUnderstandingScore: (score) => set((state) => ({
    understandingScore: state.understandingScore + score
  })),
  
  updateLastInteractionTime: () => set({ lastInteractionTime: Date.now() })
}));

export default useSessionStore;
