# Opinie Google: odpowiedzi, zgłoszenia i backtest

Stan: 1 października 2026. Wstępny research do planowania prototypu; rekomendacje poniżej nie stanowią jeszcze przyjętej polityki produktu.

## Co zaleca Google

Google zachęca do krótkich, uprzejmych, konkretnych odpowiedzi, które odnoszą się do doświadczenia klienta. Priorytet mają pytania, użyteczne wyjaśnienia i aktualizacje; nie trzeba kopiować podziękowania pod każdą opinią. Przy krytyce: empatia, przeprosiny gdy uzasadnione, uczciwe przedstawienie ograniczeń, bez ataków i ujawniania prywatnych danych. Złożone sprawy warto przenieść do kontaktu prywatnego. Odpowiedź nie powinna być reklamą ani obietnicą, której firma nie może spełnić. [Oficjalne wskazówki Google](https://support.google.com/business/answer/3474122).

Negatywna ocena ani niezgoda właściciela nie są podstawą usunięcia. Google usuwa naruszenia polityki, nie rozstrzyga zwykłych sporów między klientem a firmą; zgłoszenie może zakończyć się brakiem stwierdzonego naruszenia. [Zgłaszanie opinii](https://support.google.com/business/answer/4596773?hl=en).

Do potencjalnych naruszeń należą m.in. spam, doświadczenia zmyślone, konflikt interesów, podszywanie się, nękanie, groźby, mowa nienawiści, ujawnianie danych, reklama, treści niezwiązane z miejscem i powielanie. Słowa uznawane za wulgarne nie zawsze naruszają zasady: liczy się kontekst. Uprzejma krytyka doświadczenia jest dozwolona. Autentyczności doświadczenia, konfliktu interesów czy prawdziwości zarzutów często nie da się ustalić z samego tekstu. **Wniosek projektowy:** model wskazuje podejrzenie i konkretny fragment, a nie orzeka, że Google usunie opinię. [Polityka treści Google Maps](https://support.google.com/contributionpolicy/answer/7400114?hl=en).

## Proponowana polityka do uzgodnienia

Ocena gwiazdkowa jest kontekstem, nie regułą wyboru działania. Pięć gwiazdek może zawierać pytanie, a jedna gwiazdka bez opisu może nie dawać materiału na sensowną odpowiedź.

| Rekomendacja | Przykładowy powód |
| --- | --- |
| Odpowiedzieć | Konkretna skarga, pytanie, błąd do wyjaśnienia, mieszana opinia, szczegółowa pochwała z możliwością sensownej odpowiedzi |
| Pominąć | Same gwiazdki lub ogólnik bez treści, na który firma nie ma nic przydatnego do dodania |
| Sprawdzić z właścicielem | Reklamacja wymagająca faktów, niejasna ironia, poważny zarzut, sprzeczność między oceną a tekstem |
| Rozważyć zgłoszenie | Dostrzegalne naruszenie z kategorią i wskazanym fragmentem; bez automatycznej obietnicy usunięcia |

To propozycja produktu, nie wymagany przez Google podział. „Zgłosić” i „odpowiedzieć” nie muszą się wykluczać. Najczytelniej przechowywać osobno `replyRecommendation`, `reportRecommendation`, `needsOwnerContext`, krótkie uzasadnienie i dowody z opinii. Nie przedstawiać deklarowanej przez model pewności jako zmierzonego prawdopodobieństwa poprawności.

Generator powinien używać jedynie opinii i zatwierdzonych informacji firmy. Nie dopowiadać przebiegu wizyty, przeprowadzonych napraw, zwrotów ani kontaktu z klientem. Jeśli brakuje faktów, proponować szkic lub pytanie do właściciela. Przy istniejącej odpowiedzi wskazać „już odpowiedziano”; zmieniona opinia może wymagać ponownej oceny.

## Dane wejściowe importu

Schemat oficjalnego Business Profile obejmuje identyfikator opinii, autora, gwiazdki, treść, daty utworzenia i aktualizacji, odpowiedź właściciela oraz media (zdjęcia/wideo). Nie ma osobnego pola tytułu opinii. **Wniosek:** `title` powinien być opcjonalny i pusty, kiedy źródło go nie udostępnia; wygenerowany tytuł należy oznaczyć jako pochodny. [Schemat Review](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews).

Places API (New) zwraca maksymalnie pięć opinii uporządkowanych według istotności. Nie jest to pełna historia ani reprezentatywny zbiór do backtestu. [Places API: Place](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places). Business Profile ma paginowane pobieranie opinii dla zweryfikowanej lokalizacji i wymaga autoryzacji. To fakt o możliwej przyszłej integracji, nie powód dodawania weryfikacji właściciela do prototypu. [Lista opinii](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list).

Nie udało się odczytać wskazanego skrótu [Indian Tadka](https://maps.app.goo.gl/iiTFPteqkQf545PH8) narzędziem web; środowisko shell nie rozwiązało jego hosta DNS. Nie potwierdzono rzeczywistych pól ani kompletności danych tego miejsca. Opis schematu powyżej dotyczy oficjalnych API, **nie gwarantuje pól dostępnych w publicznym interfejsie lub scraperze**.

Proponowany kontrakt scrapera: zidentyfikowane miejsce i jego URL; ID/URL opinii, autor, ocena, oryginalny tekst i ewentualne tłumaczenie, dostępne daty, media wraz z typem/URL, istniejąca odpowiedź; osobno czas pobrania, sortowanie, liczba pobranych opinii, liczba deklarowana przez Google i przyczyna przerwania. Brak danych oznaczać jako brak, nie odgadywać. Zabezpieczyć deduplikację i odróżniać zdjęcia miejsca od mediów konkretnej opinii.

## Proponowany backtest

1. Dwie osoby niezależnie oznaczają zamrożony zbiór: odpowiedź, zgłoszenie i potrzebny kontekst. Rozbieżności omawiają; nierozstrzygalne przypadki pozostają niepewne.
2. Próba obejmuje różne oceny, brak tekstu, krytykę, pochwały, języki, ironię, media, istniejące odpowiedzi i podejrzenia naruszeń; raport ujawnia sposób doboru.
3. Oddzielić przykłady użyte do ustawiania promptu od końcowego zbioru testowego. Po każdej zmianie promptu/modelu zachować wyniki i wersję konfiguracji.
4. Raportować macierz pomyłek, precision/recall dla „odpowiedzieć” i „zgłosić”, odsetek eskalacji do człowieka oraz konkretne błędy. Samo accuracy ukrywa rzadkie, kosztowne pomyłki.
5. Jakość odpowiedzi oceniać osobno: poprawność faktów, odniesienie do opinii, ton, użyteczność, prywatność i brak nieuzasadnionych obietnic. Istniejąca odpowiedź właściciela nie jest automatycznie wzorcem poprawności.

To propozycja eksperymentu. Kryteria sukcesu, koszt pominiętej skargi i koszt błędnego zgłoszenia wymagają decyzji właścicieli produktu.
