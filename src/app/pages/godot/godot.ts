import { Component, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { assetUrl } from '../../app.config';

@Component({
  selector: 'app-godot',
  templateUrl: './godot.html',
  styleUrl: './godot.css',
})
export class GodotPage {
  @ViewChild('godotIframe') godotIframe!: ElementRef<HTMLIFrameElement>;

  private sanitizer = inject(DomSanitizer);
  iframeSrc: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(assetUrl('assets/godot/voxel.html'));

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

