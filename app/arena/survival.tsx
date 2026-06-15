import ModeScreen from "./ModeScreen";

export default function ArenaSurvival() {
  return (
    <ModeScreen
      mode="survival"
      title="Survival Run"
      eyebrow="Streak Pressure"
      icon="flame-outline"
      accent="gold"
      subtitle="A pressure format built for streaks. Stay clean, stay fast, and keep the run alive."
      startLabel="Start Survival Run"
      rules={[
        "One active Survival run at a time.",
        "One wrong answer ends the run immediately.",
        "Leave and return: Continue Run or End Run.",
        "Clear a stage to advance Easy → Medium → Hard.",
      ]}
    />
  );
}
