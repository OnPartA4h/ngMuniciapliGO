import { Pagination } from "./pagination";

export interface DuplicateGroup {
  id: number;
  name: string;
  dateCreation: string;
  isClosed: boolean;
  aiReasonEN: string | null;
  aiReasonFR: string | null;
  dateClosed: string | null;
  closedByUserId: string | null;
  members: DuplicateGroupMember[];
}

export interface DuplicateGroupMember {
  id: number;
  problemeId: number;
  similarityScore: number;
  isPrimary: boolean;
  dateAdded: string;
  probleme: ProblemeSummary | null;
}

export interface ProblemeSummary {
  id: number;
  titre: string;
  description: string;
  address: string;
  categorie: string;
  statut: string;
  dateCreation: string;
  photoUrl: string | null;
  citoyenDemandeurNom: string | null;
}

export interface PaginatedDuplicateGroup {
  items: DuplicateGroup[];
  pagination: Pagination;
}