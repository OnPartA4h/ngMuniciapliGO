import { Pagination } from "./pagination";

export interface Notification {
  id: number;
  problemeId: number;
  problemeTitre: string;
  message: string;
  estLue: boolean;
  dateCreation: string;

  commentReportId: number;
  commentId: number
  text: string;
  reason: string;
  category: number;
}

export interface PaginatedNotifications {
  items: Notification[];
  pagination: Pagination;
}

export interface UnreadCount {
  unreadCount: number;
}
