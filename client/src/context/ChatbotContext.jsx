import { createContext, useContext, useEffect, useState } from 'react';

// Lets the Listen button know whether KisanBot is open, so the two never
// fight for the same corner of the screen.
const ChatbotContext = createContext({ open: false, setOpen: () => {} });

export function ChatbotProvider({ children }) {
  const [open, setOpen] = useState(false);

  // Other screens (e.g. the "Need Help?" tile) can open the bot with an event.
  useEffect(() => {
    const openBot = () => setOpen(true);
    window.addEventListener('kd-open-chatbot', openBot);
    return () => window.removeEventListener('kd-open-chatbot', openBot);
  }, []);

  return <ChatbotContext.Provider value={{ open, setOpen }}>{children}</ChatbotContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useChatbot = () => useContext(ChatbotContext);
