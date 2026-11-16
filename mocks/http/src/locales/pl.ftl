greet = Cześć { $name }!
roundtrip = Czas odpowiedzi **{ NUMBER($ms) }ms**
uptime = Działa od **{ $seconds ->
    [one] { $seconds } sekundy
   *[other] { $seconds } sekund
}**
pings = Pingów: **{ $count }**
asked-in = Zapytano w **{ $locale }**
roll = { $actor } wyrzucił **{ $value }** na k{ $sides } (#{ $count })
roll-again = Rzuć jeszcze raz
