greet = Hello { $name }!
roundtrip = Roundtrip **{ NUMBER($ms) }ms**
uptime = Up for **{ $seconds ->
    [one] { $seconds } second
   *[other] { $seconds } seconds
}**
pings = Pinged **{ $count ->
    [one] once
   *[other] { $count } times
}**
asked-in = Asked in **{ $locale }**
roll = { $actor } rolled **{ $value }** on a d{ $sides }
roll-again = Roll again
