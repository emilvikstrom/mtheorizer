# mtheorizer

En webapp för att slå upp musikteori. Välj ackord eller skala, en grundton (C, C♯/D♭, D …) och dur eller moll. Appen visar tonerna, korrekt stavade, och markerar dem på ett pianotangentbord eller, om man växlar visning, på en gitarrhals.

Fliken **Circle of fifths** visar kvintcirkeln. Välj en tonart för att se dess förtecken, skala, diatoniska ackord och närliggande tonarter.

## Kom igång

Det enda som krävs är Docker (till exempel Docker Desktop).

```bash
docker compose up --build
```

Öppna sedan http://localhost:8080.

## Utveckling

```bash
docker compose --profile dev up dev     # Vite med hot reload på http://localhost:5173
docker compose run --rm dev npm test    # kör testerna
```

`docker compose build` kör typkontroll och alla tester innan produktionsbygget görs.

## Planering

- [docs/ROADMAP.md](docs/ROADMAP.md) – milstolpar och status
- [docs/BACKLOG.md](docs/BACKLOG.md) – små uppgifter, nästa på tur överst
- [CLAUDE.md](CLAUDE.md) – arbetsflöde, struktur och konventioner
