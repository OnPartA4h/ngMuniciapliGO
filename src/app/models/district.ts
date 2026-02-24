export class District {
    constructor(
        public id: number,
        public number: number,
        public name: string,
        public arrondissement: string,
        public colorIndex: number,
        public coordinates: number[][][]
    ) { }
}

export interface DistrictNames {
    id: number;
    number: number;
    name: string;
    arrondissement: string;
}