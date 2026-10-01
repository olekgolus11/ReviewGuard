# Ślepe etykietowanie opinii

Lokalne narzędzie do przygotowania ludzkich etykiet referencyjnych dla eksportu opinii. Przedstawia treść opinii, ocenę, autora, lokalizację, datę i ewentualną odpowiedź właściciela. Nie pokazuje ani nie zachowuje predykcji, uzasadnień ani szkiców modelu.

## Uruchomienie

W katalogu repozytorium uruchom:

```sh
node tools/blind-review-labeler/server.mjs
```

Otwórz adres wypisany w terminalu. Serwer nasłuchuje wyłącznie na `127.0.0.1`; nie ma endpointu do wysyłania plików. Przeglądarka czyta wybrany JSON lokalnie. Dane etykietowania pozostają w pamięci strony i w `localStorage` dla tego lokalnego adresu. Użyj „Eksportuj etykiety”, aby zapisać kopię JSON. Nie czyść danych witryny przed eksportem.

Obsługiwane źródła:

- `{ "reviews": [...] }`
- eksport ReviewGuard: `{ "version": 1, "workspace": { "snapshot": { "id": "...", "location": ..., "reviews": [...] } } }`

Każda opinia musi mieć unikalne `id`, `reviewId` lub `googleReviewId`. Rozpoznawane pola źródłowe opisuje `source-contract.mjs`; dodatkowe pola są ignorowane. Obsługiwane są m.in. `author.name`, `ownerReply.text` i lokalizacja z migawki. Przykładowy plik `tools/blind-review-labeler/fixture.json` zawiera jawnie fikcyjne dane i fałszywe pola modelu do sprawdzenia, że pozostają ukryte.

## Etykiety i podział

- `reply` — warto przygotować odpowiedź
- `skip` — nie wymaga działania
- `human_review` — potrzebna ocena człowieka
- `report` — rozważyć zgłoszenie opinii

Każda etykieta wymaga ręcznego wyboru podziału `development` („Roboczy — do strojenia”) albo `held_out` („Kontrolny — bez strojenia”). Narzędzie nie przypisuje automatycznie podziału i nie narzuca progów. Panel pokrycia pokazuje wyłącznie liczebność bieżącej próbki; nie dowodzi ona reprezentatywności populacji opinii.

Etykieta jest zapisywana od razu po wyborze. Uzasadnienie i podział aktualizują zapis po zmianie. Postęp jest automatycznie zapisywany lokalnie, a identyczna próbka odzyskuje zapis po ponownym wczytaniu. Wznawianie z pliku etykiet sprawdza wersję, hash całego źródła, ID i fingerprint każdej opinii. Niezgodny lub nieobsługiwany plik jest odrzucany bez nadpisania bieżącego zapisu.

## Kontrakt eksportu etykiet

Eksport zawiera wyłącznie wersję, hash źródła oraz etykiety:

```json
{
  "version": 1,
  "datasetHash": "sha256 hex",
  "labels": [
    {
      "reviewId": "fixture-001",
      "fingerprint": "sha256 hex",
      "action": "reply",
      "split": "development",
      "reason": "opcjonalne uzasadnienie"
    }
  ]
}
```

Fingerprint opinii to SHA-256 z UTF-8 kanonicznego JSON obiektu `{ id, reviewer, rating, text, ownerResponse, location, locationId, locationAddress, title, media, date }`. Klucze obiektów są sortowane rekurencyjnie; wartości tablic zachowują kolejność. Hash zbioru to SHA-256 z UTF-8 kanonicznego JSON tablicy `[{ id, fingerprint }, ...]` w kolejności opinii z eksportu. Identyfikatory są ciągami znaków, a brakujące wartości źródłowe mają wartości zastępcze widoczne w `source-contract.mjs`. Zmiana widocznego tytułu, daty, lokalizacji lub kontekstu mediów unieważnia fingerprint. Żadne inne pola źródłowe nie wpływają na hash.

## Ręczne sprawdzenie

1. Uruchom serwer i wybierz `tools/blind-review-labeler/fixture.json`.
2. Potwierdź, że ekran pokazuje dwie fikcyjne opinie, a `THIS MUST NEVER...` i `modelPrediction` nie pojawiają się na ekranie.
3. Nadaj dwóm opiniom różne etykiety i podziały. Uzupełnij uzasadnienie jednej z nich.
4. Wyeksportuj JSON. Sprawdź, że zawiera tylko `version`, `datasetHash` oraz `labels`, w tym dokładnie `reviewId`, `fingerprint`, `action`, `split`, `reason` dla etykiet. Wyszukaj tekst `THIS MUST NEVER` w pliku — nie powinien wystąpić.
5. Wczytaj ten sam fixture ponownie. Postęp powinien wrócić z pamięci lokalnej. Zaimportuj wyeksportowany JSON i potwierdź komunikat o wznowieniu.
6. Zmień tekst fikcyjnej opinii w kopii fixture albo użyj innego zestawu, po czym spróbuj zaimportować poprzedni JSON. Import powinien zostać odrzucony jako niepasujący zestaw, a bieżące etykiety pozostać dostępne.
7. Zmień ID jednej opinii na powtórzone ID. Plik powinien zostać odrzucony przed otwarciem widoku etykiet.
