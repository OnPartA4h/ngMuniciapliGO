import { Component, OnInit, ChangeDetectionStrategy, NgZone, inject } from '@angular/core';
import { ApiService } from '../../services/hello-service';

@Component({
  selector: 'app-hello-world',
  standalone: true,
  imports: [],
  templateUrl: './hello-world.html',
  styleUrl: './hello-world.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelloWorld implements OnInit {
  service = inject(ApiService);
  private ngZone = inject(NgZone);


  txt: string = "";

  async ngOnInit() {
    this.txt = await this.service.helloWorld();
  }
}
