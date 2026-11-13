import type { LegalLink, LegalSection } from './page';

export const UPDATED = '13 novembre 2026';

const CONTACT: LegalLink = {
  label: 'bonjour@commedab.app',
  url: 'mailto:bonjour@commedab.app',
};

/** Politique de confidentialité : les données de specs techniques 8.1 et les sous-traitants de 8.4. */
export const PRIVACY: readonly LegalSection[] = [
  {
    title: 'En bref',
    body: [
      'Commedab garde ce qu’il faut pour faire ta liste, et rien d’autre.',
      [
        'Pas de publicité, pas de mesure d’audience, pas de cookies.',
        'Pas de localisation, pas de prix.',
        'Rien n’est vendu ni loué à qui que ce soit.',
      ],
    ],
  },
  {
    title: 'Qui est responsable',
    body: [
      'Commedab est édité par Alexandre Roussel, un particulier. C’est lui le responsable du traitement de tes données, et c’est à lui que tu écris pour toute question.',
    ],
    links: [CONTACT],
  },
  {
    title: 'Ce qui est gardé, et pourquoi',
    body: [
      [
        'Ton adresse e-mail et ton mot de passe, dont seule une empreinte est conservée, ou ton identifiant Google si tu te connectes avec Google : pour ouvrir ton compte et t’y reconnecter.',
        'Tes produits, tes achats, ta liste, tes recettes et l’ordre de tes rayons : c’est le service lui-même.',
        'Ton choix « Aider à améliorer le catalogue » et, s’il est activé, les noms de tes produits : voir plus bas.',
        'Des rapports d’erreur quand l’app plante ou qu’un envoi échoue : pour la réparer.',
      ],
      'Le compte et tes données reposent sur le contrat qui te lie au service (RGPD, article 6.1.b). Le catalogue et les rapports d’erreur reposent sur l’intérêt légitime d’améliorer et de réparer l’app (article 6.1.f).',
      'Comme pour tout site, les hébergeurs voient ton adresse IP le temps de te répondre et peuvent la garder dans leurs journaux techniques.',
    ],
  },
  {
    title: 'Le catalogue',
    body: [
      'Quand tu crées un produit que Commedab ne connaît pas, son nom peut servir à enrichir la liste des produits proposés à tout le monde.',
      [
        'Seul le nom compte : jamais tes achats, ni tes quantités, ni ton compte.',
        'Un nom n’est retenu que s’il apparaît dans au moins cinq comptes.',
        'C’est activé par défaut, et tu le coupes quand tu veux dans Réglages, « Aider à améliorer le catalogue ». Coupé, aucun de tes noms n’entre dans le prochain relevé.',
      ],
      'Un nom de produit peut en dire long, un médicament par exemple. Si ça te gêne, coupe l’interrupteur.',
    ],
  },
  {
    title: 'Les rapports d’erreur',
    body: [
      'Un rapport dit ce qui a cassé, dans quelle version de l’app et sur quel navigateur. L’app n’y joint ni ton adresse e-mail, ni ton adresse IP, ni le nom de tes produits, ni le contenu de ta liste.',
    ],
  },
  {
    title: 'Ce qui reste sur ton appareil',
    body: [
      'Pour marcher sans réseau, en magasin, Commedab garde sur ton appareil :',
      [
        'une copie de tes données ;',
        'ta connexion, pour ne pas te redemander ton mot de passe ;',
        'le thème choisi et le fait d’avoir déjà vu le conseil d’installation ;',
        'un journal des envois qui ont échoué, qui ne quitte pas l’appareil.',
      ],
      'Rien de tout ça ne sert à te suivre. Te déconnecter efface tes données de l’appareil ; elles reviennent à la connexion suivante.',
    ],
  },
  {
    title: 'Qui d’autre y touche',
    body: [
      'Commedab s’appuie sur des prestataires, qui n’agissent que pour faire tourner le service :',
      [
        'Supabase : comptes et base de données, hébergés en Irlande.',
        'PowerSync (JourneyApps) : garde tes appareils à jour entre eux, hébergé en Irlande.',
        'Cloudflare : hébergement du site et stockage des sauvegardes.',
        'Resend : envoi des e-mails du compte et de l’export.',
        'Sentry : rapports d’erreur, hébergés en Allemagne.',
        'GitHub : lance la sauvegarde hebdomadaire, sans la conserver.',
        'Google : seulement si tu choisis « Continuer avec Google ».',
      ],
      'Plusieurs de ces sociétés sont américaines. Quand des données sortent de l’Union européenne, c’est dans le cadre prévu par le RGPD : clauses contractuelles types de la Commission européenne ou cadre de protection des données entre l’Union et les États-Unis.',
    ],
  },
  {
    title: 'Combien de temps',
    body: [
      [
        'Tes données sont gardées tant que ton compte existe.',
        'Supprimer ton compte efface tout, tout de suite, sur le serveur et sur l’appareil.',
        'Une sauvegarde de la base est faite chaque semaine et effacée au bout de 90 jours : tes données peuvent y rester jusque-là, sans servir à rien d’autre qu’à réparer une panne.',
        'Les noms de produits déjà entrés dans le catalogue y restent : ils ne sont rattachés à personne et ne peuvent pas être retrouvés.',
      ],
    ],
  },
  {
    title: 'Tes droits',
    body: [
      [
        'Voir et emporter tes données : Réglages, « Exporter mes données ». Tu les reçois par e-mail, dans un fichier lisible sans l’app.',
        'Les corriger : directement dans l’app. Pour changer d’adresse e-mail, écris à l’adresse ci-dessous.',
        'Les effacer : Réglages, « Supprimer mon compte ».',
        'Refuser le catalogue : Réglages, « Aider à améliorer le catalogue ».',
      ],
      'Pour le reste, limiter un traitement ou poser une question, écris à l’adresse ci-dessous : réponse sous un mois. Si la réponse ne te convient pas, tu peux saisir la CNIL.',
    ],
    links: [CONTACT, { label: 'Saisir la CNIL', url: 'https://www.cnil.fr/fr/plaintes' }],
  },
  {
    title: 'Sécurité',
    body: [
      'Tout passe par une connexion chiffrée. Sur le serveur, les données sont chiffrées au repos et chaque compte n’accède qu’aux siennes.',
    ],
  },
  {
    title: 'Si cette page change',
    body: ['La date en haut de page change avec le texte.'],
  },
];

export const LEGAL: readonly LegalSection[] = [
  {
    title: 'Éditeur',
    body: [
      'Commedab est édité par Alexandre Roussel, un particulier, à titre non professionnel. Il en est aussi le directeur de la publication.',
    ],
    links: [CONTACT],
  },
  {
    title: 'Hébergeur',
    body: [
      'Le site commedab.app est hébergé par Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis, +1 888 993 5273.',
      'Les comptes et les données sont hébergés par Supabase, en Irlande. Le détail est dans la politique de confidentialité.',
    ],
    links: [{ label: 'cloudflare.com', url: 'https://www.cloudflare.com' }],
  },
  {
    title: 'Code et licence',
    body: [
      'Le code de Commedab est libre, publié sous licence AGPL-3.0 : tu peux le lire, le modifier et le redistribuer aux conditions de cette licence. Le nom Commedab et son logo ne sont pas couverts par la licence.',
    ],
    links: [{ label: 'Le code sur GitHub', url: 'https://github.com/alexandrersl/commedab' }],
  },
  {
    title: 'Ce que Commedab ne promet pas',
    body: [
      'Le service est gratuit et fourni tel quel, sans garantie. Ce que l’app te propose est une estimation tirée de tes achats : c’est toi qui sais ce qu’il reste dans tes placards.',
    ],
  },
  {
    title: 'Signaler un problème',
    body: [
      'Un contenu ou un comportement qui pose problème, une faille de sécurité : écris à l’adresse ci-dessous.',
    ],
    links: [CONTACT],
  },
];
