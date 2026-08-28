/**
 * Conditions générales d'utilisation et de vente.
 *
 * Le texte vit ici plutôt que dans messages/*.json : un document juridique se
 * relit en continu, section par section, et l'éclater en deux cents clés
 * plates le rendrait illisible pour la seule personne qui doit le vérifier —
 * un juriste, qui ne lira pas du JSON.
 *
 * Les chiffres ne sont pas recopiés à la main : ils viennent de lib/packs.ts et
 * lib/signupOffer.ts. Un tarif modifié d'un côté et oublié de l'autre ferait
 * mentir le contrat, ce qui est plus grave qu'un affichage erroné.
 *
 * Sur la section 6, et pourquoi elle ne promet pas la propriété pleine.
 *
 * Vérification faite auprès de Suno : la propriété du morceau n'est cédée
 * qu'aux abonnés payants, et elle vest au titulaire du compte. Or les
 * générations passent par un intermédiaire, dont le compte est sollicité à la
 * place de celui du client. Suno ne publie par ailleurs aucune API officielle,
 * ce qui rend le premier maillon de la chaîne incertain.
 *
 * On ne cède pas plus de droits qu'on n'en détient. Promettre à un client
 * payant une propriété que le prestataire ne peut pas garantir l'exposerait
 * bien davantage qu'une clause prudente : la section cède donc les droits
 * réellement détenus, sans en garantir l'étendue, et invite le client à
 * vérifier avant toute exploitation commerciale. L'usage privé, lui, n'est
 * soumis à aucune restriction.
 */

import { PACKS } from "./packs";
import { SIGNUP_CREDITS } from "./signupOffer";

/**
 * Faux tant que les mentions ci-dessous ne sont pas renseignées : la page
 * affiche alors un bandeau disant qu'elle n'est pas opposable. Renseignées, le
 * bandeau disparaît de lui-même.
 */
export const IDENTITE_COMPLETE = true;

export const IDENTITE = {
  raisonSociale: "BAKU SERVICES",
  forme: "société à responsabilité limitée (SARL)",
  immatriculation: "CM-DLA-02-2024-B13-00042",
  /** Numéro identifiant unique, exigé sur les documents commerciaux au Cameroun. */
  niu: "M012416381572P",
  adresse: "Bonamoussadi Sable, Douala",
  email: "direction@bakucm.com",
  /**
   * Nom nu, sans article : chaque langue pose le sien. Si la juridiction
   * devenait féminine — une cour d'appel — l'article français serait à revoir.
   */
  juridiction: "Tribunal de première instance de Douala",
  pays: "Cameroun",
};

export const DERNIERE_MAJ = "2026-08-28";

export type Section = { titre: string; paragraphes: string[] };

const prix = (locale: "fr" | "en") =>
  PACKS.map((p) =>
    locale === "fr"
      ? `${p.credits} crédits pour ${p.priceXaf.toLocaleString("fr-FR")} F CFA`
      : `${p.credits} credits for ${p.priceXaf.toLocaleString("en-US")} XAF`
  ).join(locale === "fr" ? " ; " : "; ");

export function sections(locale: "fr" | "en"): Section[] {
  if (locale === "en") return sectionsEn();
  return sectionsFr();
}

function sectionsFr(): Section[] {
  return [
    {
      titre: "1. Identification du prestataire",
      paragraphes: [
        `Le service BAKUMELO est édité par ${IDENTITE.raisonSociale}, ${IDENTITE.forme}, immatriculée au registre du commerce sous le numéro ${IDENTITE.immatriculation}, numéro identifiant unique ${IDENTITE.niu}, dont le siège est situé ${IDENTITE.adresse}, ${IDENTITE.pays}.`,
        `Contact : ${IDENTITE.email}. Les réclamations peuvent également être déposées depuis la page Assistance du site.`,
      ],
    },
    {
      titre: "2. Objet",
      paragraphes: [
        "Les présentes conditions régissent l'accès au service BAKUMELO et l'achat de crédits de génération. Créer un compte vaut acceptation de ces conditions.",
        "BAKUMELO permet de produire des morceaux de musique à partir d'une description écrite, au moyen de systèmes d'intelligence artificielle. Le service ne garantit ni l'originalité absolue, ni l'adéquation d'un morceau à un usage particulier.",
      ],
    },
    {
      titre: "3. Compte et inscription",
      paragraphes: [
        `L'inscription est gratuite et donne droit à ${SIGNUP_CREDITS} crédits offerts, utilisables immédiatement.`,
        "Le client est responsable de la confidentialité de ses identifiants et des générations effectuées depuis son compte. Toute utilisation constatée depuis un compte est réputée émaner de son titulaire.",
        "Les courriels d'authentification sont actuellement expédiés par notre prestataire technique et peuvent s'afficher à son nom plutôt qu'à celui de BAKUMELO.",
      ],
    },
    {
      titre: "4. Crédits et fonctionnement",
      paragraphes: [
        "Une génération consomme un crédit, décompté au lancement et non à la livraison du morceau.",
        "Lorsqu'une génération échoue du fait du service, le crédit est restitué. Un crédit consommé par une génération aboutie n'est pas restitué, y compris si le résultat ne convient pas au client : le coût de production est engagé dès le lancement.",
        "Les crédits n'ont pas de durée de validité et ne sont ni cessibles, ni convertibles en espèces.",
      ],
    },
    {
      titre: "5. Prix et paiement",
      paragraphes: [
        `Les offres sont les suivantes : ${prix("fr")}.`,
        "Les montants sont encaissés en francs CFA (XAF). Les prix affichés dans d'autres devises sont indicatifs et n'engagent pas le prestataire.",
        "Le paiement est traité par un prestataire tiers. BAKUMELO n'a accès à aucune donnée bancaire : ni numéro de carte, ni identifiant de portefeuille mobile.",
        "Les crédits sont portés au compte après confirmation de l'encaissement par le prestataire de paiement. Ce délai peut atteindre quelques minutes.",
      ],
    },
    {
      titre: "6. Droits sur les morceaux générés",
      paragraphes: [
        "Les morceaux sont produits par un fournisseur tiers de génération musicale. Les droits attachés au fichier produit sont régis en premier lieu par les conditions de ce fournisseur, sur lesquelles BAKUMELO n'a pas la main.",
        "BAKUMELO ne revendique aucun droit de propriété sur les morceaux générés depuis un compte client, ne les exploite pas et ne les diffuse pas publiquement sans l'accord écrit du client. Le prestataire cède au client l'ensemble des droits qu'il détient lui-même sur le fichier produit, dans la limite de ce que ses propres fournisseurs lui accordent.",
        "Le prestataire ne garantit en revanche ni l'étendue de ces droits, ni la possibilité d'une exploitation commerciale du morceau. Il est recommandé au client de s'assurer de l'étendue de ses droits avant toute exploitation commerciale — diffusion payante, vente, monétisation, synchronisation ou dépôt auprès d'une société de gestion.",
        "L'usage privé du morceau — écoute personnelle, cercle familial, événement non commercial — n'est soumis à aucune restriction de la part de BAKUMELO.",
        "Le client garantit que les éléments qu'il fournit — texte, titre, description — ne portent atteinte à aucun droit de tiers, et répond seul de l'usage qu'il fait du morceau produit.",
        "Les systèmes de génération étant probabilistes, deux clients peuvent obtenir des résultats voisins à partir de descriptions semblables. Aucune exclusivité de rendu n'est garantie.",
      ],
    },
    {
      titre: "7. Usages interdits",
      paragraphes: [
        "Sont notamment interdits : la production de contenus haineux, diffamatoires, ou incitant à la violence ; l'imitation de la voix ou du style d'une personne identifiable sans son accord ; la reprise de paroles ou de compositions protégées ; et tout usage contraire à la loi.",
        "Le prestataire peut suspendre un compte contrevenant, sans remboursement des crédits restants lorsque le manquement est caractérisé.",
      ],
    },
    {
      titre: "8. Disponibilité et responsabilité",
      paragraphes: [
        "Le service est fourni sans garantie de disponibilité continue. Des interruptions peuvent survenir pour maintenance, ou du fait d'un prestataire technique.",
        "La responsabilité du prestataire est limitée au montant des crédits achetés par le client au cours des douze derniers mois. Elle ne couvre pas les préjudices indirects, notamment la perte d'exploitation ou de chance.",
      ],
    },
    {
      titre: "9. Données personnelles",
      paragraphes: [
        "Sont collectés : l'adresse électronique, le nom si le client le renseigne, l'historique des générations et des mouvements de crédits, ainsi que les réclamations déposées.",
        "Ces données sont hébergées par notre prestataire d'infrastructure. Les descriptions saisies sont transmises au fournisseur de génération musicale aux seules fins de produire le morceau. Les données de paiement transitent par le prestataire d'encaissement, sans jamais être conservées par BAKUMELO.",
        "Le client peut demander l'accès à ses données, leur rectification ou leur suppression depuis la page Assistance. La suppression du compte entraîne celle du profil et des morceaux associés ; les réclamations déposées sont conservées à titre de preuve.",
      ],
    },
    {
      titre: "10. Réclamations",
      paragraphes: [
        "Toute réclamation peut être déposée depuis la page Assistance, avec ou sans compte. Un numéro de dossier est délivré immédiatement.",
        "Le prestataire s'efforce d'y répondre dans les meilleurs délais. Aucun accusé de réception automatique n'est envoyé par courriel à ce jour.",
      ],
    },
    {
      titre: "11. Modification des conditions",
      paragraphes: [
        "Les présentes conditions peuvent être modifiées. La version applicable est celle publiée sur cette page au jour de l'utilisation du service.",
        `Dernière mise à jour : ${DERNIERE_MAJ}.`,
      ],
    },
    {
      titre: "12. Droit applicable",
      paragraphes: [
        `Les présentes conditions sont soumises au droit en vigueur au ${IDENTITE.pays}.`,
        `À défaut de règlement amiable, tout litige sera porté devant le ${IDENTITE.juridiction}.`,
      ],
    },
  ];
}

function sectionsEn(): Section[] {
  return [
    {
      titre: "1. Provider identification",
      paragraphes: [
        `BAKUMELO is operated by ${IDENTITE.raisonSociale}, a limited liability company (SARL), registered under number ${IDENTITE.immatriculation}, tax identification number ${IDENTITE.niu}, with its registered office at ${IDENTITE.adresse}, ${IDENTITE.pays}.`,
        `Contact: ${IDENTITE.email}. Complaints may also be filed from the Support page.`,
      ],
    },
    {
      titre: "2. Purpose",
      paragraphes: [
        "These terms govern access to BAKUMELO and the purchase of generation credits. Creating an account constitutes acceptance of these terms.",
        "BAKUMELO produces music tracks from a written description using artificial intelligence systems. The service guarantees neither absolute originality nor fitness for any particular purpose.",
      ],
    },
    {
      titre: "3. Account and registration",
      paragraphes: [
        `Registration is free and grants ${SIGNUP_CREDITS} free credits, usable immediately.`,
        "Customers are responsible for keeping their credentials confidential and for generations made from their account. Any use observed from an account is deemed to originate from its holder.",
        "Authentication emails are currently sent by our technical provider and may appear under its name rather than BAKUMELO's.",
      ],
    },
    {
      titre: "4. Credits and operation",
      paragraphes: [
        "One generation consumes one credit, deducted when the request starts rather than when the track is delivered.",
        "Where a generation fails through the fault of the service, the credit is returned. A credit consumed by a completed generation is not returned, including where the result does not suit the customer: production costs are incurred as soon as the request starts.",
        "Credits do not expire and are neither transferable nor convertible into cash.",
      ],
    },
    {
      titre: "5. Prices and payment",
      paragraphes: [
        `The available packs are: ${prix("en")}.`,
        "Amounts are charged in CFA francs (XAF). Prices displayed in other currencies are indicative and do not bind the provider.",
        "Payment is handled by a third party. BAKUMELO has access to no banking data: neither card numbers nor mobile wallet identifiers.",
        "Credits are added to the account once the payment provider confirms the transaction. This may take a few minutes.",
      ],
    },
    {
      titre: "6. Rights in generated tracks",
      paragraphes: [
        "Tracks are produced by a third-party music generation provider. The rights attaching to the resulting file are governed first and foremost by that provider's terms, over which BAKUMELO has no control.",
        "BAKUMELO claims no ownership in tracks generated from a customer account, does not exploit them, and does not publish them without the customer's written consent. The provider assigns to the customer all rights it holds itself in the resulting file, to the extent its own suppliers grant them.",
        "The provider does not, however, warrant the extent of those rights or the possibility of commercial exploitation. Customers are advised to satisfy themselves as to the extent of their rights before any commercial exploitation — paid distribution, sale, monetisation, synchronisation, or registration with a collecting society.",
        "Private use of the track — personal listening, family circle, non-commercial events — is subject to no restriction on BAKUMELO's part.",
        "Customers warrant that the material they supply — text, title, description — infringes no third-party rights, and are solely answerable for their use of the resulting track.",
        "Generation systems being probabilistic, two customers may obtain similar results from similar descriptions. No exclusivity of output is guaranteed.",
      ],
    },
    {
      titre: "7. Prohibited uses",
      paragraphes: [
        "The following are prohibited in particular: producing hateful, defamatory or violence-inciting content; imitating the voice or style of an identifiable person without their consent; reproducing protected lyrics or compositions; and any unlawful use.",
        "The provider may suspend an infringing account, without refunding remaining credits where the breach is established.",
      ],
    },
    {
      titre: "8. Availability and liability",
      paragraphes: [
        "The service is provided without guarantee of continuous availability. Interruptions may occur for maintenance or through a technical provider.",
        "The provider's liability is limited to the amount of credits purchased by the customer over the preceding twelve months. It does not cover indirect loss, in particular loss of business or of opportunity.",
      ],
    },
    {
      titre: "9. Personal data",
      paragraphes: [
        "The following are collected: email address, name where supplied, generation and credit history, and complaints filed.",
        "This data is hosted by our infrastructure provider. Descriptions entered are passed to the music generation provider for the sole purpose of producing the track. Payment data passes through the payment provider and is never retained by BAKUMELO.",
        "Customers may request access to, correction of, or deletion of their data from the Support page. Deleting an account deletes the profile and associated tracks; complaints filed are retained as evidence.",
      ],
    },
    {
      titre: "10. Complaints",
      paragraphes: [
        "Complaints may be filed from the Support page, with or without an account. A case number is issued immediately.",
        "The provider endeavours to respond promptly. No automatic email acknowledgement is sent at this time.",
      ],
    },
    {
      titre: "11. Changes to these terms",
      paragraphes: [
        "These terms may be amended. The applicable version is the one published on this page on the day the service is used.",
        `Last updated: ${DERNIERE_MAJ}.`,
      ],
    },
    {
      titre: "12. Governing law",
      paragraphes: [
        `These terms are governed by the law in force in ${IDENTITE.pays}.`,
        `Failing amicable settlement, any dispute shall be brought before the ${IDENTITE.juridiction}.`,
      ],
    },
  ];
}
