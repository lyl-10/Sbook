"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type ChatCitation = { id: string; title: string; excerpt: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ChatCitation[];
  image?: string;
};

type ChatMessagesContextValue = {
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
};

const ChatMessagesContext = createContext<ChatMessagesContextValue | null>(null);

export function ChatMessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  return (
    <ChatMessagesContext.Provider value={{ messages, setMessages }}>
      {children}
    </ChatMessagesContext.Provider>
  );
}

export function useChatMessages() {
  const context = useContext(ChatMessagesContext);
  if (!context) {
    throw new Error("useChatMessages must be used within ChatMessagesProvider");
  }
  return context;
}
