import { Component, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
import { CommentService } from '../../services/comment-service';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { UserComment } from '../../models/userComment';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { Pagination } from '../../models/pagination';
import { PaginationComponent } from '../../components/ui/pagination/pagination';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmModalComponent } from '../../components/modals/confirm-modal/confirm-modal';
import { EmptyStateComponent } from '../../components/ui/empty-state/empty-state';

@Component({
  selector: 'app-comments',
  imports: [PageHeaderComponent, DaysAgoPipe, RouterLink, PaginationComponent, TranslateModule, ConfirmModalComponent, EmptyStateComponent],
  templateUrl: './comments.html',
  styleUrl: './comments.css',
})
export class Comments implements OnInit{
  private commentsService = inject(CommentService)
  private route = inject(ActivatedRoute)

  comments = signal<UserComment[]>([])
  openReplies = new Set<number>();
  problemId: number = -1
  pagination: Pagination | null = null;
  showConfirmModal = signal<boolean>(false)

  deleteCommentId: number = -1

  async ngOnInit(){
    this.route.paramMap.subscribe((params: ParamMap) => {
      let id = params.get('id')
      this.problemId = parseInt(id!)
    })

    await this.getComments()
  }

  toggleReplies(commentId: number) {
    if (this.openReplies.has(commentId)) {
      this.openReplies.delete(commentId);
    } else {
      this.openReplies.add(commentId);
    }
  }

  isRepliesOpen(commentId: number): boolean {
    return this.openReplies.has(commentId);
  }

  async getComments(page: number = 1) {
    let data: any = await this.commentsService.getComments(this.problemId, page)
    this.comments.set(data.items)
    this.pagination = data.pagination || null;
  }

  async onPageChange(page: number) {
    await this.getComments(page);
  }

  deleteComment(commentId: number) {
    this.showConfirmModal.set(true)
    this.deleteCommentId = commentId
  }

  async confirmDeleteComment() {
    await this.commentsService.deleteComment(this.problemId, this.deleteCommentId)
    this.showConfirmModal.set(false)

    // Retrait immédiat depuis la liste locale sans rechargement
    const id = this.deleteCommentId;
    this.comments.update(list => {
      // Vérifier si c'est un commentaire principal
      const isTopLevel = list.some(c => c.id === id);
      if (isTopLevel) {
        return list.filter(c => c.id !== id);
      }
      // Sinon c'est une réponse : la retirer de son parent
      return list.map(c => ({
        ...c,
        replies: c.replies.filter(r => r.id !== id)
      }));
    });

    this.deleteCommentId = -1;
  }

  cancelDeleteComment() {
    this.showConfirmModal.set(false)
    this.deleteCommentId = -1
  }

  /**
   * Détecte si une URL pointe vers un GIF (extension .gif ou domaine Giphy/Tenor).
   */
  isGifUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.gif')
      || lower.includes('giphy.com')
      || lower.includes('tenor.com')
      || lower.includes('media.giphy')
      || lower.includes('/gifs/');
  }
}
