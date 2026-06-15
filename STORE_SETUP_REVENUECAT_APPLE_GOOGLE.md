# Store Setup - Apple, Google, RevenueCat

## Product IDs to Create

Use the exact same product IDs in Apple App Store Connect, Google Play Console, RevenueCat, and the code.

```text
sweirki_plus_lifetime
logic_wars_pass
arena_tickets_10
champion_bundle
```

## Apple App Store Connect

Apple supports creating consumable and non-consumable in-app purchases in App Store Connect. For each product, go to Monetization > In-App Purchases, add a product, choose Consumable or Non-Consumable, then set reference name, product ID, pricing, localization, review screenshot, and submit with the app version when required.

Recommended Apple product types:

- `sweirki_plus_lifetime`: Non-Consumable
- `logic_wars_pass`: Non-Consumable for Season 1, or Non-Renewing Subscription if you want duration semantics later
- `arena_tickets_10`: Consumable
- `champion_bundle`: Consumable

## Google Play Console

Google Play supports one-time in-app products for virtual goods and premium services.

Recommended Google product types:

- `sweirki_plus_lifetime`: One-time in-app product / managed product
- `logic_wars_pass`: One-time in-app product for the season
- `arena_tickets_10`: Consumable in-app product
- `champion_bundle`: Consumable in-app product

Before real Android testing, upload a build to an internal/closed test track so Play Billing products can resolve.

## RevenueCat

RevenueCat uses Products, Offerings, Packages, and Entitlements. Entitlements represent access rights unlocked after purchase.

Create/import products:

```text
sweirki_plus_lifetime
logic_wars_pass
arena_tickets_10
champion_bundle
```

Create entitlements:

```text
premium
season_pass
```

Attach:

- `sweirki_plus_lifetime` -> entitlement `premium`
- `logic_wars_pass` -> entitlement `season_pass`
- `arena_tickets_10` -> no entitlement, consumable reward handled by app ledger
- `champion_bundle` -> no entitlement, consumable reward handled by app ledger

Create current offering with packages:

```text
premium_lifetime
logic_wars_pass
arena_tickets_10
champion_bundle
```

## Testing Checklist

1. Apple sandbox user can buy/restore Premium.
2. Apple sandbox user can buy consumable ticket pack repeatedly.
3. Google internal tester can load products.
4. Google tester can buy consumables repeatedly.
5. RevenueCat customer info shows `premium` after lifetime purchase.
6. RevenueCat customer info shows `season_pass` after Logic Wars Pass.
7. App grants Coins/Tickets/cosmetics once per completed purchase event.
8. Restore does not duplicate consumable rewards.
9. Rewarded ads are optional and never appear during gameplay.

## Official References

- Apple: Create consumable or non-consumable In-App Purchases in App Store Connect.
- Google: Create an in-app product in Play Console.
- RevenueCat: Entitlements and product/offering/package concepts.
