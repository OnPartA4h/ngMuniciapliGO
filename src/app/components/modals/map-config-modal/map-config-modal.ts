import { Component, Input, OnInit, input, output, SimpleChange, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-map-config-modal',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule],
  templateUrl: './map-config-modal.html',
  styleUrl: './map-config-modal.css',
})
export class MapConfigModal implements OnChanges {
  readonly isOpen = input<boolean>(false);
  readonly close = output<void>();
  readonly apply = output<void>();
  readonly radiusChange = output<number>();

  DEFAULT_RADIUS = 1000

  radius: number = this.DEFAULT_RADIUS;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      let radiusData = localStorage.getItem("radius");
      this.radius = !radiusData ? this.DEFAULT_RADIUS : parseInt(radiusData);
    }
  }

  closeModal() {
    this.close.emit(undefined);
  }

  applyFilters() {
    localStorage.setItem("radius", this.radius.toString());
    this.apply.emit(undefined);;
    this.close.emit();
  }

  resetFilters() {
    this.radius = this.DEFAULT_RADIUS;
  }

  handleBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  onRadiusChange() {
    this.radiusChange.emit(this.radius)
  }
}
