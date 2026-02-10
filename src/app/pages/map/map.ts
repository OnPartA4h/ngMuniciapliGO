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
  DEFAULT_LAT: number = 45.5312
  DEFAULT_LNG: number = -73.5181
  DEFAULT_RADIUS: number = 1000
  FALLBACK_COORDS: L.LatLngExpression = [this.DEFAULT_LAT, this.DEFAULT_LNG];

  map: L.Map | undefined;
  currentPosMarker: L.Marker | undefined
  circleRadius: L.Circle | undefined
  markerClusterGroup: L.MarkerClusterGroup | undefined;

  radius: number = -1
  currentLat: number | null = null
  currenctLng: number | null = null

  problems: Problem[] = []
  
  selectedProblem: Problem | null = null;
  isSidebarOpen: boolean = false;

  isConfigModalOpen: boolean = false

  redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

  constructor(public whiteService: WhiteService, private cdr: ChangeDetectorRef) {}

  async ngAfterViewInit() {
    this.getRadius()
    this.initMap()
    await this.getProblems()
    this.placeMarkers()
    this.CurrentPosMarkerEvent()
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

    let latlngData = localStorage.getItem("latlng")
    let point: L.LatLng | null = !latlngData ? null : JSON.parse(latlngData)

    if (!point){
      point = L.latLng(this.FALLBACK_COORDS)
    } 

    this.map!.setView(point, 13);
    this.createCurrentPosMarker(point)
  }

  ngOnDestroy() {
   if (!this.map) return
    this.map.off(); 
    this.map.remove(); 
  }

  async getProblems() {
    if (!this.currenctLng || !this.currentLat){
      this.problems = await this.whiteService.getMapProblems(this.radius, this.DEFAULT_LAT, this.DEFAULT_LNG)
      return
    } 

    this.problems = await this.whiteService.getMapProblems(this.radius, this.currentLat, this.currenctLng)
  }

  getRadius() {
    let radiusData = localStorage.getItem("radius")
    this.radius = !radiusData ? this.DEFAULT_RADIUS : parseInt(radiusData)
  }

  placeMarkers() {
    if (!this.map) return

    this.markerClusterGroup = L.markerClusterGroup({
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

      this.markerClusterGroup.addLayer(marker)
    }

    this.map?.addLayer(this.markerClusterGroup);
  }

  removeMarkers() {
    this.map!.removeLayer(this.markerClusterGroup!)
    this.problems = []
    this.markerClusterGroup = undefined
  }

  closeSidebar() {
    this.isSidebarOpen = false;
    this.selectedProblem = null;
    this.cdr.detectChanges(); 
  }

  CurrentPosMarkerEvent() {
    if (!this.map) return

    this.map.on('click', (event) => {
      this.removeCurrentPosMarker()
      this.removeCircleRadius()
      this.createCurrentPosMarker(event.latlng)
      this.reloadProblems()
      localStorage.setItem("latlng", JSON.stringify(event.latlng))
    })
  }

  addCircleRadius(latlng: L.LatLng) {
     this.circleRadius = L.circle(latlng, {
        radius: this.radius,
        color: 'blue',
        fillColor: 'blue',
        fillOpacity: 0.2
      }).addTo(this.map!)
  }

  removeCircleRadius(){
    if (!this.circleRadius) return
    this.circleRadius.remove()
  }

  removeCurrentPosMarker() {
    if (!this.currentPosMarker) return
    this.currentPosMarker.remove()
  }

  createCurrentPosMarker(latlng: L.LatLngExpression) {
    let point = L.latLng(latlng)
    this.currentPosMarker = L.marker(latlng, {icon: this.redIcon}).addTo(this.map!)

      this.currentPosMarker.on('click', () => {
        this.removeCurrentPosMarker()
        this.removeCircleRadius()
        this.removeMarkers()
      })

      this.currentLat = point.lat
      this.currenctLng = point.lng

      this.addCircleRadius(point)
  }

  openModal() {
    this.isConfigModalOpen = true;
  }

  closeModal() {
    this.isConfigModalOpen = false;
  }

  async reloadProblems() {
    this.getRadius();

    this.circleRadius?.setRadius(this.radius)
    
    if (this.markerClusterGroup && this.map) {
      this.map.removeLayer(this.markerClusterGroup);
      this.markerClusterGroup = undefined;
    }
    
    await this.getProblems();  
    this.placeMarkers();
  }
}
