// Run the same ordered construction steps synchronously or cooperatively in the browser.
export function runLoadingSteps(steps, onStep = () => {}) {
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
    onStep(step.value);
  }
}
export async function runLoadingStepsAsync(steps, onStep = () => {}, yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0))) {
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
    onStep(step.value);
    await yieldToBrowser();
  }
}
