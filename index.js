import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

const app = express();
const PORT = 3000;

// Middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Ingredient Categories
const ingredientCategories = {
  Proteins: ["Chicken", "Beef", "Fish", "Tofu", "Eggs", "Pork", "Lamb"],
  Carbohydrates: ["Rice", "Bread", "Pasta", "Potato", "Quinoa", "Oats"],
  Vegetables: ["Carrots", "Spinach", "Broccoli", "Tomato", "Pepper", "Cabbage"],
  Aromatics: ["Garlic", "Onion", "Ginger", "Shallots", "Leek"],
  Seasonings: ["Salt", "Pepper", "Paprika", "Cumin", "Cinnamon", "Turmeric"],
  Fats: ["Olive Oil", "Butter", "Coconut Oil", "Lard", "Ghee", "Sunflower Oil"],
};

// Persistent storage for ingredients
let categorizedIngredients = {
  Proteins: [],
  Carbohydrates: [],
  Vegetables: [],
  Aromatics: [],
  Seasonings: [],
  Fats: [],
  Unknown: [],
};

// Function to categorize an ingredient
const categorizeIngredient = (ingredient) => {
  let formattedInput = ingredient
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  //   console.log(`Formatted Input: "${formattedInput}"`); // Debugging

  for (const category in ingredientCategories) {
    for (const item of ingredientCategories[category]) {
      if (item === formattedInput) {
        return { name: formattedInput, category };
      }
    }
  }
  return { name: formattedInput, category: "Unknown" };
};

async function getMeals(userIngredients) {
  if (userIngredients.length === 0) {
    return { meals: null, error: "No ingredients added!" };
  }

  let meals = [];

  for (const ingredient of userIngredients) {
    try {
      const response = await axios.get(
        `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`
      );
      if (response.data.meals) {
        console.log(response.data);
        meals.push(...response.data.meals);
      }
    } catch (error) {
      console.error(`Error fetching recipes for ${ingredient}:`, error.message);
    }
  }

  // Remove duplicates (in case multiple ingredients returned the same meal)
  meals = [...new Map(meals.map((meal) => [meal.idMeal, meal])).values()];

  // Fetch detailed meal ingredients
  const mealDetailsPromises = meals.map(async (meal) => {
    try {
      const response = await axios.get(
        `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${meal.idMeal}`
      );
      const mealDetails = response.data.meals[0];

      // Extract the ingredients from the meal details
      const mealIngredients = [];
      for (let i = 1; i <= 20; i++) {
        if (mealDetails[`strIngredient${i}`]) {
          mealIngredients.push(mealDetails[`strIngredient${i}`]);
        }
      }

      meal.ingredients = mealIngredients;
      meal.hasIngredients = mealIngredients.filter((ingredient) =>
        userIngredients.includes(ingredient)
      ).length;
      meal.needsIngredients = mealIngredients.length - meal.hasIngredients;

      return meal;
    } catch (error) {
      console.error(
        `Error fetching meal details for ${meal.idMeal}:`,
        error.message
      );
      return meal; // Return the meal even if there's an error in fetching details
    }
  });

  // Wait for all meal details to be fetched
  meals = await Promise.all(mealDetailsPromises);

  // Sort meals by hasIngredients in descending order
  meals.sort((a, b) => b.hasIngredients - a.hasIngredients);

  return { meals, error: null };
}

// Homepage
app.get("/", (req, res) => {
  res.render("home", { categorizedIngredients });
});

app.get("/recipes", async (req, res) => {
  const userIngredients = Object.values(categorizedIngredients).flat();
  const { meals, error } = await getMeals(userIngredients);

  res.render("recipes", {
    meals,
    categorizedIngredients,
    userIngredients,
    error,
  });
});

// Search route
app.post("/submit", async (req, res) => {
  const ingredients = req.body.ingredients.split(",").map((ing) => ing.trim());

  ingredients.forEach((ingredient) => {
    const categorized = categorizeIngredient(ingredient);
    if (categorized.category in categorizedIngredients) {
      categorizedIngredients[categorized.category].push(categorized.name);
    }
  });

  console.log(categorizedIngredients);
  // Now check for the page the request came from
  const referer = req.get("referer");

  // If referer includes '/recipes', we are in recipes page
  if (referer && referer.includes("/recipes")) {
    return res.redirect("recipes");
  } else {
    return res.render("home", { categorizedIngredients });
  }
});

// Delete Ingredients
app.post("/delete-ingredient", async (req, res) => {
  const { ingredient, category } = req.body; // Get the ingredient and category to delete

  // Remove the ingredient from the categorizedIngredients object
  if (categorizedIngredients[category]) {
    const index = categorizedIngredients[category].indexOf(ingredient);
    if (index > -1) {
      categorizedIngredients[category].splice(index, 1); // Remove ingredient
    }
  }

  console.log(categorizedIngredients);

  // Recalculate user ingredients
  const userIngredients = Object.values(categorizedIngredients).flat();
  const { meals, error } = await getMeals(userIngredients); // Use getMeals function to fetch meals

  // Now check for the page the request came from
  const referer = req.get("referer");

  // If referer includes '/recipes', we are in recipes page
  if (referer && referer.includes("/recipes")) {
    return res.redirect("recipes");
  } else {
    return res.render("home", { categorizedIngredients });
  }
});

app.post("/test", async (req, res) => {
  const ingredient = req.body.ingredient;
  if (!ingredient) {
    return res.render("home", {
      meals: null,
      nutrition: null,
      error: "Please enter an ingredient!",
    });
  }

  //   try {
  //     // 🍽️ TheMealDB API - Get Recipes
  //     const mealResponse = await axios.get(
  //       `https://www.themealdb.com/api/json/v1/1/filter.php?i=${ingredient}`
  //     );
  //     const meals = mealResponse.data.meals;

  //     if (!meals) {
  //       return res.render("index", {
  //         meals: null,
  //         nutrition: null,
  //         error: `No recipes found with "${ingredient}".`,
  //       });
  //     }

  //     console.log("CalorieNinjas API Key:", process.env.CALORIENINJAS_API_KEY);

  //     // 🥦 CalorieNinjas API - Get Nutrition Data
  //     const nutritionResponse = await axios.get(
  //       `https://api.calorieninjas.com/v1/nutrition?query=${ingredient}`,
  //       {
  //         headers: { "X-Api-Key": process.env.CALORIENINJAS_API_KEY },
  //       }
  //     );

  //     const nutrition = nutritionResponse.data.items;

  //     res.render("index", { meals, nutrition, error: null });
  //   } catch (error) {
  //     console.error("Error fetching data:", error.message);
  //     res.render("index", {
  //       meals: null,
  //       nutrition: null,
  //       error: "An error occurred while searching.",
  //     });
  //   }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
