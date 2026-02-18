import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-stat-box',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './stat-box.html',
    styleUrl: './stat-box.css',
})
export class StatBox {
    @Input() title!: string;
    @Input() value!: number;
}
