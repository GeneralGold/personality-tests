// Function to get the quiz data from the URL parameter
function getQuizData() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizName = urlParams.get("quiz");

  if (!quizName) {
    alert("No quiz specified.");
    return;
  }

  fetch(`./quiz/${quizName}.json`)
    .then(response => response.json())
    .then(data => {
      initializeQuiz(data);
    })
    .catch(error => {
      alert("Failed to load the quiz data.");
      console.error(error);
    });
}

// Global variables
let currentQuestionIndex = 0;
let userAnswers = []; // Store user's answers
let variables = {}; // Store variables (speed, power, etc.)
const scores = {}; // Initial scores for results

const questionContainer = document.getElementById("question-container");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const submitBtn = document.getElementById("submit-btn");

// Initialize the quiz
function initializeQuiz(data) {
  // Set the page title
  document.title = data.title;

  // Initialize variables and scores from the JSON
  variables = data.variables || {};
  for (const [key, value] of Object.entries(data.results)) {
    scores[key] = 0; // Initialize scores for each result (e.g., Pikachu, Charizard)
  }

  // Render the first question
  renderQuestion(data);

  // Store the quiz data globally
  window.quizData = data;
}

const nextBtn = document.getElementById("next-btn");

nextBtn.addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion();
});


// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];

  // Render question text and image (if available)
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.type === 'slider' ? renderSlider(question) : ''}
    ${question.type === 'multiple-choice' ? renderMultipleChoice(question) : ''}
    ${question.type === 'variable-boosting' ? renderVariableBoosting(question) : ''}
  `;

  // Update button visibility
  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display =
    currentQuestionIndex < data.questions.length - 1
      ? "inline-block"
      : "none";
  submitBtn.style.display =
    currentQuestionIndex === data.questions.length - 1
      ? "inline-block"
      : "none";
}

// Render multiple-choice questions
function renderMultipleChoice(question) {
  return `
    <div>
      ${question.options
        .map(
          (option, index) => `
        <label>
          <input type="radio" name="answer" value="${index}" ${
            userAnswers[currentQuestionIndex] === index ? "checked" : ""
          } />
          ${option.text}
        </label><br/>
      `
        )
        .join("")}
    </div>
  `;
}

// Render slider questions
function renderSlider(question) {
  return `
    <label for="slider">${question.description}</label><br>
    <input type="range" id="slider" name="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}">
  `;
}

// Render variable-boosting questions
function renderVariableBoosting(question) {
  return `
    <div>
      ${question.options
        .map(
          (option, index) => `
        <label>
          <input type="radio" name="boost" value="${index}" />
          ${option.text}
        </label><br/>
      `
        )
        .join("")}
    </div>
  `;
}


// Handle submit button click
submitBtn.addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before submitting.");
    return;
  }

  // Calculate the final scores
  userAnswers.forEach((answerIndex, questionIndex) => {
    const selectedOption = window.quizData.questions[questionIndex].options[answerIndex];
    for (const key in selectedOption.scores) {
      scores[key] += selectedOption.scores[key];
    }
  });

  // Apply variable impacts to results
  applyVariableImpacts();

  // Determine the result
  const maxScore = Math.max(...Object.values(scores));
  const topResults = Object.keys(scores).filter((key) => scores[key] === maxScore);
  const finalResult =
    topResults.length > 1
      ? topResults[Math.floor(Math.random() * topResults.length)]
      : topResults[0];

  // Display the result with image and description
  const resultData = window.quizData.results[finalResult];
  questionContainer.innerHTML = `
    <h2>Your result is: ${finalResult}!</h2>
    ${resultData.image ? `<img src="${resultData.image}" alt="${finalResult} Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    <p>${resultData.description}</p>
  `;
  prevBtn.style.display = "none";
  nextBtn.style.display = "none";
  submitBtn.style.display = "none";
});

// Apply variable impacts to results (based on speed, power, etc.)
function applyVariableImpacts() {
  for (const variableName in variables) {
    const variable = variables[variableName];
    const impact = variable.impact;

    // Apply the impact based on the selected answer for the variable
    if (variableName === "speed") {
      const selectedSliderValue = userAnswers[1] || 0; // Assuming speed is the 2nd question
      for (const result in impact) {
        scores[result] += impact[result] * selectedSliderValue;
      }
    }

    if (variableName === "power") {
      // Handle power impact here, similarly to speed
    }
  }
}

getQuizData();  // Call the function to load the quiz
