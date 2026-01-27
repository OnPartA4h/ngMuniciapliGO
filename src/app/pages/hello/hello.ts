import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-hello',
  imports: [],
  templateUrl: './hello.html',
  styleUrl: './hello.css',
})
export class Hello implements OnInit {
  txt = "";

  constructor(public service: ApiService) {}

  ngOnInit() {
    this.getHello();
  }

  async getHello() {
    const response = await this.service.helloWorld();
    this.txt = response;
  }
}
