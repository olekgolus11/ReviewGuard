export type DemoLocale = "pl" | "en";
export type ReviewStatus = "new" | "context" | "ready" | "approved";
export type ReviewCategory = "quick" | "personalize" | "caution";
export type DemoReviewId =
  | "P1"
  | "P2"
  | "P3"
  | "P4"
  | "M1"
  | "M2"
  | "M3"
  | "N1"
  | "N2"
  | "N3"
  | "C1";
export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type ReplyStyle = "warm" | "concise" | "casual";
export type ReplyLength = "short" | "standard";

type LocalizedText = Record<DemoLocale, string>;

export type DemoReview = {
  id: DemoReviewId;
  rating: ReviewRating;
  age: LocalizedText;
  category: ReviewCategory;
  initialStatus: ReviewStatus;
  review: LocalizedText;
  detail: LocalizedText;
  replies: Record<ReplyStyle, LocalizedText>;
  alternateReplies: Record<ReplyStyle, LocalizedText>;
  managerContext?: {
    example: LocalizedText;
    replies: Record<ReplyStyle, Record<DemoLocale, readonly [string, string]>>;
  };
};

export const demoReviews: DemoReview[] = [
  {
    id: "P1",
    rating: 5,
    age: { pl: "2 dni temu", en: "2 days ago" },
    category: "quick",
    initialStatus: "ready",
    review: {
      pl: "Pizza była bardzo smaczna, a zamówienie na wynos czekało szybciej, niż zakładałem.",
      en: "The pizza was delicious and my takeaway order was ready sooner than expected.",
    },
    detail: { pl: "Smak i szybki odbiór", en: "Taste and quick collection" },
    replies: {
      warm: {
        pl: "Bardzo dziękujemy! Cieszymy się, że pizza smakowała, a odbiór przebiegł sprawnie. Zapraszamy ponownie!",
        en: "Thank you so much! We are delighted that you enjoyed the pizza and that collection went smoothly. We hope to see you again!",
      },
      concise: {
        pl: "Dziękujemy za 5 gwiazdek! Miło nam, że pizza smakowała i była gotowa na czas.",
        en: "Thank you for the five stars. We are glad the pizza was tasty and ready on time.",
      },
      casual: {
        pl: "Super, że smakowało i wszystko czekało na czas! Do zobaczenia przy kolejnej pizzy. 🍕",
        en: "Great to hear you enjoyed it and everything was ready on time! See you for the next pizza. 🍕",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za miłe słowa! Szczególnie cieszy nas smak pizzy i szybki odbiór. Będzie nam bardzo miło gościć Państwa ponownie.",
        en: "Thank you for the lovely review. We are especially pleased that the pizza tasted great and collection was quick. We hope to welcome you again soon.",
      },
      concise: {
        pl: "Dziękujemy za opinię. Cieszymy się, że pizza smakowała, a odbiór przebiegł szybko.",
        en: "Thank you for your review. We are glad the pizza was delicious and collection was quick.",
      },
      casual: {
        pl: "Smaczna pizza i szybki odbiór — dokładnie tak ma być. Dzięki i do następnego! 🍕",
        en: "Tasty pizza and quick collection — exactly how it should be. Thanks and see you next time! 🍕",
      },
    },
  },
  {
    id: "P2",
    rating: 5,
    age: { pl: "3 dni temu", en: "3 days ago" },
    category: "quick",
    initialStatus: "ready",
    review: {
      pl: "Świetne ciasto, świeże dodatki i szybka realizacja. Duży plus za miejsce do zabawy dla dzieci.",
      en: "Great dough, fresh toppings and quick service. The children’s play area is a big plus.",
    },
    detail: { pl: "Rodzinna wizyta", en: "Family visit" },
    replies: {
      warm: {
        pl: "Dziękujemy za tak miłe słowa! Ogromnie nas cieszy, że docenili Państwo zarówno pizzę, jak i kącik dla najmłodszych. Do zobaczenia przy kolejnej rodzinnej wizycie!",
        en: "Thank you for such kind words! We are delighted that you enjoyed both the pizza and the children’s corner. We hope to welcome the whole family again soon!",
      },
      concise: {
        pl: "Dziękujemy! Cieszymy się, że smakowało, a kącik dla dzieci okazał się przydatny.",
        en: "Thank you! We are glad you enjoyed the food and found the children’s corner useful.",
      },
      casual: {
        pl: "Super, że pizza smakowała, a kącik umilił dzieciom oczekiwanie. Zapraszamy całą ekipę ponownie!",
        en: "Great to hear the pizza hit the spot and the play corner kept the little ones happy. Bring the whole crew back soon!",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Bardzo dziękujemy! Cieszy nas, że świeże dodatki, sprawna obsługa i kącik dla dzieci złożyły się na udaną wizytę.",
        en: "Thank you very much. We are delighted that the fresh toppings, quick service and children's play area made for a good visit.",
      },
      concise: {
        pl: "Dziękujemy! Miło nam, że docenili Państwo pizzę, obsługę i kącik dla dzieci.",
        en: "Thank you. We are glad you appreciated the pizza, service and children's play area.",
      },
      casual: {
        pl: "Pizza dla dorosłych, kącik dla dzieci i sprawna obsługa — cieszymy się, że wszystko zagrało!",
        en: "Pizza for the adults, a play corner for the children and quick service — great to hear it all worked!",
      },
    },
  },
  {
    id: "P3",
    rating: 5,
    age: { pl: "tydzień temu", en: "1 week ago" },
    category: "quick",
    initialStatus: "ready",
    review: {
      pl: "Wracamy tu regularnie. Pizza trzyma poziom, obsługa jest zawsze uśmiechnięta, a dzieci mają swoje miejsce.",
      en: "We come back regularly. The pizza is consistently good, the team is always cheerful and the children have their own space.",
    },
    detail: { pl: "Stały gość", en: "Returning guest" },
    replies: {
      warm: {
        pl: "Takie słowa od stałych Gości znaczą dla nas szczególnie dużo. Dziękujemy za zaufanie i docenienie naszej ekipy — koniecznie przekażemy jej pochwałę!",
        en: "Words like these mean even more when they come from returning guests. Thank you for your trust and for recognising our team — we will gladly pass on the praise!",
      },
      concise: {
        pl: "Dziękujemy za regularne wizyty i zaufanie. Pochwałę przekażemy całemu zespołowi.",
        en: "Thank you for returning and for trusting us. We will share your praise with the whole team.",
      },
      casual: {
        pl: "Regularne powroty to najlepszy komplement! Dzięki za zaufanie i do zobaczenia przy następnej pizzy. 🍕",
        en: "Coming back is the best compliment we could get! Thanks for trusting us — see you at the next pizza. 🍕",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za każdą kolejną wizytę. Ogromnie cieszą nas dobre słowa o pizzy, zespole i miejscu dla dzieci.",
        en: "Thank you for every return visit. Your kind words about the pizza, our team and the children's area mean a great deal.",
      },
      concise: {
        pl: "Dziękujemy za zaufanie i regularne wizyty. Do zobaczenia ponownie!",
        en: "Thank you for your trust and regular visits. We hope to see you again soon.",
      },
      casual: {
        pl: "Uwielbiamy takich stałych Gości — dzięki, że do nas wracacie! 🍕",
        en: "We love welcoming regular guests like you — thanks for coming back! 🍕",
      },
    },
  },
  {
    id: "P4",
    rating: 5,
    age: { pl: "tydzień temu", en: "1 week ago" },
    category: "quick",
    initialStatus: "ready",
    review: {
      pl: "Bardzo dobra pizza i sympatyczna obsługa. Dobre miejsce na rodzinny obiad.",
      en: "Very good pizza and friendly service. A lovely place for a family lunch.",
    },
    detail: { pl: "Rodzinny obiad", en: "Family lunch" },
    replies: {
      warm: {
        pl: "Bardzo dziękujemy! Miło nam, że pizza i obsługa umiliły Państwu rodzinny czas. Zapraszamy ponownie.",
        en: "Thank you very much! We are happy that the pizza and service made your family time enjoyable. We look forward to welcoming you again.",
      },
      concise: {
        pl: "Dziękujemy za polecenie. Zapraszamy na kolejne rodzinne spotkanie przy pizzy.",
        en: "Thank you for recommending us. We hope to see you for another family meal.",
      },
      casual: {
        pl: "Rodzinny obiad i dobra pizza — brzmi jak udany zestaw! Dzięki i do zobaczenia. 🍕",
        en: "Family lunch and good pizza — that sounds like a winning combination! Thanks and see you soon. 🍕",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za wizytę. Bardzo nam miło, że pizza, obsługa i rodzinna atmosfera zostały dobrze odebrane.",
        en: "Thank you for visiting. We are very pleased that you enjoyed the pizza, service and family atmosphere.",
      },
      concise: {
        pl: "Dziękujemy za miłą opinię o pizzy i obsłudze. Zapraszamy ponownie.",
        en: "Thank you for the kind words about our pizza and service. We hope to see you again.",
      },
      casual: {
        pl: "Dobra pizza w rodzinnym gronie — super, że mogliśmy być częścią tego obiadu!",
        en: "Good pizza with the family — lovely to have been part of your lunch!",
      },
    },
  },
  {
    id: "M1",
    rating: 3,
    age: { pl: "4 dni temu", en: "4 days ago" },
    category: "personalize",
    initialStatus: "new",
    review: {
      pl: "Smak pizzy jak zwykle bardzo dobry, ale mimo niewielkiej odległości dotarła zimna. Zamawiamy często, dlatego tym razem mocno się zawiedliśmy.",
      en: "The pizza tasted as good as usual, but it arrived cold despite the short distance. We order often, so this was particularly disappointing.",
    },
    detail: { pl: "Zimna dostawa", en: "Cold delivery" },
    replies: {
      warm: {
        pl: "Dziękujemy za szczerą opinię i za to, że regularnie wybierają Państwo naszą pizzę. Bardzo przepraszamy — zamówienie zdecydowanie nie powinno dotrzeć zimne. Mamy nadzieję, że kolejna dostawa odzyska Państwa zaufanie.",
        en: "Thank you for your honest feedback and for ordering from us regularly. We are very sorry — your order should not have arrived cold. We hope your next delivery will restore your trust in us.",
      },
      concise: {
        pl: "Przepraszamy za zimną dostawę. Tym bardziej przykro nam, że zawiedliśmy stałych Gości. Sprawdzimy ten etap realizacji zamówień.",
        en: "We are sorry the delivery arrived cold, especially as you are returning guests. We will review this part of our delivery process.",
      },
      casual: {
        pl: "Tym razem zdecydowanie nie dowieźliśmy jakości, do której są Państwo przyzwyczajeni. Przepraszamy za zimną pizzę i liczymy, że następnym razem znów będzie tak, jak powinno.",
        en: "This time we clearly missed the standard you know us for. Sorry about the cold pizza — we hope the next order feels like us again.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za szczery sygnał od stałych Gości. Przepraszamy za zimną dostawę i sprawdzimy, na którym etapie zamówienie straciło temperaturę.",
        en: "Thank you for the honest feedback from returning guests. We are sorry about the cold delivery and will review where the order lost temperature.",
      },
      concise: {
        pl: "Przepraszamy za zimną pizzę. Sprawdzimy przebieg tej dostawy z zespołem.",
        en: "We are sorry the pizza arrived cold. We will review this delivery with the team.",
      },
      casual: {
        pl: "Stałych Gości nie powinniśmy tak zawodzić. Przepraszamy za zimną dostawę — sprawdzimy, co poszło nie tak.",
        en: "We should not let regular guests down like this. Sorry about the cold delivery — we will check what went wrong.",
      },
    },
  },
  {
    id: "M2",
    rating: 3,
    age: { pl: "2 miesiące temu", en: "2 months ago" },
    category: "personalize",
    initialStatus: "new",
    review: {
      pl: "Składniki były świeże, a spód przyjemnie chrupiący. Sos wydał mi się jednak zbyt intensywny, a całe ciasto trochę za sztywne.",
      en: "The ingredients were fresh and the base had a nice crunch. The sauce felt too intense, though, and the dough was a little too firm.",
    },
    detail: { pl: "Uwagi do receptury", en: "Recipe feedback" },
    replies: {
      warm: {
        pl: "Dziękujemy za konkretną i wyważoną opinię. Cieszymy się, że świeżość składników została doceniona, a uwagom dotyczącym sosu i ciasta uważnie się przyjrzymy. Mamy nadzieję, że przy kolejnej wizycie zrobimy lepsze wrażenie.",
        en: "Thank you for such specific and balanced feedback. We are glad you noticed the freshness of the ingredients, and we will look carefully at your comments about the sauce and dough. We hope to make a better impression next time.",
      },
      concise: {
        pl: "Dziękujemy za szczegółowe uwagi. Przekażemy zespołowi komentarz dotyczący sosu i struktury ciasta.",
        en: "Thank you for the detailed feedback. We will pass your comments about the sauce and dough texture to the team.",
      },
      casual: {
        pl: "Dzięki za bardzo konkretne wskazówki. Świeżość zapisujemy na plus, a sos i ciasto bierzemy pod lupę przed kolejną wizytą.",
        en: "Thanks for the really useful detail. Fresh ingredients go in the win column; we will take a closer look at the sauce and dough before your next visit.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za wyważoną opinię. Doceniamy pochwałę świeżych składników, a uwagi o sosie i cieście przekażemy zespołowi.",
        en: "Thank you for the balanced review. We appreciate the praise for our fresh ingredients and will share the comments about the sauce and dough with the team.",
      },
      concise: {
        pl: "Dziękujemy za konkretne uwagi o sosie i cieście. Przyjrzymy się im uważnie.",
        en: "Thank you for the specific comments about the sauce and dough. We will look at them carefully.",
      },
      casual: {
        pl: "Dzięki za konkrety — świeże składniki cieszą, a sos i ciasto sprawdzimy jeszcze raz.",
        en: "Thanks for the specifics — the fresh ingredients are good to hear, and we will revisit the sauce and dough.",
      },
    },
  },
  {
    id: "M3",
    rating: 2,
    age: { pl: "tydzień temu", en: "1 week ago" },
    category: "personalize",
    initialStatus: "new",
    review: {
      pl: "Przy tak wysokiej ocenie lokalu spodziewałem się więcej. Pizza była przeciętna, za to sosy naprawdę bardzo dobre.",
      en: "With such a high rating I expected more. The pizza was average, although the sauces were genuinely very good.",
    },
    detail: { pl: "Rozczarowanie i pochwała", en: "Disappointment and praise" },
    replies: {
      warm: {
        pl: "Dziękujemy za szczerość. Przykro nam, że pizza nie sprostała oczekiwaniom, choć cieszymy się, że sosy zostały dobrze odebrane. Mamy nadzieję, że dostaniemy jeszcze szansę na lepsze wrażenie.",
        en: "Thank you for being candid. We are sorry the pizza did not meet your expectations, although we are pleased you enjoyed the sauces. We hope we will have another chance to make a better impression.",
      },
      concise: {
        pl: "Dziękujemy za opinię. Cieszy nas pochwała sosów, ale żałujemy, że sama pizza rozczarowała.",
        en: "Thank you for your feedback. We appreciate the praise for our sauces but regret that the pizza disappointed you.",
      },
      casual: {
        pl: "Sosy obroniły honor, ale pizza też powinna była dać radę. Dzięki za szczerość — chcemy następnym razem trafić znacznie lepiej.",
        en: "The sauces saved the day, but the pizza should have delivered too. Thanks for being honest — we want to do much better next time.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Dziękujemy za uczciwą ocenę. Cieszymy się, że sosy smakowały, ale rozumiemy rozczarowanie pizzą i potraktujemy ten sygnał poważnie.",
        en: "Thank you for the honest assessment. We are glad you enjoyed the sauces, but understand the disappointment with the pizza and will take it seriously.",
      },
      concise: {
        pl: "Dziękujemy za szczerość. Przekażemy zespołowi zarówno pochwałę sosów, jak i uwagę o pizzy.",
        en: "Thank you for your honesty. We will share both the praise for the sauces and the concern about the pizza with the team.",
      },
      casual: {
        pl: "Miło, że sosy trafiły w punkt, ale pizza powinna była dorównać. Dzięki za szczery sygnał.",
        en: "Great that the sauces hit the mark, but the pizza should have matched them. Thanks for the honest feedback.",
      },
    },
  },
  {
    id: "N1",
    rating: 2,
    age: { pl: "miesiąc temu", en: "1 month ago" },
    category: "caution",
    initialStatus: "new",
    review: {
      pl: "Jedzenie było poprawne, ale po wejściu długo nikt do nas nie podszedł, chociaż w lokalu nie było tłoku. Musieliśmy sami upominać się o kartę.",
      en: "The food was fine, but nobody approached us for a long time even though the restaurant was quiet. We had to ask for a menu ourselves.",
    },
    detail: { pl: "Brak reakcji obsługi", en: "Service did not respond" },
    replies: {
      warm: {
        pl: "Dziękujemy za zwrócenie nam na to uwagi. Przepraszamy, że nie zostali Państwo odpowiednio przywitani i obsłużeni — tak nie powinien zaczynać się pobyt w naszym lokalu. Omówimy tę sytuację z zespołem.",
        en: "Thank you for bringing this to our attention. We are sorry you were not welcomed and served promptly — that is not how a visit with us should begin. We will discuss this with the team.",
      },
      concise: {
        pl: "Przepraszamy za brak szybkiej reakcji obsługi. To nie jest nasz standard i omówimy ten element z zespołem.",
        en: "We are sorry the team did not respond promptly. This is not our standard and we will address it with them.",
      },
      casual: {
        pl: "Goście nie powinni walczyć o kartę — przepraszamy za taki początek wizyty. Porozmawiamy z zespołem, żeby to się nie powtórzyło.",
        en: "Guests should never have to chase down a menu — sorry for that start to your visit. We will speak with the team so it does not happen again.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Przepraszamy za brak powitania i zbyt długie oczekiwanie na obsługę. Dziękujemy za sygnał — omówimy tę sytuację z zespołem.",
        en: "We are sorry you were not welcomed and waited too long for service. Thank you for raising it — we will discuss this with the team.",
      },
      concise: {
        pl: "Przepraszamy za długie oczekiwanie na kartę. Sprawdzimy tę sytuację z zespołem.",
        en: "We are sorry you waited so long for a menu. We will review this with the team.",
      },
      casual: {
        pl: "Tak nie powinno zaczynać się spotkanie przy pizzy. Przepraszamy za brak reakcji i zajmiemy się tym z zespołem.",
        en: "That is not how a pizza visit should begin. Sorry nobody responded — we will address it with the team.",
      },
    },
  },
  {
    id: "N2",
    rating: 1,
    age: { pl: "4 miesiące temu", en: "4 months ago" },
    category: "caution",
    initialStatus: "new",
    review: {
      pl: "Zamówienie odebrałem o umówionej porze, ale pizza była już chłodna i przygotowana na innym cieście, niż wybrałem. Miła osoba przy kasie nie uratowała całego doświadczenia.",
      en: "I collected the order at the agreed time, but the pizza was already cool and made with a different dough than requested. The friendly person at the till could not rescue the experience.",
    },
    detail: { pl: "Temperatura i pomyłka", en: "Temperature and wrong item" },
    replies: {
      warm: {
        pl: "Dziękujemy za opisanie sytuacji. Bardzo przepraszamy — pizza przy odbiorze powinna być ciepła i zgodna z zamówieniem. Doceniamy miłe słowo o obsłudze przy kasie, ale rozumiemy, że przy takich pomyłkach to za mało.",
        en: "Thank you for explaining what happened. We are very sorry — a collected pizza should be hot and match the order. We appreciate your kind word about our colleague at the till, but understand that it cannot make up for these mistakes.",
      },
      concise: {
        pl: "Przepraszamy za temperaturę pizzy i pomyłkę w rodzaju ciasta. Zweryfikujemy ten przypadek z zespołem.",
        en: "We are sorry about the pizza temperature and the incorrect dough. We will review this case with the team.",
      },
      casual: {
        pl: "Tu wydarzyły się dwie rzeczy, które nie powinny: chłodna pizza i nie to ciasto. Przepraszamy i sprawdzimy z zespołem, gdzie powstał błąd.",
        en: "Two things went wrong here: a cool pizza and the wrong dough. We are sorry and will check with the team where the order went off track.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Bardzo przepraszamy, że pizza była chłodna i przygotowana na innym cieście. Dziękujemy również za miłe słowo o osobie przy kasie.",
        en: "We are very sorry the pizza was cool and made with the wrong dough. We also appreciate your kind words about our colleague at the till.",
      },
      concise: {
        pl: "Przepraszamy za chłodną pizzę i niewłaściwe ciasto. Zweryfikujemy realizację zamówienia.",
        en: "We are sorry about the cool pizza and incorrect dough. We will review how the order was prepared.",
      },
      casual: {
        pl: "Chłodna pizza na innym cieście to podwójna wpadka. Przepraszamy — sprawdzimy realizację tego zamówienia.",
        en: "A cool pizza on the wrong dough is a double miss. Sorry — we will review how this order was handled.",
      },
    },
  },
  {
    id: "N3",
    rating: 1,
    age: { pl: "3 miesiące temu", en: "3 months ago" },
    category: "caution",
    initialStatus: "new",
    review: {
      pl: "W zamówieniu na wynos kilka składników nie zgadzało się z ustaleniami, mimo że specjalną prośbę podałam wyraźnie. To było duże rozczarowanie.",
      en: "Several ingredients in my takeaway order did not match what we agreed, even though I stated the special request clearly. It was very disappointing.",
    },
    detail: { pl: "Pomylone składniki", en: "Incorrect ingredients" },
    replies: {
      warm: {
        pl: "Bardzo przepraszamy za niezgodności w zamówieniu. Specjalna prośba powinna zostać dokładnie przekazana i zrealizowana. Prosimy o kontakt z lokalem, abyśmy mogli ustalić szczegóły i właściwie wyjaśnić sprawę.",
        en: "We are very sorry the order did not match your request. A special instruction should be recorded and followed carefully. Please contact the restaurant so we can confirm the details and resolve this properly.",
      },
      concise: {
        pl: "Przepraszamy za pomyłki w składnikach. Taka sytuacja nie powinna mieć miejsca; chcemy sprawdzić realizację zamówienia.",
        en: "We are sorry about the incorrect ingredients. This should not happen and we want to review how the order was prepared.",
      },
      casual: {
        pl: "Specjalna prośba powinna dotrzeć na pizzę dokładnie tak, jak została podana. Przepraszamy za pomyłki — chcemy sprawdzić to zamówienie.",
        en: "A special request should make it onto the pizza exactly as given. Sorry for the mix-ups — we want to look into this order.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Przepraszamy, że zamówienie nie uwzględniło przekazanej prośby. Chcemy sprawdzić szczegóły i wyjaśnić, gdzie doszło do pomyłki.",
        en: "We are sorry the order did not follow your stated request. We want to review the details and understand where the mistake happened.",
      },
      concise: {
        pl: "Przepraszamy za niezgodność składników z zamówieniem. Sprawdzimy ten przypadek.",
        en: "We are sorry the ingredients did not match the order. We will review this case.",
      },
      casual: {
        pl: "Wyraźna prośba nie powinna zniknąć po drodze. Przepraszamy za pomyłki i sprawdzimy zamówienie.",
        en: "A clear request should not get lost along the way. Sorry about the mistakes — we will review the order.",
      },
    },
  },
  {
    id: "C1",
    rating: 1,
    age: { pl: "tydzień temu", en: "1 week ago" },
    category: "caution",
    initialStatus: "context",
    review: {
      pl: "Sama pizza zwykle nam smakuje, ale ostatnio dostawa była zimna i spóźniona. Wcześniej mieliśmy też nieprzyjemną sytuację z obsługą, a próba wyjaśnienia sprawy nic nie dała.",
      en: "We usually enjoy the pizza, but our last delivery was cold and late. We also had an unpleasant service issue before, and trying to resolve it led nowhere.",
    },
    detail: { pl: "Kilka połączonych zdarzeń", en: "Several linked incidents" },
    replies: {
      warm: {
        pl: "Dziękujemy za ponowny sygnał i przepraszamy za opóźnioną, zimną dostawę oraz brak skutecznego wyjaśnienia. Chcemy najpierw sprawdzić historię kontaktu, aby rzetelnie odnieść się do całej sprawy.",
        en: "Thank you for raising this again. We are sorry about the late, cold delivery and the lack of a proper resolution. We first want to check the contact history so we can address the whole situation fairly.",
      },
      concise: {
        pl: "Przepraszamy za dostawę i brak skutecznego wyjaśnienia. Potrzebujemy sprawdzić wcześniejszy kontakt, zanim odniesiemy się do szczegółów.",
        en: "We are sorry about the delivery and the lack of resolution. We need to review the earlier contact before responding to the details.",
      },
      casual: {
        pl: "To nie wygląda na pojedynczą wpadkę, dlatego nie chcemy odpowiadać ogólnikiem. Przepraszamy i najpierw sprawdzimy całą historię kontaktu.",
        en: "This does not sound like a single slip-up, so we do not want to reply with a stock phrase. We are sorry and will review the full contact history first.",
      },
    },
    alternateReplies: {
      warm: {
        pl: "Bardzo nam przykro z powodu zimnej i spóźnionej dostawy oraz braku skutecznego rozwiązania wcześniejszej sprawy. Zweryfikujemy historię kontaktu przed udzieleniem szczegółowej odpowiedzi.",
        en: "We are very sorry about the cold, late delivery and the lack of resolution to the earlier issue. We will review the contact history before responding in detail.",
      },
      concise: {
        pl: "Przepraszamy za dostawę i brak rozwiązania sprawy. Najpierw sprawdzimy historię kontaktu.",
        en: "We are sorry about the delivery and unresolved issue. We will review the contact history first.",
      },
      casual: {
        pl: "Tu trzeba sprawdzić więcej niż jedną rzecz. Przepraszamy — wrócimy do całej historii kontaktu, zanim odpowiemy szczegółowo.",
        en: "There is more than one thing to check here. Sorry — we will review the full contact history before responding in detail.",
      },
    },
    managerContext: {
      example: {
        pl: "Potwierdzono opóźnienie dostawy. Wcześniejsza wiadomość nie trafiła do osoby prowadzącej zmianę. Manager zaproponuje ponowne przygotowanie zamówienia.",
        en: "The delivery delay was confirmed. The earlier message did not reach the shift manager. The manager will offer to remake the order.",
      },
      replies: {
        warm: {
          pl: [
            "Dziękujemy za ponowny sygnał. Potwierdziliśmy opóźnienie, a wcześniejsza wiadomość nie dotarła do osoby prowadzącej zmianę. Manager skontaktuje się z Państwem i zaproponuje ponowne przygotowanie zamówienia.",
            "Przepraszamy za opóźnioną i zimną dostawę oraz brak właściwej reakcji. Wiemy już, że wiadomość nie trafiła do managera zmiany; skontaktujemy się, aby zaproponować ponowne przygotowanie zamówienia.",
          ],
          en: [
            "Thank you for raising this again. We confirmed the delay, and the earlier message did not reach the shift manager. The manager will contact you and offer to remake the order.",
            "We are sorry about the late, cold delivery and the lack of a proper response. We now know the message did not reach the shift manager; we will contact you and offer to remake the order.",
          ],
        },
        concise: {
          pl: [
            "Potwierdziliśmy opóźnienie i błąd w przekazaniu wiadomości. Manager skontaktuje się w sprawie ponownego przygotowania zamówienia.",
            "Przepraszamy za opóźnienie i brak reakcji. Manager otrzymał sprawę i zaproponuje ponowne przygotowanie zamówienia.",
          ],
          en: [
            "We confirmed the delay and a failure to pass on the message. The manager will contact you about remaking the order.",
            "We are sorry about the delay and lack of response. The manager now has the case and will offer to remake the order.",
          ],
        },
        casual: {
          pl: [
            "Sprawdziliśmy, co zawiodło: dostawa się spóźniła, a wiadomość nie dotarła do managera zmiany. Skontaktujemy się i zaproponujemy przygotowanie zamówienia ponownie.",
            "To nie powinno było tak wyglądać. Potwierdziliśmy opóźnienie i problem z przekazaniem wiadomości; manager zaproponuje ponowne przygotowanie zamówienia.",
          ],
          en: [
            "We checked what went wrong: the delivery was late and the message did not reach the shift manager. We will contact you and offer to remake the order.",
            "This should not have happened. We confirmed the delay and the missed message; the manager will offer to remake the order.",
          ],
        },
      },
    },
  },
];
