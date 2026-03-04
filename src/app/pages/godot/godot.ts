import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-godot',
  templateUrl: './godot.html',
  styleUrl: './godot.css',
})
export class GodotPage {
    @ViewChild('godotIframe') godotIframe!: ElementRef<HTMLIFrameElement>;

    fullscreenIframe() {
      const iframe = this.godotIframe?.nativeElement;
      if (iframe) {
        if (iframe.requestFullscreen) {
          iframe.requestFullscreen();
        } else if ((iframe as any).webkitRequestFullscreen) {
          (iframe as any).webkitRequestFullscreen();
        } else if ((iframe as any).msRequestFullscreen) {
          (iframe as any).msRequestFullscreen();
        }
      }
    }
}

