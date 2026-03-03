import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';

@Component({
    selector: 'app-godot',
    template: `
    <div class="godot-container">
        <iframe
            #godotIframe
            src="assets/godot/voxel.html"
            width="800"
            height="600"
            allow="pointer-lock; fullscreen"
            frameborder="0">
        </iframe>
        <button class="fullscreen-btn" (click)="fullscreenIframe()" title="Plein écran">
            🖵 Plein écran
        </button>
    </div>
  `,
    styles: [`
    .godot-container {
      padding: var(--spacing-3xl);
      max-width: 1400px;
      margin: 0 auto;
    }
    .fullscreen-btn {
      display: block;
      margin: 24px auto 0 auto;
      padding: 12px 32px;
      font-size: 1.1rem;
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      transition: background 0.2s;
    }
    .fullscreen-btn:hover {
      background: var(--color-primary-dark, #1a237e);
    }
    .godot-header {
      margin-bottom: var(--spacing-3xl);
    }
    .godot-header h1 {
      color: var(--color-primary);
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      margin: 0;
    }
    .godot-container iframe {
      display: block;
      margin: 0 auto;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      background: #222;
    }
    #godot-canvas {
      width: 100%;
      background: #222;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      display: block;
    }
  `]
})
export class GodotPage implements AfterViewInit {
    @ViewChild('godotIframe') godotIframe!: ElementRef<HTMLIFrameElement>;

    ngAfterViewInit(): void { }

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

