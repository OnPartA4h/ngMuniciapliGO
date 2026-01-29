import { environment } from "../../environments/environment";
import { CategorieProbleme } from "../enums/categorie-probleme";
import { StatutProbleme } from "../enums/statut-probleme";
import { Photo } from "./photo";
import { User } from "./user";

export class Problem {
    constructor(
        public id: number,
        public titre: string,
        public description: string,
        public location: string,
        public statut: StatutProbleme,
        public categorie: CategorieProbleme,
        public dateCreation: Date,
        public dateResolution: Date,
        public assignedUser: User | null,
        public photos: Photo[]
    ) {}
}