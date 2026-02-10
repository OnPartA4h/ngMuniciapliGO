import { Pagination } from "./pagination";

export interface Notification {
  id: number;
  problemeId: number;
  problemeTitre: string;
  message: string;
  estLue: boolean;
  dateCreation: string;
}

export interface PaginatedNotifications {
  items: Notification[];
  pagination: Pagination;
}

export interface UnreadCount {
  unreadCount: number;
}
