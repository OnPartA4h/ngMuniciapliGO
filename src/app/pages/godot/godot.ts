import { Component, AfterViewInit } from '@angular/core';

@Component({
    selector: 'app-godot',
    template: `
    <div class="godot-container">
        <div class="godot-header">
            <h1>Voxel</h1>
        </div>
        <iframe
            src="assets/godot/voxel.html"
            width="100%"
            height="600"
            allow="pointer-lock; fullscreen"
            frameborder="0">
        </iframe>
    </div>
  `,
    styles: [`
    .godot-container {
      padding: var(--spacing-3xl);
      max-width: 1400px;
      margin: 0 auto;
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
    #godot-canvas {
      width: 100%;
      height: 600px;
      background: #222;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      display: block;
    }
  `]
})
export class GodotPage implements AfterViewInit {
    ngAfterViewInit(): void { }
}

