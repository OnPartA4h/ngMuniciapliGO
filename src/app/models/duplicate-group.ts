import { Problem } from './problem';

export interface DuplicateGroup {
  id: number;
  name: string;
  description: string;
  dateCreation: string;
  status: string;
  isClosed: boolean;
  aiReasonEN: string;
  aiReasonFR: string;
  aiReason: string;
  dateValidation: string | null;
  validatedByUserId: string | null;
  closureComment: string | null;
  members: DuplicateGroupMember[];
}

export interface DuplicateGroupMember {
  id: number;
  problemeId: number;
  similarityScore: number;
  isPrimary: boolean;
  probleme: Problem;
}
