export class Pagination {
    constructor(
        public currentPage: number,
        public pageSize: number,
        public totalCount: number,
        public totalPages: number
    ) { }
}