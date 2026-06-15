import ModeScreen from "./ModeScreen";

export default function ArenaTournament() {
  return (
    <ModeScreen
      mode="tournament"
      title="Tournament Cup"
      eyebrow="Bracket Path"
      icon="medal-outline"
      accent="navy"
      subtitle="A serious championship format prepared for qualifiers, semifinals, finals, and seasonal crowns."
      startLabel="Start Cup Qualifier"
      rules={[
        "One active Cup match at a time.",
        "Lose or forfeit once and the Cup ends.",
        "Leave and return: Continue Cup Match or Forfeit Tournament.",
        "Win Qualifier → Semifinal → Final to become Cup Champion.",
      ]}
    />
  );
}
