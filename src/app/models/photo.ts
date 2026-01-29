export class Photo {
  constructor(
    public id: number,
    public url: string,
    public dateUpload: Date,
    public problemeId: number
  ) {}
}