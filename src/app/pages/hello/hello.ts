import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../services/hello-service';

@Component({
  selector: 'app-hello',
  imports: [],
  templateUrl: './hello.html',
  styleUrl: './hello.css',
})
export class Hello implements OnInit {
  service = inject(ApiService);

  txt = "";

  ngOnInit() {
    this.getHello();
  }

  async getHello() {
    const response = await this.service.helloWorld();
    this.txt = response;
  }
}
