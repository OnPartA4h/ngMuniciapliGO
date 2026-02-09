import * as L from 'leaflet';
import 'leaflet.markercluster';
import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { WhiteService } from '../../services/white-service';
import { Problem } from '../../models/problem';
import { MapSidebar } from '../../components/map-sidebar/map-sidebar';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapConfigModal } from '../../components/map-config-modal/map-config-modal';

@Component({
  selector: 'app-map',
  imports: [MapSidebar, CommonModule, FormsModule, MapConfigModal],
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit{
  FALLBACK_COORDS: L.LatLngExpression = [45.5312, -73.5181];

  map: L.Map | undefined;
  currentPosMarker: L.Marker | undefined

  problems: Problem[] = []
  
  selectedProblem: Problem | null = null;
  isSidebarOpen: boolean = false;

  isConfigModalOpen: boolean = false

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

      let greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })

      L.marker(this.FALLBACK_COORDS, {icon: greenIcon})
        .addTo(this.map!)
        .bindPopup('Longueuil, QC')
        .openPopup();
    });

    this.map.on('click', (event) => {
      let redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

      this.removeCurrentPosMarker()
      this.currentPosMarker = L.marker(event.latlng, {icon: redIcon}).addTo(this.map!)
    })
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
    if (!this.map) return

    let markercluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50
    });

    for (let p of this.problems){
      let marker = L.marker([p.latitude, p.longitude])

      marker.on('click', () => {
        this.selectedProblem = p;
        this.isSidebarOpen = true;
        this.cdr.detectChanges(); 
      })

      markercluster.addLayer(marker)
    }

    this.map?.addLayer(markercluster);
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    this.selectedProblem = null;
    this.cdr.detectChanges(); 
  }

  removeCurrentPosMarker() {
    if (!this.currentPosMarker) return

    this.currentPosMarker.remove()
  }

  openModal() {
    this.isConfigModalOpen = true;
  }

  closeModal() {
    this.isConfigModalOpen = false;
  }
}
