"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  KnowledgeDocument,
  PracticeAttempt,
  WrongQuestion,
} from "@/lib/database.types";

type ProtectedDataContextValue = {
  knowledgeDocuments: KnowledgeDocument[] | null;
  setKnowledgeDocuments: Dispatch<SetStateAction<KnowledgeDocument[] | null>>;
  wrongQuestions: WrongQuestion[] | null;
  setWrongQuestions: Dispatch<SetStateAction<WrongQuestion[] | null>>;
  practiceAttempts: PracticeAttempt[] | null;
  setPracticeAttempts: Dispatch<SetStateAction<PracticeAttempt[] | null>>;
};

const ProtectedDataContext = createContext<ProtectedDataContextValue | null>(null);

export function ProtectedDataProvider({ children }: { children: ReactNode }) {
  const [knowledgeDocuments, setKnowledgeDocuments] = useState<KnowledgeDocument[] | null>(null);
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[] | null>(null);
  const [practiceAttempts, setPracticeAttempts] = useState<PracticeAttempt[] | null>(null);

  return (
    <ProtectedDataContext.Provider
      value={{
        knowledgeDocuments,
        setKnowledgeDocuments,
        wrongQuestions,
        setWrongQuestions,
        practiceAttempts,
        setPracticeAttempts,
      }}
    >
      {children}
    </ProtectedDataContext.Provider>
  );
}

export function useProtectedData() {
  const context = useContext(ProtectedDataContext);
  if (!context) {
    throw new Error("useProtectedData must be used within ProtectedDataProvider");
  }
  return context;
}
