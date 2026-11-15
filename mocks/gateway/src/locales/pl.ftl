greet = Cześć { $name }!
roundtrip = Czas odpowiedzi **{ NUMBER($ms) }ms**
uptime = Działa od **{ $seconds ->
    [one] { $seconds } sekundy
    [few] { $seconds } sekund
   *[many] { $seconds } sekund
}**
asked-in = Zapytano w **{ $locale }**
profile = Profil { $tag }, na Discordzie od { $joined }.
profile-cooldown = Zwolnij. Kolejny profil możesz zobaczyć { $when }.
