import { Component, inject, OnInit, signal } from '@angular/core';
import { Location } from '@angular/common';
import { PageHeaderComponent } from '../../components/ui/page-header/page-header';
import { CommentService } from '../../services/comment-service';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { UserComment } from '../../models/userComment';
import { sign } from 'chart.js/helpers';

@Component({
  selector: 'app-comments',
  imports: [PageHeaderComponent],
  templateUrl: './comments.html',
  styleUrl: './comments.css',
})
export class Comments implements OnInit{
  private location = inject(Location);
  private commentsService = inject(CommentService)
  private route = inject(ActivatedRoute)

  comments = signal<UserComment[]>([])
  problemId: number = -1

  async ngOnInit(){
    this.route.paramMap.subscribe((params: ParamMap) => {
      let id = params.get('id')
      this.problemId = parseInt(id!)
    })

    await this.getComments()
  }
  

  goBack() {
    this.location.back();
  }

  async getComments() {
    let data: any = await this.commentsService.getComments(this.problemId)
    this.comments.set(data.items)
  }
}
