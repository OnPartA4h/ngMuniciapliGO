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
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface UnreadCount {
  unreadCount: number;
}
