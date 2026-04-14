export interface Translation {
  id: string;
  text: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  type: 'definition' | 'conjugation' | 'declension' | 'example' | 'other';
}

export interface Term {
  id: string;
  term: string;
  translations: Translation[];
  pronunciation?: string;
  illustration?: string;
  tags: string[]; // IDs of tags
  groups: string[]; // Complementary groups
  topicId: string;
  dictionaryId: string;
  links: Link[];
  definitions: string[];
  examples: string[];
  synonyms: string[];
  conjugations: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Topic {
  id: string;
  name: string;
  parentId: string | null; // For hierarchy
  dictionaryId: string;
}

export interface Dictionary {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
}

export interface AppState {
  dictionaries: Dictionary[];
  topics: Topic[];
  terms: Term[];
  tags: Tag[];
}
