-brand = seedcord

greeting = Cześć { $user }, witaj w { -brand }
items = { $count ->
    [one] Masz { $count } przedmiot
    [few] Masz { $count } przedmioty
   *[many] Masz { $count } przedmiotów
}
role = { $user } jest { $role ->
    [admin] administratorem
    [mod] moderatorem
    [owner] właścicielem
   *[other] członkiem
}
email-field = E-mail
