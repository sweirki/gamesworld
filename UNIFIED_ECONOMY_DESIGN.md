# Sweirki Sudoku Unified Economy System

## Economy goal
The original app had a simple premium model: one-time Premium unlocks advanced boards and premium access. Arena added XP, Arena Points, Tickets, badges, and season progress. The unified system keeps the app clean by using only three practical currencies plus Premium/Pass purchases.

## Currency map

### Coins
App-wide soft currency.

Earned from:
- Classic wins
- Daily / Weekly clears
- Premium variants
- Arena wins
- Tournament champion moments
- Rewarded ads
- Premium daily bonus

Spent on:
- Extra Survival runs
- future cosmetic shop items
- future hint refills / retry tokens
- non-competitive quality-of-life purchases

### Tickets
Premium entry currency.

Earned from:
- starter wallet
- weekly / major rewards
- Tournament champion reward
- Sweirki Plus daily bonus
- purchases
- Season Pass

Spent on:
- Tournament Cup entries after the free daily entry
- future Elite Cups / Weekend Cups

### Arena Points
Competitive prestige currency.

Earned only from official Arena results.

Spent on:
- Arena cosmetics
- badges / frames / titles
- season prestige unlocks

Important: Arena Points are not sold directly. This protects competitive fairness.

## Entry rules

- Ranked Duel: free forever.
- Power Arena: free entry; power charges are strategy, not paid wins.
- Survival: first daily run free. Extra runs cost Coins.
- Tournament Cup: first daily cup free. Extra cup entries cost Tickets.

## Premium / monetization model

### Sweirki Plus Lifetime
One-time purchase. Keeps original Premium value and adds economy benefits:
- no ads
- premium boards
- premium leaderboards
- daily bonus: +150 Coins and +1 Ticket
- premium season value
- exclusive badge/frame hooks

### Ticket Pack
Consumable package for Tournament players.

### Champion Bundle
High-value consumable bundle:
- Coins
- Tickets
- champion frame / crown badge hooks

### Logic Wars Season Pass
Season monetization:
- premium reward track
- cosmetics
- tickets
- coins
- profile prestige

## Anti-pay-to-win rules

Never sell:
- rating
- wins
- leaderboard score
- Arena Points directly
- league promotion
- puzzle difficulty advantage

Allowed to sell:
- Premium access
- Tickets
- Coins
- cosmetics
- Season Pass
- event access

## Implemented files

- `src/economy/economyEngine.ts`
- `app/shop.tsx`
- `src/hooks/useRevenueCat.ts`
- `src/game/onGameFinished.ts`
- `src/arena/arenaEngine.ts`
- `app/arena/ModeScreen.tsx`
- `app/arena/index.tsx`
- `app/upgrade.tsx`
- `app/_layout.tsx`

## Device QA required

Test after installing on device:
- wallet shows starter Coins/Tickets
- Classic win grants Coins
- Daily win grants Coins
- Ranked entry is free
- Survival first run is free
- extra Survival charges Coins
- Tournament first daily entry is free
- extra Tournament charges Tickets
- insufficient currency sends player to Shop
- Sweirki Plus daily bonus grants once per day
- rewarded ad grants +120 Coins and caps after daily limit
- RevenueCat products show prices when configured
