// Load JSON data
const urlParams = new URLSearchParams(window.location.search);
const quizName = urlParams.get('quiz'); // Get the quiz name from the URL
const quizFile = `./quiz/${quizName}.json`; // Path to the quiz JSON

// Variables
let currentQuestionIndex = 0;
let userAnswers = [];
const scores = {}; // Keep track of scores for each result
let quizData = {}; // Store the loaded quiz data

// Fetch quiz data
fetch(quizFile)
  .then(response => {
    if (!response.ok) {
      console.error("Failed to load quiz data:", response.statusText);
      alert("Failed to load quiz data.");
      return;
    }
    return response.json();
  })
  .then(data => {
    quizData = data; // Save the quiz data globally

    // Set the title dynamically from the JSON file
    document.title = data.title || 'Quiz';

    // Initialize results scores
    for (const result in data.results) {
      scores[result] = 0;
    }

    // Render the first question
    renderQuestion();
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the current question and answers
function renderQuestion() {
  const question = quizData.questions[currentQuestionIndex];

  // Render question text and image (if available)
  const questionContainer = document.getElementById("question-container");
  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    <div>
      ${question.options
        ? question.options
            .map(
              (option, index) => `
        <label>
          <input type="radio" name="answer" value="${index}" />
          ${option.text}
        </label><br/>
      `
            )
            .join("")
        : ""}
    </div>
    ${question.type === 'slider' ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    ` : ''}
  `;

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < quizData.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === quizData.questions.length - 1 ? "inline-block" : "none";

  // Add slider value update functionality
  if (question.type === 'slider') {
    const slider = document.getElementById("slider");
    const sliderValue = document.getElementById("slider-value");
    slider.addEventListener('input', (event) => {
      sliderValue.textContent = event.target.value;
    });
  }
}

// Save the selected answer
function saveAnswer() {
  const question = quizData.questions[currentQuestionIndex];

  if (question.type === 'slider') {
    const slider = document.getElementById("slider");
    userAnswers[currentQuestionIndex] = slider.value; // Use the slider value as the answer
    return true; // Return true since the slider value is considered an answer
  }

  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected) return false; // No answer selected
  userAnswers[currentQuestionIndex] = parseInt(selected.value, 10);
  return true;
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion();
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion();
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  // Process the results based on user answers
  const results = quizData.results;

  // Reset scores for each result
  const scores = {};
  for (const result in results) {
    scores[result] = 0;
  }

  // Example of tallying scores from user answers
  userAnswers.forEach((answer, index) => {
    const question = quizData.questions[index];

    if (question.type === 'slider') {
      // If it's a slider question, the answer is directly a value (not from options)
      for (const result in results) {
        if (question.scoreImpact && question.scoreImpact[result]) {
          // For slider, check if score impact is defined and apply it
          const [minImpact, maxImpact] = question.scoreImpact[result];
          const range = question.max - question.min;
          const impact = minImpact + ((maxImpact - minImpact) * (answer - question.min)) / range;
          scores[result] += impact;
        }
      }
    } else {
      // For regular multiple-choice questions, use the options' scores
      const selectedOption = question.options[answer];
      if (selectedOption) {
        for (const result in selectedOption.scores) {
          scores[result] += selectedOption.scores[result];
        }
      }
    }
  });

  // Display the result with the highest score
  const highestScoreResult = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
  const resultContainer = document.getElementById("result-container");
  resultContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
  `;
});
