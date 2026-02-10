import * as L from 'leaflet';

/**
 * Mapping des valeurs d'enum (nombre) vers les noms de catégories
 */
export const categoryEnumMap: { [key: number]: string } = {
  0: 'PropreteEtDechet',
  1: 'MobilierUrbain',
  2: 'SignalisationEtEclairage',
  3: 'EspacesVertsEtNature',
  4: 'VoirieEtInfrastructures',
  5: 'Saisonnier',
  6: 'Social',
  7: 'Autre'
};

/**
 * Dictionnaire des icônes SVG personnalisées par catégorie
 */
export const categoryIcons: { [key: string]: L.Icon | L.DivIcon } = {
    // Propreté et déchets - Poubelle verte
    'PropreteEtDechet': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow1" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#2e7d32" stroke="#fff" stroke-width="3" filter="url(#shadow1)"/>
        <g transform="translate(22.5, 22.5)">
          <rect x="-6" y="-8" width="12" height="14" rx="1" fill="none" stroke="#fff" stroke-width="2"/>
          <line x1="-8" y1="-10" x2="8" y2="-10" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="-3" y1="-6" x2="-3" y2="3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="-6" x2="0" y2="3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="3" y1="-6" x2="3" y2="3" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Mobilier urbain - Banc gris
    'MobilierUrbain': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#757575" stroke="#fff" stroke-width="3" filter="url(#shadow2)"/>
        <g transform="translate(22.5, 22.5)">
          <line x1="-8" y1="-3" x2="8" y2="-3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          <rect x="-8" y="-5" width="16" height="2" rx="1" fill="#fff"/>
          <line x1="-6" y1="-3" x2="-6" y2="5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="6" y1="-3" x2="6" y2="5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Signalisation et éclairage - Lampadaire jaune
    'SignalisationEtEclairage': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow3" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#f9a825" stroke="#fff" stroke-width="3" filter="url(#shadow3)"/>
        <g transform="translate(22.5, 22.5)">
          <circle cx="0" cy="-2" r="4" fill="none" stroke="#fff" stroke-width="2"/>
          <line x1="-6" y1="-4" x2="-8" y2="-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="6" y1="-4" x2="8" y2="-6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="-8" x2="0" y2="-10" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
          <line x1="0" y1="2" x2="0" y2="8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="0" cy="-2" r="1.5" fill="#fff"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Espaces verts et nature - Arbre vert
    'EspacesVertsEtNature': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow4" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#43a047" stroke="#fff" stroke-width="3" filter="url(#shadow4)"/>
        <g transform="translate(22.5, 22.5)">
          <rect x="-1.5" y="2" width="3" height="6" rx="0.5" fill="#fff"/>
          <circle cx="0" cy="-2" r="5" fill="none" stroke="#fff" stroke-width="2"/>
          <circle cx="0" cy="-5" r="3.5" fill="none" stroke="#fff" stroke-width="2"/>
          <circle cx="-3" cy="-1" r="3" fill="none" stroke="#fff" stroke-width="2"/>
          <circle cx="3" cy="-1" r="3" fill="none" stroke="#fff" stroke-width="2"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Voirie et infrastructures - Nid de poule orange
    'VoirieEtInfrastructures': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow5" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#e65100" stroke="#fff" stroke-width="3" filter="url(#shadow5)"/>
        <g transform="translate(22.5, 22.5)">
          <path d="M-8,-8 L8,8 M-8,8 L8,-8" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="6" fill="none" stroke="#fff" stroke-width="2"/>
          <path d="M-3,-3 L3,3 M-3,3 L3,-3" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Saisonnier - Flocon de neige violet
    'Saisonnier': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow6" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#8e24aa" stroke="#fff" stroke-width="3" filter="url(#shadow6)"/>
        <g transform="translate(22.5, 22.5)">
          <line x1="0" y1="-8" x2="0" y2="8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <line x1="5.5" y1="-5.5" x2="-5.5" y2="5.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <circle cx="0" cy="-8" r="1.5" fill="#fff"/>
          <circle cx="0" cy="8" r="1.5" fill="#fff"/>
          <circle cx="-8" cy="0" r="1.5" fill="#fff"/>
          <circle cx="8" cy="0" r="1.5" fill="#fff"/>
          <circle cx="-5.5" cy="-5.5" r="1.5" fill="#fff"/>
          <circle cx="5.5" cy="5.5" r="1.5" fill="#fff"/>
          <circle cx="5.5" cy="-5.5" r="1.5" fill="#fff"/>
          <circle cx="-5.5" cy="5.5" r="1.5" fill="#fff"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Social - Groupe de personnes bleu
    'Social': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow7" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#1565c0" stroke="#fff" stroke-width="3" filter="url(#shadow7)"/>
        <g transform="translate(22.5, 22.5)">
          <circle cx="-3" cy="-4" r="2.5" fill="#fff"/>
          <circle cx="3" cy="-4" r="2.5" fill="#fff"/>
          <path d="M-6,2 Q-3,0 0,0 Q3,0 6,2" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
          <circle cx="0" cy="-6" r="2" fill="#fff"/>
          <path d="M-8,5 Q-4,3 0,3 Q4,3 8,5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </g>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    }),
    
    // Autre - Point d'interrogation noir
    'Autre': L.divIcon({
      html: `<svg width="45" height="45" viewBox="0 0 45 45" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow8" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx="22.5" cy="22.5" r="20" fill="#424242" stroke="#fff" stroke-width="3" filter="url(#shadow8)"/>
        <text x="22.5" y="30" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#fff" text-anchor="middle">?</text>
      </svg>`,
      className: 'custom-marker-icon',
      iconSize: [45, 45],
      iconAnchor: [22.5, 45],
      popupAnchor: [0, -45]
    })
  };