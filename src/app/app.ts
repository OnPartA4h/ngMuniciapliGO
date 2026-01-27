import { Component, OnInit, ChangeDetectionStrategy, NgZone, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './services/api-service';
import { HelloWorld } from './components/hello-world/hello-world';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HelloWorld],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App  {

  constructor(public service: ApiService) {}

  txt = signal<string>("");

  async getHello() {
    const response = await this.service.helloWorld();
    this.txt.set(response);
  }

}
