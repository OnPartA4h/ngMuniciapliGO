import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { RoleOption } from '../models/user';
import { StatusOption, CategoryOption, AssigneAOption } from '../models/problem';
import { LanguageService } from './language-service';

@Injectable({
  providedIn: 'root',
})
export class GeneralService {
  private http = inject(HttpClient);
  private languageService = inject(LanguageService);

  private apiUrl = environment.apiUrl;

  categories = signal<CategoryOption[]>([]);
  statuses = signal<StatusOption[]>([]);
  assignees = signal<AssigneAOption[]>([]);

  async getRoles(lang: string): Promise<RoleOption[]> {
    return await lastValueFrom(
      this.http.get<RoleOption[]>(`${this.apiUrl}/api/General/roles/${lang}`)
    );
  }

  async getStatuses(lang: string): Promise<StatusOption[]> {
    return await lastValueFrom(
      this.http.get<StatusOption[]>(`${this.apiUrl}/api/General/statuts/${lang}`)
    );
  }

  async getCategories(lang: string): Promise<CategoryOption[]> {
    return await lastValueFrom(
      this.http.get<CategoryOption[]>(`${this.apiUrl}/api/General/categories/${lang}`)
    );
  }

  async getAssigneA(lang: string): Promise<AssigneAOption[]> {
    return await lastValueFrom(
      this.http.get<CategoryOption[]>(`${this.apiUrl}/api/General/assignees/${lang}`)
    );
  }

  async getProblem(id: number): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(`${this.apiUrl}/api/General/problem/${id}`)
    );
  }

  async getStats(span: number): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(`${this.apiUrl}/api/Stats/${span}`)
    );
  }

  async loadCategories() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.categories.set(await this.getCategories(lang));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadStatuses() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.statuses.set(await this.getStatuses(lang));
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }

  async loadAssigneA() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.assignees.set(await this.getAssigneA(lang));
    } catch (error) {
      console.error('Error loading statuses:', error);
    }
  }

  getStatusLabel(statusKey: number): string {
    const status = this.statuses()[statusKey];
    return status ? status.label : statusKey.toString();
  }

  getCategoryLabel(categoryKey: number): string {
    const category = this.categories()[categoryKey];
    return category ? category.label : categoryKey.toString();
  }
}
