import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../components/ui';
import { DatePipe, NgClass } from '@angular/common';

interface DoubleProblem {
  id: number;
  titre: string;
  description: string;
  address: string;
  statut: number;
  categorie: number;
  dateCreation: Date;
  photoUrl: string | null;
  reportedBy: string;
}

interface DoubleGroup {
  id: number;
  original: DoubleProblem;
  duplicates: DoubleProblem[];
  expanded: boolean;
  similarityScore: number;
}

@Component({
  selector: 'app-manage-doubles',
  imports: [TranslateModule, PageHeaderComponent, DatePipe, NgClass],
  standalone: true,
  templateUrl: './manage-doubles.html',
  styleUrl: './manage-doubles.css',
})
export class ManageDoubles {
  activeTab: 'pending' | 'resolved' = 'pending';

  // Mock data for UI
  doubleGroups: DoubleGroup[] = [
    {
      id: 1,
      original: {
        id: 101,
        titre: 'Nid-de-poule dangereux',
        description: 'Un large nid-de-poule sur la rue Principale causant des dommages aux véhicules.',
        address: '123 Rue Principale',
        statut: 0,
        categorie: 0,
        dateCreation: new Date('2025-01-10'),
        photoUrl: null,
        reportedBy: 'Jean Dupont',
      },
      duplicates: [
        {
          id: 102,
          titre: 'Trou dans la chaussée',
          description: 'Grand trou sur la rue Principale, très dangereux pour les cyclistes.',
          address: '125 Rue Principale',
          statut: 0,
          categorie: 0,
          dateCreation: new Date('2025-01-12'),
          photoUrl: null,
          reportedBy: 'Marie Martin',
        },
        {
          id: 103,
          titre: 'Route endommagée',
          description: 'La chaussée est sérieusement endommagée devant le commerce.',
          address: '121 Rue Principale',
          statut: 0,
          categorie: 0,
          dateCreation: new Date('2025-01-13'),
          photoUrl: null,
          reportedBy: 'Pierre Tremblay',
        },
      ],
      expanded: true,
      similarityScore: 92,
    },
    {
      id: 2,
      original: {
        id: 201,
        titre: 'Lampadaire cassé',
        description: 'Le lampadaire au coin de la rue ne fonctionne plus depuis une semaine.',
        address: '45 Avenue des Érables',
        statut: 0,
        categorie: 1,
        dateCreation: new Date('2025-01-08'),
        photoUrl: null,
        reportedBy: 'Sophie Lavoie',
      },
      duplicates: [
        {
          id: 202,
          titre: 'Éclairage public défaillant',
          description: 'Plus de lumière sur l\'avenue des Érables, dangereux la nuit.',
          address: '47 Avenue des Érables',
          statut: 0,
          categorie: 1,
          dateCreation: new Date('2025-01-09'),
          photoUrl: null,
          reportedBy: 'Luc Bernard',
        },
      ],
      expanded: false,
      similarityScore: 87,
    },
    {
      id: 3,
      original: {
        id: 301,
        titre: 'Graffiti sur le mur du parc',
        description: 'Tags et graffitis sur le mur ouest du parc municipal.',
        address: 'Parc Central, Rue du Parc',
        statut: 0,
        categorie: 2,
        dateCreation: new Date('2025-01-15'),
        photoUrl: null,
        reportedBy: 'Anne Gagnon',
      },
      duplicates: [
        {
          id: 302,
          titre: 'Vandalisme au parc',
          description: 'Mur du parc couvert de graffitis, nuit à l\'esthétique du quartier.',
          address: 'Parc Central',
          statut: 0,
          categorie: 2,
          dateCreation: new Date('2025-01-16'),
          photoUrl: null,
          reportedBy: 'François Roy',
        },
      ],
      expanded: false,
      similarityScore: 78,
    },
  ];

  resolvedGroups: DoubleGroup[] = [
    {
      id: 4,
      original: {
        id: 401,
        titre: 'Fuite d\'eau',
        description: 'Fuite d\'eau importante près de la bouche d\'incendie.',
        address: '78 Rue des Lilas',
        statut: 1,
        categorie: 3,
        dateCreation: new Date('2025-01-05'),
        photoUrl: null,
        reportedBy: 'Claire Dubois',
      },
      duplicates: [
        {
          id: 402,
          titre: 'Dégât d\'eau sur la rue',
          description: 'L\'eau coule abondamment sur la rue des Lilas.',
          address: '80 Rue des Lilas',
          statut: 1,
          categorie: 3,
          dateCreation: new Date('2025-01-06'),
          photoUrl: null,
          reportedBy: 'Marc Leblanc',
        },
      ],
      expanded: false,
      similarityScore: 95,
    },
  ];

  get currentGroups(): DoubleGroup[] {
    return this.activeTab === 'pending' ? this.doubleGroups : this.resolvedGroups;
  }

  get pendingCount(): number {
    return this.doubleGroups.length;
  }

  get resolvedCount(): number {
    return this.resolvedGroups.length;
  }

  toggleExpand(group: DoubleGroup): void {
    group.expanded = !group.expanded;
  }

  setTab(tab: 'pending' | 'resolved'): void {
    this.activeTab = tab;
  }

  getSimilarityClass(score: number): string {
    if (score >= 90) return 'similarity-high';
    if (score >= 75) return 'similarity-medium';
    return 'similarity-low';
  }

  getCategoryIcon(categorie: number): string {
    const icons: Record<number, string> = {
      0: 'fa-road',
      1: 'fa-lightbulb',
      2: 'fa-spray-can',
      3: 'fa-water',
    };
    return icons[categorie] ?? 'fa-circle-exclamation';
  }

  getCategoryLabel(categorie: number): string {
    const labels: Record<number, string> = {
      0: 'Voirie',
      1: 'Éclairage',
      2: 'Vandalisme',
      3: 'Eau',
    };
    return labels[categorie] ?? 'Autre';
  }
}
