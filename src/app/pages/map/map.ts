import * as L from 'leaflet';
import 'leaflet.markercluster';
import { AfterViewInit, Component, inject, signal, OnDestroy } from '@angular/core';
import { WhiteService } from '../../services/white-service';
import { Problem } from '../../models/problem';
import { MapSidebar } from '../../components/map-sidebar/map-sidebar';
import { FormsModule } from '@angular/forms';
import { MapConfigModal } from '../../components/modals/map-config-modal/map-config-modal';
import { categoryIcons, categoryEnumMap } from '../../models/categoryIcons';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { GeneralService } from '../../services/general-service';
import { District } from '../../models/district';

@Component({
  selector: 'app-map',
  imports: [MapSidebar, FormsModule, MapConfigModal, MatSnackBarModule, TranslateModule],
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class Map implements AfterViewInit, OnDestroy {
  whiteService = inject(WhiteService);
  generalService = inject(GeneralService)
  private snackbar = inject(MatSnackBar);
  private translate = inject(TranslateService);

  DEFAULT_LAT: number = 45.5312
  DEFAULT_LNG: number = -73.5181
  DEFAULT_RADIUS: number = 1000
  FALLBACK_COORDS: L.LatLngExpression = [this.DEFAULT_LAT, this.DEFAULT_LNG];

  DISTRICT_COLORS = [
    '#3B82F6', // Blue 
    '#10B981', // Green 
    '#F59E0B', // Orange 
    '#EF4444'  // Red 
  ];

  map: L.Map | undefined;
  currentPosMarker: L.Marker | undefined
  circleRadius: L.Circle | undefined
  previewCircle: L.Circle | undefined
  markerClusterGroup: L.MarkerClusterGroup | undefined;
  polygonGroup: L.LayerGroup | undefined

  radius = signal(-1);
  currentLat = signal<number | null>(null);
  currentLng = signal<number | null>(null);
  problems = signal<Problem[]>([]);
  districts = signal<District[]>([])
  selectedProblem = signal<Problem | null>(null);
  isSidebarOpen = signal(false);
  isConfigModalOpen = signal(false);
  showDistricts = signal(false)

  redIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  defaultIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  async ngAfterViewInit() {
    this.getRadius()
    this.initMap()

    await this.getProblems()

    this.placeMarkers()
    this.currentPosMarkerEvent()
  }

  initMap() {
    this.map = L.map('map', {
      zoomControl: false
    })
    
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

    this.map!.setView(point, 14);
    this.createCurrentPosMarker(point)
  }

  ngOnDestroy() {
   if (!this.map) return
    this.map.off(); 
    this.map.remove(); 
  }

  async getProblems() {
    try {
      const currentLng = this.currentLng();
      const currentLat = this.currentLat();
      const radius = this.radius();
      
      let fetchedProblems: Problem[];
      if (!currentLng || !currentLat){
        fetchedProblems = await this.whiteService.getMapProblems(radius, this.DEFAULT_LAT, this.DEFAULT_LNG)
      } else {
        fetchedProblems = await this.whiteService.getMapProblems(radius, currentLat, currentLng)
      }
      
      this.problems.set(fetchedProblems);
      
      if (fetchedProblems.length <= 0){
        const message = this.translate.instant('MAP.NO_PROBLEMS_FOUND');
        this.snackbar.open(message, this.translate.instant('COMMON.CLOSE'), {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
          panelClass: ['info-snackbar']
        });
      }
    } catch (error) {
      const message = this.translate.instant('MAP.ERROR_LOADING_PROBLEMS');
      this.snackbar.open(message, this.translate.instant('COMMON.CLOSE'), {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['error-snackbar']
      });
      this.problems.set([]);
    }
  }

  async getDistricts() {
    let districts = await this.generalService.getDistricts()
    this.districts.set(districts)
  }

  getRadius() {
    let radiusData = localStorage.getItem("radius")
    this.radius.set(!radiusData ? this.DEFAULT_RADIUS : parseInt(radiusData))
  }

  getCategoryIcon(categoryEnum: number): L.Icon | L.DivIcon {
    const categoryName = categoryEnumMap[categoryEnum];
    return categoryIcons[categoryName] || this.defaultIcon;
  }

  placeMarkers() {
    if (!this.map) return

    this.markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50
    });

    const problemsList = this.problems();
    for (let p of problemsList){
      const icon = this.getCategoryIcon(p.categorie);
      let marker = L.marker([p.latitude, p.longitude], { icon: icon })

      marker.on('click', () => {
        this.selectedProblem.set(p);
        this.isSidebarOpen.set(true);
      })

      this.markerClusterGroup.addLayer(marker)
    }

    this.map?.addLayer(this.markerClusterGroup);
  }

  removeMarkers() {
    this.map!.removeLayer(this.markerClusterGroup!)
    this.problems.set([]);
    this.markerClusterGroup = undefined
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
    this.selectedProblem.set(null);
  }

  currentPosMarkerEvent() {
    if (!this.map) return

    this.map.on('click', (event) => {
      this.removeCurrentPosMarker()
      this.removeCircleRadius()
      this.createCurrentPosMarker(event.latlng)
      this.reloadProblems()
      localStorage.setItem("latlng", JSON.stringify(event.latlng))
    })
  }

  currentPosMarkerDistrictEvent(polygon: L.Polygon) {
    polygon.on('click', (event) => {
      this.removeCurrentPosMarker()
      this.removeCircleRadius()
      this.createCurrentPosMarker(event.latlng)
      this.reloadProblems()
      localStorage.setItem("latlng", JSON.stringify(event.latlng))
    })
  }

  addCircleRadius(latlng: L.LatLng) {
    this.removeCircleRadius()
    const radiusValue = this.radius();

    this.circleRadius = L.circle(latlng, {
      radius: radiusValue,
      color: 'blue',
      fillColor: 'blue',
      fillOpacity: 0.2,
      interactive: false
    }).addTo(this.map!)
  }

  addPreviewCircle(latlng: L.LatLng, radius: number) {
    this.previewCircle?.remove()

    this.previewCircle = L.circle(latlng, {
    radius,
    color: 'green',
    dashArray: '6, 6',
    fillOpacity: 0.1
  }).addTo(this.map!);
  }

  removeCircleRadius(){
    if (!this.circleRadius) return
    this.circleRadius.remove()
  }

  removeCurrentPosMarker() {
    if (!this.currentPosMarker) return
    this.currentPosMarker.remove()
    this.currentPosMarker = undefined
  }

  createCurrentPosMarker(latlng: L.LatLngExpression) {
    let point = L.latLng(latlng)
    this.currentPosMarker = L.marker(latlng, {icon: this.redIcon}).addTo(this.map!)

    this.currentPosMarker.on('click', () => {
      this.removeCurrentPosMarker()
      this.removeCircleRadius()
      this.removeMarkers()
    })

    this.currentLat.set(point.lat);
    this.currentLng.set(point.lng);
    this.addCircleRadius(point)
  }

  openModal() {
    this.isConfigModalOpen.set(true);
  }

  closeModal() {
    this.removePreviewCirlce()
    this.isConfigModalOpen.set(false);
  }

  async reloadProblems() {
    this.getRadius();

    this.removePreviewCirlce()

    const radiusValue = this.radius();
    this.circleRadius?.setRadius(radiusValue)
    
    if (this.markerClusterGroup && this.map) {
      this.map.removeLayer(this.markerClusterGroup);
      this.markerClusterGroup = undefined;
    }
    
    await this.getProblems();  
    this.placeMarkers();
  }

  resetView() {
    const currentLat = this.currentLat();
    const currentLng = this.currentLng();
    if (!this.map || !currentLat || !currentLng) return

    if (!this.currentPosMarker) {
      this.map.setView(this.FALLBACK_COORDS, 14)
      this.createCurrentPosMarker(this.FALLBACK_COORDS)
      this.reloadProblems()
      return
    }

    this.map.setView([currentLat, currentLng])
  }

  previewRadius(radius: number) {
    const currentLat = this.currentLat();
    const currentLng = this.currentLng();
    if (!currentLat || !currentLng) return;

    const point = L.latLng(currentLat, currentLng);
    this.addPreviewCircle(point, radius);
  }

  removePreviewCirlce() {
    this.previewCircle?.remove();
    this.previewCircle = undefined;
  }

  createDistrictPolygon(district: District): L.Polygon {
    const latlngs = district.coordinates.map(ring =>
      ring.map(coord => [coord[1], coord[0]] as [number, number])
    );

    const color = this.DISTRICT_COLORS[district.colorIndex % this.DISTRICT_COLORS.length];

    const polygon = L.polygon(latlngs, {
      color: color,
      fillColor: color,
      fillOpacity: 0.3,
      weight: 2,
      interactive: true,
      bubblingMouseEvents: true
    });

    const popupContent = `
      <div style="font-family: var(--font-family-base);">
        <strong style="font-size: 16px; color: ${color};">${district.name}</strong><br>
        <span style="color: var(--color-text-secondary);">District ${district.number}</span><br>
        <span style="color: var(--color-text-secondary);">${district.arrondissement}</span>
      </div>
    `;

    polygon.bindPopup(popupContent, {
      autoClose: true,
      closeOnClick: true,
      className: 'district-popup'
    });

    polygon.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent.button === 1) { 
        e.originalEvent.preventDefault();
        polygon.openPopup(e.latlng);
      }
    });

    polygon.on('click', (e: L.LeafletMouseEvent) => {
      polygon.closePopup();
    });

    polygon.on('mouseover', () => {
      polygon.setStyle({
        fillOpacity: 0.5,
        weight: 3
      });
    });

    polygon.on('mouseout', () => {
      polygon.setStyle({
        fillOpacity: 0.3,
        weight: 2
      });
    });

    return polygon;
  }

  renderDistricts() {
    this.polygonGroup?.clearLayers()
    this.polygonGroup = L.layerGroup().addTo(this.map!)

    this.districts().forEach(district => {
      const polygon = this.createDistrictPolygon(district);
      polygon.addTo(this.polygonGroup!);

       this.currentPosMarkerDistrictEvent(polygon)
    });
  }

  async toggleDistricts() {
    this.showDistricts.set(!this.showDistricts())

    if(this.showDistricts()){
      await this.getDistricts()
    } else {
      this.districts.set([])
    }

    this.renderDistricts()
  }
}



  

