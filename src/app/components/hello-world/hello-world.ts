import { Component, OnInit, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-hello-world',
  standalone: true,
  imports: [],
  templateUrl: './hello-world.html',
  styleUrl: './hello-world.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelloWorld implements OnInit {
  constructor(public service: ApiService, private ngZone: NgZone) {}

  txt: string = "";

  async ngOnInit() {
    this.txt = await this.service.helloWorld();
  }
}
