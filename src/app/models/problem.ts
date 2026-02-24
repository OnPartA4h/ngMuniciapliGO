import { environment } from "../../environments/environment";
import { Photo } from "./photo";
import { User } from "./user";

export interface StatusOption {
  key: number;
  label: string;
}

export interface CategoryOption {
  key: number;
  label: string;
}

export interface AssigneAOption {
  key: number;
  label: string;
}

export interface TimeSpanOption {
  key: string;
  label: string;
}

export class Problem {
  constructor(
    public id: number,
    public titre: string,
    public description: string,
    public address: string,
    public statut: number,
    public categorie: number,
    public dateCreation: Date,
    public dateResolution: Date | null,
    public latitude: number,
    public longitude: number,
    public assigneA: number,
    public citoyenDemandeurId: string,
    public citoyenDemandeur: User | null,
    public colBlancsAssocies: User[],
    public responsableId: string | null,
    public responsable: User | null,
    public photos: Photo[],
    public resolutionPhotos: Photo[],
    public resolutionDescription: string | null,
    public rejectionReason: string | null,
    public isInOpenDuplicateGroup: boolean,
    public nbLikes: number
  ) { }
}

export interface ProblemeEditDTO {
  titre: string;
  description?: string;
  address: string;
  categorie: number;
}

export interface GraphDTO {
  date: string;
  reportedCount: number;
  solvedCount: number;
}

export interface GraphAverageDTO {
  date: string;
  resolution: number;
  priseEnCharge: number;
  assignation: number;
}