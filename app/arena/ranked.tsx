import ModeScreen from "./ModeScreen";

export default function ArenaRanked() {
  return (
    <ModeScreen
      mode="ranked"
      title="Ranked Duel"
      eyebrow="Rating Match"
      icon="trophy-outline"
      accent="blue"
      subtitle="A clean one-board Arena duel where speed, accuracy, and composure decide rating."
      startLabel="Start Ranked Duel"
      rules={[
        "One active Arena match at a time.",
        "Leave and return: Continue Duel or Forfeit Duel.",
        "Three mistakes are allowed; the fourth mistake is defeat.",
        "Win condition: solve cleanly and beat the rival target time.",
      ]}
    />
  );
}
