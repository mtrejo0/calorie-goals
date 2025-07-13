"use client"

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Calculator, Target } from 'lucide-react';
import foodDatabase from '../data/foodDatabase.json';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const NutritionApp = () => {
  const [dailyCalories, setDailyCalories] = useState(1600);
  const [macroSplit, setMacroSplit] = useState({
    protein: 30,
    carbs: 40,
    fat: 30
  });
  const [currentPlate, setCurrentPlate] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFood, setSelectedFood] = useState('');
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [recipes, setRecipes] = useState([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [sortBy, setSortBy] = useState('calories');
  const [sortOrder, setSortOrder] = useState('asc');
  const [graphXAxis, setGraphXAxis] = useState('protein');
  const [graphYAxis, setGraphYAxis] = useState('calories');

  // Pre-populate plate with default foods on component mount
  useEffect(() => {
    const defaultPlate = [
      {
        id: Date.now(),
        food: 'chicken_breast',
        name: foodDatabase.chicken_breast.name,
        amount: 250,
        ...calculateNutrition('chicken_breast', 250)
      },
      {
        id: Date.now() + 1,
        food: 'potato',
        name: foodDatabase.potato.name,
        amount: 150,
        ...calculateNutrition('potato', 150)
      }
    ];
    setCurrentPlate(defaultPlate);
  }, []);

  // Generate variations when currentPlate changes and has items
  useEffect(() => {
    if (currentPlate.length > 0) {
      const variations = generateRecipeVariations();
      setRecipes(variations);
      setShowRecipes(true);
    }
  }, [currentPlate]);

  // Calculate nutrition for a food item
  const calculateNutrition = (foodKey, amount) => {
    const food = foodDatabase[foodKey];
    if (!food) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    const multiplier = amount / 100;
    return {
      calories: Math.round(food.calories * multiplier),
      protein: Math.round(food.protein * multiplier * 10) / 10,
      carbs: Math.round(food.carbs * multiplier * 10) / 10,
      fat: Math.round(food.fat * multiplier * 10) / 10
    };
  };

  // Add food to current plate
  const addToPlate = () => {
    if (selectedFood && selectedAmount > 0) {
      const nutrition = calculateNutrition(selectedFood, selectedAmount);
      const newItem = {
        id: Date.now(),
        food: selectedFood,
        name: foodDatabase[selectedFood].name,
        amount: selectedAmount,
        ...nutrition
      };
      setCurrentPlate([...currentPlate, newItem]);
      setSelectedFood('');
      setSelectedAmount(100);
      setSearchTerm('');
    }
  };

  // Remove from plate
  const removeFromPlate = (id) => {
    setCurrentPlate(currentPlate.filter(item => item.id !== id));
  };

  // Calculate total nutrition
  const calculateTotalNutrition = () => {
    return currentPlate.reduce((total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Calculate target macros in grams
  const calculateTargetMacros = () => {
    const proteinCals = (dailyCalories * macroSplit.protein) / 100;
    const carbsCals = (dailyCalories * macroSplit.carbs) / 100;
    const fatCals = (dailyCalories * macroSplit.fat) / 100;
    
    return {
      protein: Math.round(proteinCals / 4), // 4 calories per gram
      carbs: Math.round(carbsCals / 4), // 4 calories per gram
      fat: Math.round(fatCals / 9) // 9 calories per gram
    };
  };

  // Generate recipe variations
  const generateRecipeVariations = () => {
    const variations = new Set(); // Use Set to track unique combinations
    
    if (currentPlate.length === 0) {
      return [];
    }

    // For each item in the plate, get all possible substitutions
    const possibleSubstitutions = currentPlate.map(item => {
      const category = foodDatabase[item.food].category;
      return Object.keys(foodDatabase).filter(key => 
        foodDatabase[key].category === category
      );
    });

    // Helper function to generate all combinations
    const generateCombinations = (index, currentCombo) => {
      if (index === currentPlate.length) {
        // Create unique key based on foods and amounts
        const key = currentCombo
          .map((food, i) => `${food}-${currentPlate[i].amount}`)
          .sort()
          .join('|');
        variations.add(key);
        return;
      }

      // Try each possible substitution for current position
      for (const substitution of possibleSubstitutions[index]) {
        generateCombinations(index + 1, [...currentCombo, substitution]);
      }
    };

    // Start generating all possible combinations
    generateCombinations(0, []);
    
    // Convert unique variations back to array format
    return Array.from(variations).map((key, index) => {
      const items = key.split('|').map(itemStr => {
        const [food, amount] = itemStr.split('-');
        const nutrition = calculateNutrition(food, Number(amount));
        return {
          id: Date.now() + index,
          food,
          name: foodDatabase[food].name,
          amount: Number(amount),
          ...nutrition
        };
      });
      
      const totalNutrition = items.reduce((total, item) => ({
        calories: total.calories + item.calories,
        protein: total.protein + item.protein,
        carbs: total.carbs + item.carbs,
        fat: total.fat + item.fat
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return {
        id: index + 1,
        name: `Recipe Variation ${index + 1}`,
        items,
        totalNutrition
      };
    });
  };

  // Sort recipes
  const sortRecipes = (recipes) => {
    return [...recipes].sort((a, b) => {
      const aValue = a.totalNutrition[sortBy];
      const bValue = b.totalNutrition[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
  };

  // Filter foods based on search
  const filteredFoods = Object.keys(foodDatabase).filter(key =>
    foodDatabase[key].name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNutrition = calculateTotalNutrition();
  const targetMacros = calculateTargetMacros();

  // Color mapping for different protein categories
  const proteinColors = {
    'chicken_breast': 'rgba(255, 99, 132, 0.8)',    // Pink
    'salmon': 'rgba(54, 162, 235, 0.8)',            // Blue
    'beef_sirloin': 'rgba(255, 159, 64, 0.8)',      // Orange
    'turkey_breast': 'rgba(75, 192, 192, 0.8)',     // Teal
    'cod': 'rgba(153, 102, 255, 0.8)',              // Purple
    'tuna': 'rgba(255, 205, 86, 0.8)',              // Yellow
    'eggs': 'rgba(255, 99, 132, 0.8)',              // Pink
    'tofu': 'rgba(201, 203, 207, 0.8)',             // Gray
    'greek_yogurt': 'rgba(54, 162, 235, 0.8)',      // Blue
    'cottage_cheese': 'rgba(255, 159, 64, 0.8)',    // Orange
    'shrimp': 'rgba(255, 20, 147, 0.8)',            // Dark Pink
    'default': 'rgba(59, 130, 246, 0.6)'            // Default blue
  };

  // Helper function to get the primary protein color for a recipe
  const getRecipeProteinColor = (recipe) => {
    // Find the first protein item in the recipe
    const proteinItem = recipe.items.find(item => 
      foodDatabase[item.food].category === 'protein'
    );
    
    if (proteinItem) {
      return proteinColors[proteinItem.food] || proteinColors.default;
    }
    
    return proteinColors.default;
  };

  // Prepare data for the graph
  const chartData = showRecipes && recipes.length > 0 ? {
    datasets: [
      {
        label: 'Recipe Variations',
        data: recipes.map(recipe => ({
          x: recipe.totalNutrition[graphXAxis],
          y: recipe.totalNutrition[graphYAxis],
          label: recipe.name,
          color: getRecipeProteinColor(recipe)
        })),
        backgroundColor: recipes.map(recipe => getRecipeProteinColor(recipe)),
        borderColor: recipes.map(recipe => getRecipeProteinColor(recipe).replace('0.8', '1')),
        borderWidth: 1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Original Recipe',
        data: [{
          x: totalNutrition[graphXAxis],
          y: totalNutrition[graphYAxis],
          label: 'Your Original Recipe'
        }],
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          generateLabels: function(chart) {
            const labels = [];
            const uniqueProteins = new Set();
            
            // Collect unique proteins from recipes
            recipes.forEach(recipe => {
              const proteinItem = recipe.items.find(item => 
                foodDatabase[item.food].category === 'protein'
              );
              if (proteinItem) {
                uniqueProteins.add(proteinItem.food);
              }
            });
            
            // Create legend labels for each protein type
            uniqueProteins.forEach(proteinKey => {
              const food = foodDatabase[proteinKey];
              if (food) {
                labels.push({
                  text: food.name,
                  fillStyle: proteinColors[proteinKey] || proteinColors.default,
                  strokeStyle: proteinColors[proteinKey] || proteinColors.default,
                  lineWidth: 0,
                  hidden: false,
                  index: labels.length
                });
              }
            });
            
            // Add original recipe legend
            labels.push({
              text: 'Your Original Recipe',
              fillStyle: 'rgba(0, 0, 0, 0.8)',
              strokeStyle: 'rgba(0, 0, 0, 1)',
              lineWidth: 0,
              hidden: false,
              index: labels.length
            });
            
            return labels;
          }
        }
      },
      title: {
        display: true,
        text: `Recipe Variations: ${graphXAxis.charAt(0).toUpperCase() + graphXAxis.slice(1)} vs ${graphYAxis.charAt(0).toUpperCase() + graphYAxis.slice(1)}`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const point = context.raw;
            const labels = [
              `Recipe: ${point.label}`,
              `${graphXAxis.charAt(0).toUpperCase() + graphXAxis.slice(1)}: ${point.x}`,
              `${graphYAxis.charAt(0).toUpperCase() + graphYAxis.slice(1)}: ${point.y}`,
              '',
              'Ingredients:'
            ];
            
            if (point.label === 'Your Original Recipe') {
              // Show original recipe ingredients from current plate
              currentPlate.forEach(item => {
                labels.push(`• ${item.amount}g ${item.name}`);
              });
            } else {
              // Show variation ingredients
              const recipe = recipes.find(r => r.name === point.label);
              if (recipe) {
                recipe.items.forEach(item => {
                  labels.push(`• ${item.amount}g ${item.name}`);
                });
              }
            }
            
            return labels;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: graphXAxis.charAt(0).toUpperCase() + graphXAxis.slice(1)
        }
      },
      y: {
        title: {
          display: true,
          text: graphYAxis.charAt(0).toUpperCase() + graphYAxis.slice(1)
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Target className="text-blue-600" />
            Nutrition & Recipe Planner
          </h1>
          <p className="text-gray-600">Plan your meals with precision macro tracking</p>
        </div>

        {/* Daily Goals */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Daily Goals</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Calories
              </label>
              <input
                type="number"
                value={dailyCalories}
                onChange={(e) => setDailyCalories(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Macro Split (%)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Protein</label>
                  <input
                    type="number"
                    value={macroSplit.protein}
                    onChange={(e) => setMacroSplit({...macroSplit, protein: parseInt(e.target.value)})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Carbs</label>
                  <input
                    type="number"
                    value={macroSplit.carbs}
                    onChange={(e) => setMacroSplit({...macroSplit, carbs: parseInt(e.target.value)})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Fat</label>
                  <input
                    type="number"
                    value={macroSplit.fat}
                    onChange={(e) => setMacroSplit({...macroSplit, fat: parseInt(e.target.value)})}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Target Macros Display */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Target Macros</h3>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-600">{dailyCalories}</div>
                <div className="text-gray-600">Calories</div>
              </div>
              <div>
                <div className="font-medium text-red-600">{targetMacros.protein}g</div>
                <div className="text-gray-600">Protein</div>
              </div>
              <div>
                <div className="font-medium text-green-600">{targetMacros.carbs}g</div>
                <div className="text-gray-600">Carbs</div>
              </div>
              <div>
                <div className="font-medium text-yellow-600">{targetMacros.fat}g</div>
                <div className="text-gray-600">Fat</div>
              </div>
            </div>
          </div>
        </div>

        {/* Food Search & Add */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Food to Plate</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Food
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for food..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Food suggestions */}
              {searchTerm && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredFoods.slice(0, 10).map(foodKey => (
                    <button
                      key={foodKey}
                      onClick={() => {
                        setSelectedFood(foodKey);
                        setSearchTerm(foodDatabase[foodKey].name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium">{foodDatabase[foodKey].name}</div>
                      <div className="text-sm text-gray-500">
                        {foodDatabase[foodKey].calories} cal/100g
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (g)
              </label>
              <input
                type="number"
                value={selectedAmount}
                onChange={(e) => setSelectedAmount(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={addToPlate}
                disabled={!selectedFood}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add to Plate
              </button>
            </div>
          </div>
          
          {/* Preview nutrition if food selected */}
          {selectedFood && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-gray-800 mb-2">
                {selectedAmount}g {foodDatabase[selectedFood].name}
              </h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-blue-600">
                    {calculateNutrition(selectedFood, selectedAmount).calories}
                  </div>
                  <div className="text-gray-600">Calories</div>
                </div>
                <div>
                  <div className="font-medium text-red-600">
                    {calculateNutrition(selectedFood, selectedAmount).protein}g
                  </div>
                  <div className="text-gray-600">Protein</div>
                </div>
                <div>
                  <div className="font-medium text-green-600">
                    {calculateNutrition(selectedFood, selectedAmount).carbs}g
                  </div>
                  <div className="text-gray-600">Carbs</div>
                </div>
                <div>
                  <div className="font-medium text-yellow-600">
                    {calculateNutrition(selectedFood, selectedAmount).fat}g
                  </div>
                  <div className="text-gray-600">Fat</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Plate */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Current Plate</h2>
          </div>
          
          {currentPlate.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No foods added yet. Start building your plate!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentPlate.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">
                      {item.amount}g {item.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.calories} cal • {item.protein}g protein • {item.carbs}g carbs • {item.fat}g fat
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromPlate(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {/* Total Nutrition */}
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-semibold text-gray-800 mb-2">Total Nutrition</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{totalNutrition.calories}</div>
                    <div className="text-sm text-gray-600">Calories</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((totalNutrition.calories / dailyCalories) * 100)}% of target
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{totalNutrition.protein.toFixed(1)}g</div>
                    <div className="text-sm text-gray-600">Protein</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((totalNutrition.protein / targetMacros.protein) * 100)}% of target
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{totalNutrition.carbs.toFixed(1)}g</div>
                    <div className="text-sm text-gray-600">Carbs</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((totalNutrition.carbs / targetMacros.carbs) * 100)}% of target
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{totalNutrition.fat.toFixed(1)}g</div>
                    <div className="text-sm text-gray-600">Fat</div>
                    <div className="text-xs text-gray-500">
                      {Math.round((totalNutrition.fat / targetMacros.fat) * 100)}% of target
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recipe Variations */}
        {showRecipes && recipes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Recipe Variations</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="calories">Calories</option>
                    <option value="protein">Protein</option>
                    <option value="carbs">Carbs</option>
                    <option value="fat">Fat</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="asc">Low to High</option>
                    <option value="desc">High to Low</option>
                  </select>
                </div>
                <button
                  onClick={() => setShowRecipes(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {sortRecipes(recipes).map(recipe => (
                <div key={recipe.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-gray-800 mb-2">{recipe.name}</h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    {recipe.items.map((item, idx) => (
                      <div key={idx}>
                        {item.amount}g {item.name}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {recipe.totalNutrition.calories} cal
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      {recipe.totalNutrition.protein.toFixed(1)}g P
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {recipe.totalNutrition.carbs.toFixed(1)}g C
                    </span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      {recipe.totalNutrition.fat.toFixed(1)}g F
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recipe Variations Graph */}
        {showRecipes && recipes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Recipe Variations Graph</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">X-Axis:</label>
                  <select
                    value={graphXAxis}
                    onChange={(e) => setGraphXAxis(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="calories">Calories</option>
                    <option value="protein">Protein</option>
                    <option value="carbs">Carbs</option>
                    <option value="fat">Fat</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Y-Axis:</label>
                  <select
                    value={graphYAxis}
                    onChange={(e) => setGraphYAxis(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="calories">Calories</option>
                    <option value="protein">Protein</option>
                    <option value="carbs">Carbs</option>
                    <option value="fat">Fat</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="h-96">
              {chartData && (
                <Scatter data={chartData} options={chartOptions} />
              )}
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>• Each point represents a recipe variation</p>
              <p>• Hover over points to see recipe details</p>
              <p>• Use the axis selectors above to change the graph view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionApp;