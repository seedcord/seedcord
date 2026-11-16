greeting = Hallo { $username }
total = { $count ->
    [one] Insgesamt ein Eintrag
   *[other] Insgesamt { $count } Einträge
}
# the base file calls this greeting
greting = Tippfehler
items = { $count ->
    [one] ein
    [other] viele
}
ping = Ping
    .title = Ping
    .tooltip = extra
welcome = Willkommen bei { -brand }
-full = { -brand } Bot
