import * as L from 'leaflet';
import { AfterViewInit, Component } from '@angular/core';

@Component({
  selector: 'app-map',
  imports: [],
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit{
  FALLBACK_COORDS: L.LatLngExpression = [45.5312, -73.5181];

  map: L.Map | undefined;

  ngAfterViewInit(): void {
    this.initMap()
  }

  initMap() {
    this.map = L.map('map')

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.locate({
      setView: true,
      maxZoom: 15,
      enableHighAccuracy: true,
      timeout: 5000
    })

    this.map.on('locationfound', (e: L.LocationEvent) => {
      this.map!.setView(e.latlng, 15);

      L.marker(e.latlng)
        .addTo(this.map!)
        .bindPopup('You are here')
        .openPopup();
    });

    this.map.on('locationerror', () => {
      this.map!.setView(this.FALLBACK_COORDS, 13);

      L.marker(this.FALLBACK_COORDS)
        .addTo(this.map!)
        .bindPopup('Longueuil, QC')
        .openPopup();
    });
  }

  ngOnDestroy() {
   if (!this.map) return
    this.map.off(); 
    this.map.remove(); 
  }

}
