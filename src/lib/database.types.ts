type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type KnowledgeDocument = {
  id: string;
  owner_id: string;
  title: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  tags: string[];
  extracted_text: string;
  created_at: string;
  updated_at: string;
};

export type WrongQuestion = {
  id: string;
  owner_id: string;
  question: string;
  correct_answer: string;
  explanation: string;
  knowledge_point: string;
  created_at: string;
  updated_at: string;
};

export type PracticeAttempt = {
  id: string;
  owner_id: string;
  question_id: string | null;
  question_snapshot: string;
  answer: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      knowledge_documents: Table<
        KnowledgeDocument,
        Omit<KnowledgeDocument, "id" | "created_at" | "updated_at">,
        Partial<Omit<KnowledgeDocument, "id" | "owner_id" | "created_at">>
      >;
      wrong_questions: Table<
        WrongQuestion,
        Omit<WrongQuestion, "id" | "created_at" | "updated_at">,
        Partial<Omit<WrongQuestion, "id" | "owner_id" | "created_at">>
      >;
      practice_attempts: Table<
        PracticeAttempt,
        Omit<PracticeAttempt, "id" | "created_at">,
        Partial<Omit<PracticeAttempt, "id" | "owner_id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};