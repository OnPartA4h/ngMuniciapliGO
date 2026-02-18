import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { WhiteService } from '../../services/white-service';
import { GeneralService } from '../../services/general-service';
import { LanguageService } from '../../services/language-service';
import { Problem, ProblemeEditDTO, CategoryOption } from '../../models/problem';
import { LoadingSpinnerComponent, PageHeaderComponent } from '../../components/ui';

@Component({
  selector: 'app-edit-problem',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    LoadingSpinnerComponent,
    PageHeaderComponent,
    RouterLink
  ],
  templateUrl: './edit-problem.html',
  styleUrl: './edit-problem.css',
})
export class EditProblem implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private whiteService = inject(WhiteService);
  private generalService = inject(GeneralService);
  private languageService = inject(LanguageService);
  private translateService = inject(TranslateService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly problem = signal<Problem | null>(null);
  readonly categories = signal<CategoryOption[]>([]);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  editForm: FormGroup;
  problemId: number | null = null;

  constructor() {
    this.editForm = this.fb.group({
      titre: ['', [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(200)
      ]],
      description: ['', [Validators.maxLength(256)]],
      address: ['', [
        Validators.required,
        Validators.maxLength(500)
      ]],
      categorie: ['', [Validators.required]]
    });
  }

  async ngOnInit() {
    // Get problem ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/manage-reports']);
      return;
    }

    this.problemId = parseInt(id, 10);

    try {
      await this.loadCategories();
      await this.loadProblem();
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadCategories() {
    try {
      const lang = this.languageService.getCurrentLanguage();
      this.categories.set(await this.generalService.getCategories(lang));
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  async loadProblem() {
    if (!this.problemId) return;

    try {
      const problem = await this.whiteService.getProblem(this.problemId);
      this.problem.set(problem);

      // Pre-fill form with problem data
      // Determine the select option value (category key) that matches the numeric index from the backend
      const categoryKey = this.categories()[problem.categorie]?.key ?? String(problem.categorie);

      this.editForm.patchValue({
        titre: problem.titre,
        description: problem.description || '',
        address: problem.address,
        categorie: categoryKey
      });
    } catch (error) {
      console.error('Error loading problem:', error);
      this.errorMessage.set(this.translateService.instant('EDIT_PROBLEM.ERROR_LOADING'));
    }
  }

  async submitForm() {
    this.editForm.markAllAsTouched();

    if (this.editForm.invalid || !this.problemId) {
      return;
    }

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    try {
      const dto: ProblemeEditDTO = {
        titre: this.editForm.value.titre,
        description: this.editForm.value.description || undefined,
        address: this.editForm.value.address,
        categorie: parseInt(this.editForm.value.categorie, 10)
      };

      const updatedProblem = await this.whiteService.editProblem(this.problemId, dto);
      this.problem.set(updatedProblem);
      this.successMessage.set(this.translateService.instant('EDIT_PROBLEM.SUCCESS'));

      // Redirect after short delay
      setTimeout(() => {
        this.router.navigate(['/report-details', this.problemId]);
      }, 1500);
    } catch (error: any) {
      console.error('Error updating problem:', error);
      this.errorMessage.set(
        error?.error?.message || this.translateService.instant('EDIT_PROBLEM.ERROR_UPDATING')
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.editForm.get(fieldName);
    if (!field) return false;

    if (errorType) {
      return !!(field.hasError(errorType) && field.touched);
    }
    return !!(field.invalid && field.touched);
  }

  cancel() {
    this.router.navigate(['/report-details', this.problemId]);
  }

  goBack() {
    this.cancel();
  }
}
