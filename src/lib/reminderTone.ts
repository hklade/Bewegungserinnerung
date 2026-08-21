export async function playReminderTone() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  const context = new AudioContextClass();
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // Some browsers still require a trusted user gesture; in that case we fall through.
    }
  }

  const master = context.createGain();
  master.connect(context.destination);
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.5, context.currentTime + 0.16);

  const notePlan = [
    { offset: 0.0, frequency: 784, duration: 0.5, type: "sine" as const },
    { offset: 0.6, frequency: 659, duration: 0.5, type: "sine" as const },
    { offset: 1.1, frequency: 988, duration: 1, type: "triangle" as const },
  ];

  notePlan.forEach(({ offset, frequency, duration, type }, index) => {
    const oscillator = context.createOscillator();
    const noteGain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime + offset,
    );

    oscillator.connect(noteGain);
    noteGain.connect(master);
    noteGain.gain.setValueAtTime(0.0001, context.currentTime + offset);
    noteGain.gain.exponentialRampToValueAtTime(
      index === 2 ? 0.18 : 0.12,
      context.currentTime + offset + 0.045,
    );
    noteGain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + offset + duration,
    );
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + duration + 0.03);
  });

  window.setTimeout(() => void context.close(), 1600);
}
