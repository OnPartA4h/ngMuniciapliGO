import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'duration', standalone: true })
export class DurationPipe implements PipeTransform {
  transform(value: Date): string {
   if (!value) return '00:00';

    const start = new Date(value).getTime();
    const now = Date.now();

    let diffSeconds = Math.floor((now - start) / 1000);
    if (diffSeconds < 0) diffSeconds = 0;

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  }
}
