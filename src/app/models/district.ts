export class District {
    constructor(
        public id: number,
        public number: number,
        public name: string,
        public arrondissement: string,
        public colorIndex: number,
        public coordinates: number[][][],
        public problemCount: number
    ) { }
}

export interface DistrictNames {
    id: number;
    number: number;
    name: string;
    arrondissement: string;
}