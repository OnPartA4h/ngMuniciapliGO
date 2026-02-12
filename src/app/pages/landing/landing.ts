import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, NgClass],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {
  // Statistiques dynamiques
  stats = {
    problemsResolved: 247,
    activeCitizens: 12500,
    avgResolutionTime: 3.5,
    satisfactionRate: 94
  };

  // Histoires de succès (Avant/Après)
  successStories = [
    {
      title: 'Réparation de nid-de-poule',
      description: 'Rue Principale réparée en un temps record grâce aux signalements citoyens.',
      beforeImage: 'https://placehold.co/300x150/ffebee/c62828?text=Avant',
      afterImage: 'https://placehold.co/300x150/e8f5e9/2e7d32?text=Après',
      resolutionDays: 3
    },
    {
      title: 'Éclairage public restauré',
      description: 'Avenue des Lilas à nouveau éclairée pour la sécurité des résidents.',
      beforeImage: 'https://placehold.co/300x150/ffebee/c62828?text=Avant',
      afterImage: 'https://placehold.co/300x150/e8f5e9/2e7d32?text=Après',
      resolutionDays: 5
    },
    {
      title: 'Parc nettoyé',
      description: 'Le parc municipal débarrassé des déchets abandonnés.',
      beforeImage: 'https://placehold.co/300x150/ffebee/c62828?text=Avant',
      afterImage: 'https://placehold.co/300x150/e8f5e9/2e7d32?text=Après',
      resolutionDays: 2
    }
  ];

  // Témoignages citoyens
  testimonials = [
    {
      name: 'Marie Tremblay',
      neighborhood: 'Quartier Centre',
      content: 'Grâce à MunicipalGO, le nid-de-poule devant chez moi a été réparé en 3 jours. Je n\'aurais jamais pensé que ce serait aussi rapide!',
      avatar: 'https://placehold.co/100x100/e8f4f8/1565c0?text=MT'
    },
    {
      name: 'Jean-Pierre Dubois',
      neighborhood: 'Plateau',
      content: 'L\'application est très intuitive. J\'ai signalé un lampadaire défectueux et j\'ai reçu des notifications à chaque étape de la résolution.',
      avatar: 'https://placehold.co/100x100/e8f5e9/2e7d32?text=JD'
    },
    {
      name: 'Sophie Lavoie',
      neighborhood: 'Vieux-Port',
      content: 'Enfin une façon simple de communiquer avec la ville. Je me sens vraiment écoutée et impliquée dans l\'amélioration de mon quartier.',
      avatar: 'https://placehold.co/100x100/fff3e0/e65100?text=SL'
    }
  ];

  // Problèmes récents sur la carte
  recentProblems = [
    {
      title: 'Graffiti sur mur public',
      location: 'Place de la Mairie',
      imageUrl: 'https://placehold.co/300x120/e8f4f8/1565c0?text=Photo',
      status: 'nouveau',
      statusLabel: 'Nouveau'
    },
    {
      title: 'Trottoir endommagé',
      location: 'Rue Saint-Denis',
      imageUrl: 'https://placehold.co/300x120/fff3e0/e65100?text=Photo',
      status: 'en-cours',
      statusLabel: 'En cours'
    },
    {
      title: 'Banc de parc cassé',
      location: 'Parc Lafontaine',
      imageUrl: 'https://placehold.co/300x120/e8f5e9/2e7d32?text=Photo',
      status: 'resolu',
      statusLabel: 'Résolu'
    },
    {
      title: 'Fuite d\'eau',
      location: 'Boulevard René-Lévesque',
      imageUrl: 'https://placehold.co/300x120/e8f4f8/1565c0?text=Photo',
      status: 'nouveau',
      statusLabel: 'Nouveau'
    }
  ];
}
