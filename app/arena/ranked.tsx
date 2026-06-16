import ModeScreen from "./ModeScreen";

export default function ArenaRanked() {
  return (
    <ModeScreen
      mode="ranked"
      title="Ranked Duel"
      eyebrow="Bronze Division"
      icon="trophy-outline"
      accent="blue"
      subtitle="One official rated board. Protect your score, beat the rival target, and climb toward the next tier."
      startLabel="Start Rated Match"
      rules={[
        "One official ranked board decides the match.",
        "Win by solving cleanly and beating the rival target.",
        "Your rating moves after the result: win to climb, lose to defend.",
        "You can continue an active duel, but abandoning it counts as a forfeit.",
      ]}
    />
  );
}
