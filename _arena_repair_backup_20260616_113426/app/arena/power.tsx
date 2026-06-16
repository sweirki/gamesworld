import ModeScreen from "./ModeScreen";

export default function ArenaPower() {
  return (
    <ModeScreen
      mode="power"
      title="Power Arena"
      eyebrow="Strategy Rules"
      icon="sparkles-outline"
      accent="purple"
      subtitle="A premium competitive ruleset designed around limited assists and smart decisions."
      startLabel="Start Power Arena"
      rules={[
        "One active Power run at a time.",
        "Power loadout: Reveal Cell, Shield, and Time Freeze — one use each.",
        "Leave and return: Continue Power Run or Forfeit.",
        "Fast play matters, but controlled mistakes and smart assists matter more.",
      ]}
    />
  );
}
