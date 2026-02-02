import { environment } from "../../environments/environment";
import { Photo } from "./photo";
import { User } from "./user";

export interface StatusOption {
  key: string;
  label: string;
}

export interface CategoryOption {
  key: string;
  label: string;
}

export class Problem {
  constructor(
    public id: number,
    public titre: string,
    public description: string,
    public location: string,
    public statut: number,
    public categorie: number,
    public dateCreation: Date,
    public dateResolution: Date,
    public assignedUser: User | null,
    public photos: Photo[]
  ) { }
}