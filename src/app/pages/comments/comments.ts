import { Component, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
import { CommentService } from '../../services/comment-service';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { UserComment } from '../../models/userComment';
import { DaysAgoPipe } from '../../pipes/days-ago-pipe';
import { Pagination } from '../../models/pagination';
import { PaginationComponent } from '../../components/ui/pagination/pagination';

@Component({
  selector: 'app-comments',
  imports: [PageHeaderComponent, DaysAgoPipe, RouterLink, PaginationComponent],
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
}
