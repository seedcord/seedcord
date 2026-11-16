greet = Hello { $name }!
roundtrip = Roundtrip **{ NUMBER($ms) }ms**
uptime = Up for **{ $seconds ->
    [one] { $seconds } second
   *[other] { $seconds } seconds
}**
asked-in = Asked in **{ $locale }**
profile = Profile for { $tag }, on Discord since { $joined }.
    .title = { $tag }'s profile
profile-cooldown = Slow down. You can view another profile { $when }.
