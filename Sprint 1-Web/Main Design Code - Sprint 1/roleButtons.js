// roleButtons.js
// Makes the Broker / Bank Underwriter buttons work like a choice:
// clicking one selects it and unselects the other.
// Returns a function that gives the selected role (or null).
export function setUpRoleButtons() {
  let selected = null;
  const buttons = document.querySelectorAll(".roles button");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      selected = button.dataset.role;
      buttons.forEach(b => b.classList.toggle("selected", b === button));
    });
  });

  return () => selected;
}
