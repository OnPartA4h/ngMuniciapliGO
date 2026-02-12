import { Problem } from './problem';

export interface DuplicateGroup {
  id: number;
  status: string;
  createdAt: string;
  members: DuplicateGroupMember[];
}

export interface DuplicateGroupMember {
  id: number;
  problemeId: number;
  similarityScore: number;
  probleme: Problem;
}
