document.getElementById("addButton").addEventListener("click", function (e) {
  const inputField = document.getElementById("ingredientInput");

  // Check if there's input
  if (inputField.value.trim() === "") {
    // Prevent form submission and change placeholder text
    e.preventDefault();
    inputField.placeholder = "Please enter an ingredient!";
  }
});

// // Client-side JavaScript to handle UI update for deleting ingredients
// document.querySelectorAll(".delete-btn").forEach((button) => {
//   button.addEventListener("click", async (event) => {
//     const ingredient = event.target.dataset.ingredient;
//     const category = event.target.dataset.category;

//     // Send DELETE request to the server
//     const response = await fetch("/delete-ingredient", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ ingredient, category }),
//     });

//     // Remove the item from the UI if the delete was successful
//     if (response.ok) {
//       event.target.parentElement.remove(); // Remove the ingredient element
//     }
//   });
// });
