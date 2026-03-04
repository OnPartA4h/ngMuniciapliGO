import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { providePrimeNG } from 'primeng/config';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { ApiInterceptor } from './interceptors/api-interceptor';
import { provideEnvironmentNgxMask } from 'ngx-mask';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

/** Read <base href> once – works for every deploy target. */
const BASE_HREF = document.querySelector('base')?.getAttribute('href') || '/';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, `${BASE_HREF}assets/i18n/`, '.json');
}

export function assetUrl(path: string): string {
  return `${BASE_HREF}${path}`;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([ApiInterceptor])
    ),
    providePrimeNG(),
    provideEnvironmentNgxMask(),
    provideCharts(withDefaultRegisterables()),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};