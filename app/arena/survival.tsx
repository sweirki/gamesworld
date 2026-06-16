import ModeScreen from "./ModeScreen";

export default function ArenaSurvival() {
  return (
    <ModeScreen
      mode="survival"
      title="Survival Run"
      eyebrow="Pressure Run"
      icon="flame-outline"
      accent="gold"
      subtitle="Climb stage by stage. One mistake ends the run, but every clean board pushes your streak higher."
      startLabel="Start Survival Run"
      rules={[
        "One active Survival run at a time.",
        "Clear each board to advance the run.",
        "One wrong answer ends the run.",
        "Continue an active run or end it cleanly.",
      ]}
    />
  );
}
