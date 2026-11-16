-brand = seedcord

greeting = Hello { $user }, welcome to { -brand }
items = { $count ->
    [one] You have { $count } item
   *[other] You have { $count } items
}
role = { $user } is { $role ->
    [admin] an admin
    [mod] a moderator
   *[other] a member
}
ping-reply = Pong! { NUMBER($ms) }ms
label =
    .title = Label
welcome-back = { greeting }. Glad you're back
email-field = Email
    .placeholder = you@{ $domain }
