/**
 * Politique de confidentialité.
 *
 * Même parti que lib/terms.ts : le texte vit ici plutôt qu'éclaté en clés de
 * traduction, pour rester relisable d'un bloc par qui doit le vérifier.
 *
 * L'identité du responsable de traitement est reprise de lib/terms.ts : deux
 * déclarations d'une même société finiraient par diverger, et c'est le genre
 * d'écart qu'un contrôle relève immédiatement.
 *
 * Le contenu décrit les tables réellement présentes en base, relevées colonne
 * par colonne avant rédaction. Annoncer moins que ce qui est collecté serait
 * la faute la plus grave que puisse commettre un tel document.
 *
 * À la date de rédaction, le site ne comporte aucun outil de mesure
 * d'audience, aucun traceur publicitaire, et ne pose que les cookies de
 * session nécessaires à l'authentification. Si cela changeait, ce document
 * devrait être révisé avant la mise en ligne du traceur, et non après.
 */

import { IDENTITE } from "./terms";

export const DERNIERE_MAJ = "2026-08-28";

export type Section = { titre: string; paragraphes: string[] };

export function sections(locale: "fr" | "en"): Section[] {
  return locale === "en" ? sectionsEn() : sectionsFr();
}

function sectionsFr(): Section[] {
  return [
    {
      titre: "1. Responsable du traitement",
      paragraphes: [
        `Les données collectées sur BAKUMELO sont traitées par ${IDENTITE.raisonSociale}, ${IDENTITE.forme}, immatriculée sous le numéro ${IDENTITE.immatriculation}, dont le siège est situé ${IDENTITE.adresse}, ${IDENTITE.pays}.`,
        `Pour toute question relative à vos données : ${IDENTITE.email}, ou depuis la page Assistance du site.`,
      ],
    },
    {
      titre: "2. Données collectées",
      paragraphes: [
        "Compte : adresse électronique, nom si vous le renseignez, et photo de profil lorsque vous vous connectez par Google. Ces deux dernières informations proviennent de votre compte Google et ne sont récupérées qu'avec votre accord au moment de la connexion.",
        "Créations : titre, style musical, description saisie, paroles produites, lien vers le fichier audio, et état de la génération.",
        "Crédits : solde courant et historique des mouvements — génération, achat, ajustement — avec leur motif.",
        "Paiements : référence, offre choisie, montant, devise et état de la transaction. Aucune donnée bancaire n'est collectée ni conservée : ni numéro de carte, ni identifiant de portefeuille mobile.",
        "Réclamations : adresse électronique, nom si vous le renseignez, motif, référence éventuelle et contenu du message.",
      ],
    },
    {
      titre: "3. Finalités",
      paragraphes: [
        "Ces données servent à fournir le service : créer et sécuriser votre compte, produire les morceaux demandés, décompter et créditer vos crédits, encaisser vos achats, et répondre à vos réclamations.",
        "Elles ne sont ni vendues, ni louées, ni transmises à des fins publicitaires.",
      ],
    },
    {
      titre: "4. Destinataires",
      paragraphes: [
        "Hébergement et authentification : notre prestataire d'infrastructure héberge la base de données et gère les sessions de connexion. Les courriels d'authentification sont expédiés par ce même prestataire, et peuvent s'afficher à son nom.",
        "Génération musicale : la description que vous saisissez, le titre et le style choisis sont transmis à notre fournisseur de génération, aux seules fins de produire le morceau. Le fichier audio produit est hébergé sur l'infrastructure de ce fournisseur.",
        "Paiement : votre adresse électronique et le montant sont transmis au prestataire d'encaissement. Les informations de règlement sont saisies chez lui et ne transitent jamais par BAKUMELO.",
        "Hébergement du site : l'application est déployée chez un hébergeur qui traite les journaux techniques nécessaires à son fonctionnement.",
        "Aucun autre destinataire n'a accès à vos données, hors obligation légale.",
      ],
    },
    {
      titre: "5. Durée de conservation",
      paragraphes: [
        "Les données de compte et de créations sont conservées tant que le compte existe.",
        "La suppression du compte entraîne celle du profil et des créations associées. Les réclamations déposées sont en revanche conservées, détachées du compte, à titre de preuve en cas de litige.",
        "Les enregistrements de paiement sont conservés pour la durée exigée en matière comptable et fiscale.",
      ],
    },
    {
      titre: "6. Cookies",
      paragraphes: [
        "Le site ne dépose que les cookies nécessaires à votre session : ils permettent de vous maintenir connecté d'une page à l'autre. Ils ne servent à aucune mesure d'audience ni à aucun ciblage.",
        "À la date de mise à jour de ce document, le site ne comporte aucun outil de mesure d'audience ni traceur publicitaire. Aucun consentement n'est donc sollicité, ces cookies étant strictement nécessaires au fonctionnement.",
      ],
    },
    {
      titre: "7. Sécurité",
      paragraphes: [
        "L'accès à la base est restreint côté serveur : le navigateur ne peut lire ni les paiements, ni les réclamations, ni les données d'un autre client.",
        "Les échanges avec le site sont chiffrés. Les notifications de paiement reçues de notre prestataire sont vérifiées par signature avant d'être prises en compte.",
        "Aucune mesure ne rend un système inviolable. En cas de violation susceptible d'engendrer un risque pour vos droits, les personnes concernées en seraient informées.",
      ],
    },
    {
      titre: "8. Vos droits",
      paragraphes: [
        "Vous pouvez demander l'accès à vos données, leur rectification, leur suppression, ou une copie de vos créations.",
        "Ces demandes se font depuis la page Assistance, ou à l'adresse de contact indiquée en tête de ce document. Un numéro de dossier vous est délivré immédiatement.",
        "Vous pouvez corriger vous-même votre nom et votre mot de passe depuis votre compte.",
      ],
    },
    {
      titre: "9. Transferts hors du Cameroun",
      paragraphes: [
        "Nos prestataires d'hébergement et de génération musicale opèrent depuis l'étranger. Vos données sont donc traitées hors du Cameroun, ce dont vous êtes informé en vous inscrivant.",
        "Ces transferts se limitent à ce qui est nécessaire au fonctionnement du service, tel que décrit à l'article 4.",
      ],
    },
    {
      titre: "10. Modification",
      paragraphes: [
        "Cette politique peut être modifiée. La version applicable est celle publiée sur cette page.",
        `Dernière mise à jour : ${DERNIERE_MAJ}.`,
      ],
    },
  ];
}

function sectionsEn(): Section[] {
  return [
    {
      titre: "1. Data controller",
      paragraphes: [
        `Data collected on BAKUMELO is processed by ${IDENTITE.raisonSociale}, a limited liability company (SARL), registered under number ${IDENTITE.immatriculation}, with its registered office at ${IDENTITE.adresse}, ${IDENTITE.pays}.`,
        `For any question about your data: ${IDENTITE.email}, or from the Support page.`,
      ],
    },
    {
      titre: "2. Data collected",
      paragraphes: [
        "Account: email address, name where you provide it, and profile picture when you sign in with Google. The latter two come from your Google account and are retrieved only with your consent at sign-in.",
        "Creations: title, musical style, the description you enter, the lyrics produced, a link to the audio file, and the generation status.",
        "Credits: current balance and history of movements — generation, purchase, adjustment — together with their reason.",
        "Payments: reference, pack chosen, amount, currency and transaction status. No banking data is collected or retained: neither card numbers nor mobile wallet identifiers.",
        "Complaints: email address, name where you provide it, category, any reference, and the content of your message.",
      ],
    },
    {
      titre: "3. Purposes",
      paragraphes: [
        "This data is used to provide the service: create and secure your account, produce the tracks you request, deduct and credit your credits, process your purchases, and answer your complaints.",
        "It is neither sold, rented, nor passed on for advertising purposes.",
      ],
    },
    {
      titre: "4. Recipients",
      paragraphes: [
        "Hosting and authentication: our infrastructure provider hosts the database and manages sign-in sessions. Authentication emails are sent by that same provider and may appear under its name.",
        "Music generation: the description you enter, along with the title and style chosen, is passed to our generation provider for the sole purpose of producing the track. The resulting audio file is hosted on that provider's infrastructure.",
        "Payment: your email address and the amount are passed to the payment provider. Payment details are entered on their side and never pass through BAKUMELO.",
        "Site hosting: the application is deployed with a host that processes the technical logs needed to run it.",
        "No other recipient has access to your data, save where required by law.",
      ],
    },
    {
      titre: "5. Retention",
      paragraphes: [
        "Account and creation data is retained for as long as the account exists.",
        "Deleting your account deletes the profile and associated creations. Complaints filed are however retained, detached from the account, as evidence in the event of a dispute.",
        "Payment records are retained for the period required by accounting and tax rules.",
      ],
    },
    {
      titre: "6. Cookies",
      paragraphes: [
        "The site sets only the cookies needed for your session: they keep you signed in from page to page. They serve no audience measurement and no targeting.",
        "As at the date of this document, the site contains no analytics tool and no advertising tracker. No consent is therefore sought, these cookies being strictly necessary to operation.",
      ],
    },
    {
      titre: "7. Security",
      paragraphes: [
        "Database access is restricted server-side: the browser can read neither payments, nor complaints, nor another customer's data.",
        "Exchanges with the site are encrypted. Payment notifications received from our provider are verified by signature before being acted upon.",
        "No measure makes a system impregnable. In the event of a breach likely to create a risk to your rights, those concerned would be informed.",
      ],
    },
    {
      titre: "8. Your rights",
      paragraphes: [
        "You may request access to your data, its correction, its deletion, or a copy of your creations.",
        "Such requests are made from the Support page, or at the contact address given at the top of this document. A case number is issued immediately.",
        "You can correct your name and password yourself from your account.",
      ],
    },
    {
      titre: "9. Transfers outside Cameroon",
      paragraphes: [
        "Our hosting and music generation providers operate from abroad. Your data is therefore processed outside Cameroon, of which you are informed on registering.",
        "These transfers are limited to what is necessary to operate the service, as described in article 4.",
      ],
    },
    {
      titre: "10. Changes",
      paragraphes: [
        "This policy may be amended. The applicable version is the one published on this page.",
        `Last updated: ${DERNIERE_MAJ}.`,
      ],
    },
  ];
}
