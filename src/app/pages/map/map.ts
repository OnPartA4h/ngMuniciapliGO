import * as L from 'leaflet';
import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { WhiteService } from '../../services/white-service';
import { Problem } from '../../models/problem';
import { MapSidebar } from '../../components/map-sidebar/map-sidebar';

@Component({
  selector: 'app-map',
  imports: [MapSidebar],
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit{
  FALLBACK_COORDS: L.LatLngExpression = [45.5312, -73.5181];

  map: L.Map | undefined;

  problems: Problem[] = []
  
  selectedProblem: Problem | null = null;
  isSidebarOpen: boolean = false;

  constructor(public whiteService: WhiteService, private cdr: ChangeDetectorRef) {}

  async ngAfterViewInit() {
    await this.getProblems()
    console.log(this.problems);
    
    this.initMap()
    this.placeMarkers()
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

  async getProblems() {
    this.problems = (await this.whiteService.getAllProblems()).items
  }

  placeMarkers() {
    for (let p of this.problems){
      let marker = L.marker([p.latitude, p.longitude]).addTo(this.map!)

      marker.on('click', () => {
        this.selectedProblem = p;
        this.isSidebarOpen = true;
        this.cdr.detectChanges(); 
      })
    }
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    this.selectedProblem = null;
    this.cdr.detectChanges(); 
  }
}
