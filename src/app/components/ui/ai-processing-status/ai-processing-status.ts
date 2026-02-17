import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NotificationHubService } from '../../../services/notification-hub.service';

@Component({
  selector: 'app-ai-processing-status',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './ai-processing-status.html',
  styleUrl: './ai-processing-status.css'
})
export class AiProcessingStatusComponent implements OnInit {
  private notificationHubService = inject(NotificationHubService);

  readonly processingCount = computed(() => this.notificationHubService.duplicateProcessingCount());
  readonly isVisible = computed(() => this.processingCount() > 0);

  ngOnInit() {
    // The NotificationHubService will automatically update the signal
    // when receiving 'DuplicateProcessingCount' messages from SignalR
  }

  getProcessingStatusMessage(): string {
    const count = this.processingCount();
    if (count === 0) {
      return 'AI_PROCESSING.NO_PROCESSING';
    } else if (count === 1) {
      return 'AI_PROCESSING.ONE_PROCESSING';
    } else {
      return 'AI_PROCESSING.MULTIPLE_PROCESSING';
    }
  }
}
