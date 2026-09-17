import type { AnalyticsLocale } from "../_analytics/product-analytics";

export const privacyCopy = {
  pl: {
    title: "Prywatność i analityka",
    description: "Jak ReviewGuard używa Cookiebot i PostHog na stronie oraz w publicznym demo.",
    reviewNotice: "Wersja robocza — wymaga przeglądu prawnego przed uruchomieniem produkcyjnym.",
    back: "Wróć do ReviewGuard",
    sections: [
      {
        title: "Twój wybór",
        paragraphs: [
          "Cookiebot wyświetla wybór dotyczący analityki i zapamiętuje go w tej przeglądarce. Analityka jest opcjonalna. Odrzucenie, pominięcie albo późniejsze wycofanie zgody nie blokuje nawigacji, publicznego demo, kopiowania odpowiedzi ani formularza kontaktowego.",
          "Zgodę można zmienić lub wycofać przez „Ustawienia analityki” w stopce strony głównej i publicznego demo. Po wycofaniu nie zbieramy kolejnych zdarzeń i usuwamy identyfikator bieżącej anonimowej sesji z pamięci karty przeglądarki.",
        ],
      },
      {
        title: "Co mierzymy po wyrażeniu zgody",
        paragraphs: [
          "PostHog Cloud EU służy wyłącznie do zrozumienia, czy odwiedzający przechodzą ze strony do demo, korzystają z kolejki odpowiedzi i wysyłają zgłoszenie pilotażowe. Dane obejmują tylko z góry dozwolone zdarzenia: wyświetlenie strony i demo, otwarcie opinii, edycję, zatwierdzenie lub skopiowanie odpowiedzi, zmianę przygotowanego wariantu oraz wyświetlenie i skuteczne wysłanie formularza.",
          "Do zdarzeń mogą być dołączone: język, rodzaj strony, ogólna klasa urządzenia, domena odsyłająca, dozwolone parametry kampanii oraz techniczne fakty o próbce demo (identyfikator opinii, ocena i kategoria). Nie włączamy automatycznego przechwytywania, nagrań sesji, map cieplnych ani profili osób.",
        ],
      },
      {
        title: "Retencja i niepełny obraz",
        paragraphs: [
          "Historię zdarzeń w PostHog przechowujemy przez 12 miesięcy. Ponieważ pomiar działa tylko po dobrowolnej zgodzie i może być blokowany przez przeglądarkę lub rozszerzenie, raporty opisują wyłącznie część sesji i nie przedstawiają całego ruchu.",
        ],
      },
      {
        title: "Formularz kontaktowy pozostaje oddzielny",
        paragraphs: [
          "Treść formularza, adres e-mail, nazwa lokalu i link do Profilu Firmy w Google nie są wysyłane do PostHog. Anonimowy identyfikator sesji analitycznej nie jest wysyłany do formularza ani łączony z danymi kontaktowymi. PostHog otrzymuje jedynie zdarzenie skutecznego wysłania po potwierdzeniu przyjęcia zgłoszenia przez usługę powiadomień.",
        ],
      },
      {
        title: "Dostawcy",
        paragraphs: [
          "Cookiebot zarządza interfejsem i zapisem wyboru zgody. PostHog Cloud EU przetwarza dozwolone zdarzenia analityczne dopiero po jednoznacznej zgodzie na kategorię Statystyki. Awaria, blokada lub brak któregokolwiek z tych narzędzi nie powinny wpływać na podstawowe funkcje ReviewGuard.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy and analytics",
    description: "How ReviewGuard uses Cookiebot and PostHog on the website and public demo.",
    reviewNotice: "Draft — human legal review is required before the production launch.",
    back: "Back to ReviewGuard",
    sections: [
      {
        title: "Your choice",
        paragraphs: [
          "Cookiebot presents the analytics choice and remembers it in this browser. Analytics is optional. Rejecting, ignoring, or later withdrawing consent does not block navigation, the public demo, reply copying, or the contact form.",
          "You can change or withdraw consent through “Analytics settings” in the landing-page and public-demo footers. After withdrawal, we stop collecting new events and remove the current anonymous session identifier from the browser tab’s storage.",
        ],
      },
      {
        title: "What we measure after consent",
        paragraphs: [
          "PostHog Cloud EU is used only to understand whether visitors move from the landing page into the demo, use the response queue, and submit a pilot enquiry. Data is limited to an allowlist of events: landing-page and demo views; opening a review; editing, approving, or copying a reply; selecting a prepared variant; and viewing or successfully submitting the lead form.",
          "Events may include the language, page kind, broad device class, referring domain, allowlisted campaign parameters, and technical facts about the demo sample (review identifier, rating, and category). We do not enable autocapture, session recordings, heatmaps, or person profiles.",
        ],
      },
      {
        title: "Retention and incomplete coverage",
        paragraphs: [
          "We retain PostHog event history for 12 months. Because measurement starts only after voluntary consent and may be blocked by a browser or extension, reports cover only some sessions and do not represent all traffic.",
        ],
      },
      {
        title: "Contact details stay separate",
        paragraphs: [
          "Form content, email addresses, location names, and Google Business Profile links are not sent to PostHog. The anonymous analytics session identifier is not sent with the form or linked to lead details. PostHog receives only a successful-submission event after the notification service accepts the enquiry.",
        ],
      },
      {
        title: "Providers",
        paragraphs: [
          "Cookiebot manages the consent interface and records the choice. PostHog Cloud EU processes allowlisted analytics events only after affirmative Statistics consent. A failure, blocker, or absence of either service should not affect ReviewGuard’s core features.",
        ],
      },
    ],
  },
} as const satisfies Record<AnalyticsLocale, unknown>;
