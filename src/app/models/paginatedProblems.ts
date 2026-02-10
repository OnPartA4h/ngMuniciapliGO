import { Problem } from "./problem";

export class PaginatedProblems {
    constructor(
        public items: Problem[],
        public pagination: Pagination
    ) {}
  
}

export class Pagination {
    constructor(
        public currentPage: number,
        public pageSize: number,
        public totalCount: number,
        public totalPages: number
    ) {}
}