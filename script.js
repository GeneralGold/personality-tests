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
    renderQuestion(data);
  })
  .catch(error => {
    console.error("Error loading quiz data:", error);
    alert("Failed to load quiz data.");
  });

// Render the current question and answers
function renderQuestion(data) {
  const question = data.questions[currentQuestionIndex];

  // Render question text and image (if available)
  const questionContainer = document.getElementById("question-container");
  if (!questionContainer) {
    console.error('Error: question-container element not found.');
    return;
  }

  questionContainer.innerHTML = `
    <h2>${question.text}</h2>
    ${question.image ? `<img src="${question.image}" alt="Question Image" style="max-width: 100%; height: auto; margin: 10px 0;">` : ""}
    ${question.type === 'slider' ? `
      <input type="range" id="slider" min="${question.min}" max="${question.max}" step="${question.step}" value="${question.min}" />
      <p id="slider-value">${question.min}</p>
      <p>${question.description || ''}</p>
    ` : `
      <div>
        ${question.options
          .map(
            (option, index) => `
          <label>
            <input type="radio" name="answer" value="${index}" />
            ${option.text}
          </label><br/>
        `
          )
          .join("")}
      </div>
    `}
  `;

  // Update button visibility
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");

  prevBtn.style.display = currentQuestionIndex === 0 ? "none" : "inline-block";
  nextBtn.style.display = currentQuestionIndex < data.questions.length - 1 ? "inline-block" : "none";
  submitBtn.style.display = currentQuestionIndex === data.questions.length - 1 ? "inline-block" : "none";

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
  const selected = document.querySelector('input[name="answer"]:checked');
  if (!selected && quizData.questions[currentQuestionIndex].type !== 'slider') return false; // No answer selected for non-slider questions
  if (quizData.questions[currentQuestionIndex].type === 'slider') {
    const sliderValue = document.getElementById("slider").value;
    userAnswers[currentQuestionIndex] = sliderValue; // Save slider value
  } else {
    userAnswers[currentQuestionIndex] = parseInt(selected.value, 10); // Save selected option index
  }
  return true;
}

// Handle next button click
document.getElementById("next-btn").addEventListener("click", () => {
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }
  currentQuestionIndex++;
  renderQuestion(quizData);  // Pass quizData when rendering the next question
});

// Handle previous button click
document.getElementById("prev-btn").addEventListener("click", () => {
  currentQuestionIndex--;
  renderQuestion(quizData);  // Pass quizData when rendering the previous question
});

// Handle quiz submission
document.getElementById("submit-btn").addEventListener("click", () => {
  // Ensure all answers are saved before submitting
  if (!saveAnswer()) {
    alert("Please select an answer before proceeding.");
    return;
  }

  // Calculate the results based on user answers
  userAnswers.forEach((answer, index) => {
    const question = quizData.questions[index];
    const selectedOption = question.options ? question.options[answer] : null;

    // Process answers and update the scores
    if (selectedOption) {
      for (const result in selectedOption.scores) {
        scores[result] += selectedOption.scores[result];
      }
    }

    // For slider type questions, process the slider value impact
    if (question.type === 'slider') {
      const sliderValue = document.getElementById("slider").value;
      for (const result in question.scoreImpact) {
        const impact = question.scoreImpact[result];
        scores[result] += impact[sliderValue];
      }
    }
  });

  // Find the result with the highest score
  const highestScoreResult = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);

  // Ensure that the question-container exists before trying to modify it
  const questionContainer = document.getElementById("question-container");
  if (!questionContainer) {
    console.error('Error: question-container element not found during submit.');
    return;
  }

  // Display the result in the question-container
  questionContainer.innerHTML = `
    <h2>Your Result: ${highestScoreResult}</h2>
    <img src="${quizData.results[highestScoreResult].image}" alt="${highestScoreResult}" style="max-width: 100%; height: auto;">
    <p>${quizData.results[highestScoreResult].description}</p>
  `;

  // Hide the navigation buttons after submission
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  prevBtn.style.display = "none";
  nextBtn.style.display = "none";
  submitBtn.style.display = "none";
});
